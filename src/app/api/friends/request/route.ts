import { logger } from "@/lib/logger";
// src/app/api/friends/request/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

// Get pending friend requests
export async function GET(req: Request) {
  try {
    const userId = await requireUserId();

    // Get both sent and received pending requests
    const requests = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId, status: "PENDING" }, // Requests I sent
          { friendId: userId, status: "PENDING" }, // Requests I received
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        friend: {
          select: {
            id: true,
            name: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ requests });
  } catch (error: any) {
    logger.error("Get friend requests error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch friend requests" },
      { status: 500 }
    );
  }
}

// List of demo user emails for auto-accept
const DEMO_USERS = [
  "jasmine@example.com",
  "alex@example.com",
  "jordan@example.com",
  "jacob@example.com",
  "carmen@example.com",
  "toriano@example.com",
  "jesse@example.com",
  "vanessa@example.com",
  "anthony@example.com",
  "ms@example.com",
];

// Send friend request
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { friendId } = body;

    if (!friendId) {
      return NextResponse.json(
        { error: "Friend ID is required" },
        { status: 400 }
      );
    }

    if (userId === friendId) {
      return NextResponse.json(
        { error: "Cannot send friend request to yourself" },
        { status: 400 }
      );
    }

    // Verify both users exist
    const [currentUser, targetUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.user.findUnique({ where: { id: friendId } }),
    ]);

    if (!currentUser || !targetUser) {
      return NextResponse.json(
        { error: "One or both users do not exist" },
        { status: 400 }
      );
    }

    // Check if friendship already exists
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === "ACCEPTED") {
        return NextResponse.json(
          { error: "Already friends" },
          { status: 400 }
        );
      }
      if (existing.status === "PENDING") {
        return NextResponse.json(
          { error: "Friend request already sent" },
          { status: 400 }
        );
      }
    }

    // Check if target user is a demo user
    const isTargetDemoUser = DEMO_USERS.includes(targetUser.email.toLowerCase());
    const status = isTargetDemoUser ? "ACCEPTED" : "PENDING";

    // Create friend request (with auto-accept if demo user)
    const friendship = await prisma.friendship.create({
      data: {
        userId,
        friendId,
        status,
      },
    });

    // Create notification for the recipient
    const notificationType = isTargetDemoUser ? "FRIEND_ACCEPTED" : "FRIEND_REQUEST";
    const message = isTargetDemoUser
      ? `accepted your friend request`
      : `sent you a friend request`;

    await prisma.notification.create({
      data: {
        userId: friendId,
        type: notificationType,
        message,
        postId: userId,
        read: false,
      },
    });

    return NextResponse.json({ friendship, autoAccepted: isTargetDemoUser });
  } catch (error: any) {
    logger.error("Send friend request error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to send friend request" },
      { status: 500 }
    );
  }
}

// Accept or reject friend request
export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { friendshipId, action } = body; // action: "ACCEPT" or "REJECT"

    if (!friendshipId || !action) {
      return NextResponse.json(
        { error: "Friendship ID and action are required" },
        { status: 400 }
      );
    }

    // Find the friendship request
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      return NextResponse.json(
        { error: "Friend request not found" },
        { status: 404 }
      );
    }

    // Verify the current user is the recipient
    if (friendship.friendId !== userId) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    if (action === "ACCEPT") {
      // Accept the request and update counts
      const updated = await prisma.friendship.update({
        where: { id: friendshipId },
        data: { status: "ACCEPTED", isGhosted: false },
      });

      // Update follower/following counts
      await prisma.user.update({
        where: { id: friendship.userId },
        data: { followingCount: { increment: 1 } },
      });

      await prisma.user.update({
        where: { id: userId },
        data: { followersCount: { increment: 1 } },
      });

      // Create notification for the sender
      await prisma.notification.create({
        data: {
          userId: friendship.userId,
          type: "FRIEND_ACCEPT",
          message: `accepted your friend request`,
          postId: userId,
          read: false,
        },
      });

      // Get updated users with new counts
      const updatedUsers = await prisma.user.findMany({
        where: { id: { in: [friendship.userId, userId] } },
        select: {
          id: true,
          followersCount: true,
          followingCount: true,
        },
      });

      return NextResponse.json({ friendship: updated, updatedUsers });
    } else if (action === "REJECT") {
      // Reject/delete the request
      await prisma.friendship.delete({
        where: { id: friendshipId },
      });

      return NextResponse.json({ message: "Friend request rejected" });
    } else if (action === "GHOST") {
      // Ghost the request - mark it as ghosted
      const updated = await prisma.friendship.update({
        where: { id: friendshipId },
        data: { isGhosted: true, ghostedBy: userId },
      });

      return NextResponse.json({ friendship: updated, message: "Request ghosted" });
    } else {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    logger.error("Handle friend request error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to handle friend request" },
      { status: 500 }
    );
  }
}

// Remove friend
export async function DELETE(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { friendshipId } = body;

    if (!friendshipId) {
      return NextResponse.json(
        { error: "Friendship ID is required" },
        { status: 400 }
      );
    }

    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      return NextResponse.json(
        { error: "Friendship not found" },
        { status: 404 }
      );
    }

    // Verify the current user is part of this friendship
    if (friendship.userId !== userId && friendship.friendId !== userId) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    await prisma.friendship.delete({
      where: { id: friendshipId },
    });

    return NextResponse.json({ message: "Friend removed successfully" });
  } catch (error: any) {
    logger.error("Remove friend error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to remove friend" },
      { status: 500 }
    );
  }
}
