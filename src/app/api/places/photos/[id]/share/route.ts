import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const photo = await prisma.placePhoto.findUnique({
      where: { id: params.id },
    });

    if (!photo) {
      return NextResponse.json(
        { error: "Photo not found" },
        { status: 404 }
      );
    }

    if (photo.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { userIds } = body; // Array of friend user IDs to share with

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid user IDs" },
        { status: 400 }
      );
    }

    // Verify all users are friends with the photo owner
    const friendships = await prisma.friendship.findMany({
      where: {
        AND: {
          OR: [
            {
              userId: user.id,
              friendId: { in: userIds },
              status: "ACCEPTED",
            },
            {
              friendId: user.id,
              userId: { in: userIds },
              status: "ACCEPTED",
            },
          ],
        },
      },
    });

    const friendIdSet = new Set<string>();
    friendships.forEach((f) => {
      if (f.userId === user.id) friendIdSet.add(f.friendId);
      if (f.friendId === user.id) friendIdSet.add(f.userId);
    });

    // Only share with actual friends
    const validUserIds = userIds.filter((id: string) =>
      friendIdSet.has(id)
    );

    if (validUserIds.length === 0) {
      return NextResponse.json(
        { error: "No valid friends to share with" },
        { status: 400 }
      );
    }

    // Create share records
    const shares = await Promise.all(
      validUserIds.map((userId: string) =>
        prisma.placePhotoShare.upsert({
          where: {
            photoId_userId: {
              photoId: params.id,
              userId,
            },
          },
          update: {},
          create: {
            photoId: params.id,
            userId,
          },
        })
      )
    );

    return NextResponse.json({ success: true, shares });
  } catch (error) {
    console.error("Failed to share photo:", error);
    return NextResponse.json(
      { error: "Failed to share photo" },
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

    const photo = await prisma.placePhoto.findUnique({
      where: { id: params.id },
    });

    if (!photo) {
      return NextResponse.json(
        { error: "Photo not found" },
        { status: 404 }
      );
    }

    if (photo.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { userId } = body; // User ID to unshare from

    await prisma.placePhotoShare.delete({
      where: {
        photoId_userId: {
          photoId: params.id,
          userId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to unshare photo:", error);
    return NextResponse.json(
      { error: "Failed to unshare photo" },
      { status: 500 }
    );
  }
}
