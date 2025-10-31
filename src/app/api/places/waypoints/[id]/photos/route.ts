import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get friend IDs
    const friendships = await prisma.friendship.findMany({
      where: {
        AND: {
          OR: [
            { userId: user.id, status: "ACCEPTED" },
            { friendId: user.id, status: "ACCEPTED" },
          ],
        },
      },
    });

    const friendIds = friendships.map((f) =>
      f.userId === user.id ? f.friendId : f.userId
    );

    // Get photos visible to the current user
    const photos = await prisma.waypointPhoto.findMany({
      where: {
        waypointId: params.id,
        OR: [
          { userId: user.id },
          { visibility: "PUBLIC" },
          {
            AND: [
              { visibility: "FRIENDS" },
              { userId: { in: friendIds } },
            ],
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile: { select: { avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(photos);
  } catch (error) {
    console.error("Failed to fetch waypoint photos:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { url, caption, visibility } = body;

    if (!url) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify the waypoint exists
    const waypoint = await prisma.routeWaypoint.findUnique({
      where: { id: params.id },
    });

    if (!waypoint) {
      return NextResponse.json(
        { error: "Waypoint not found" },
        { status: 404 }
      );
    }

    // Only the waypoint owner can add photos
    if (waypoint.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const photo = await prisma.waypointPhoto.create({
      data: {
        waypointId: params.id,
        userId: user.id,
        url,
        caption,
        visibility: visibility || "PRIVATE",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    console.error("Failed to create waypoint photo:", error);
    return NextResponse.json(
      { error: "Failed to create photo" },
      { status: 500 }
    );
  }
}
