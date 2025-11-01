import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const waypoint = await prisma.routeWaypoint.findUnique({
      where: { id: params.id },
      include: {
        photos: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!waypoint) {
      return NextResponse.json(
        { error: "Waypoint not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(waypoint);
  } catch (error) {
    logger.error("Failed to fetch waypoint:", error);
    return NextResponse.json(
      { error: "Failed to fetch waypoint" },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const waypoint = await prisma.routeWaypoint.findUnique({
      where: { id: params.id },
    });

    if (!waypoint) {
      return NextResponse.json(
        { error: "Waypoint not found" },
        { status: 404 }
      );
    }

    if (waypoint.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, emoji } = body;

    const updated = await prisma.routeWaypoint.update({
      where: { id: params.id },
      data: {
        name,
        description,
        emoji,
      },
      include: {
        photos: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Failed to update waypoint:", error);
    return NextResponse.json(
      { error: "Failed to update waypoint" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const waypoint = await prisma.routeWaypoint.findUnique({
      where: { id: params.id },
    });

    if (!waypoint) {
      return NextResponse.json(
        { error: "Waypoint not found" },
        { status: 404 }
      );
    }

    if (waypoint.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.routeWaypoint.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete waypoint:", error);
    return NextResponse.json(
      { error: "Failed to delete waypoint" },
      { status: 500 }
    );
  }
}
