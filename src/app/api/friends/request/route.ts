import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { targetUserId } = await req.json();

    if (!targetUserId || targetUserId === session.user.id) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    // Check existing friendship
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: session.user.id, friendId: targetUserId },
          { userId: targetUserId, friendId: session.user.id },
        ],
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Friendship already exists or pending" }, { status: 400 });
    }

    // Create friendship request
    // We always create it as "PENDING"
    // The direction is userId -> friendId
    await prisma.friendship.create({
      data: {
        userId: session.user.id,
        friendId: targetUserId,
        status: "PENDING",
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: "FRIEND_REQUEST",
        message: `${session.user.name || "Someone"} sent you a friend request.`,
        postId: session.user.id, // Using postId to store the requester ID for navigation
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending friend request:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
