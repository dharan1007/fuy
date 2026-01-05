// src/app/api/notifications/route.ts
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const dynamic = 'force-dynamic';

// Get all notifications for current user
export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    // Fetch user settings to filter notifications
    const userSettings = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationSettings: true }
    });

    const settings = (userSettings?.notificationSettings as any) || {
      likes: true,
      comments: true,
      mentions: true,
      follows: true,
      system: true
    };

    const allowedTypes = [];
    if (settings.likes) allowedTypes.push('POST_LIKE', 'COMMENT_LIKE', 'REACTION');
    if (settings.comments) allowedTypes.push('POST_COMMENT', 'COMMENT_REPLY');
    if (settings.mentions) allowedTypes.push('POST_MENTION', 'COMMENT_MENTION');
    if (settings.follows) allowedTypes.push('FRIEND_REQUEST', 'FRIEND_ACCEPT', 'FOLLOW');
    if (settings.system) allowedTypes.push('SYSTEM_ALERT', 'WELCOME', 'WARNING');

    // Always include types not explicitly categorized if needed, or strictly filter?
    // User asked to toggle features off, so likely strict filter for known types.

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        type: { in: allowedTypes },
        ...(unreadOnly ? { read: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200, // Show more history
    });

    // Fetch sender info for friend request notifications
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notif) => {
        if (
          (notif.type === "FRIEND_REQUEST" || notif.type === "FRIEND_ACCEPT") &&
          notif.postId
        ) {
          const sender = await prisma.user.findUnique({
            where: { id: notif.postId },
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
          });

          // Find the friendship record for this request
          const friendship = await prisma.friendship.findFirst({
            where: {
              OR: [
                { userId: notif.postId, friendId: userId },
                { userId: userId, friendId: notif.postId },
              ],
            },
          });

          // Check if current user follows the sender (for "Follow Back" logic)
          const isFollowing = await prisma.subscription.findUnique({
            where: {
              subscriberId_subscribedToId: {
                subscriberId: userId,
                subscribedToId: notif.postId,
              },
            },
          });

          return {
            ...notif,
            sender,
            friendshipId: friendship?.id,
            friendshipStatus: friendship?.status,
            isGhosted: friendship?.isGhosted,
            isFollowing: !!isFollowing,
          };
        }

        // For post-related notifications, fetch post info
        if (notif.postId && notif.type !== "FRIEND_REQUEST" && notif.type !== "FRIEND_ACCEPT") {
          const post = await prisma.post.findUnique({
            where: { id: notif.postId },
            select: {
              id: true,
              content: true,
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
            },
          });

          return {
            ...notif,
            post,
          };
        }

        return notif;
      })
    );

    return NextResponse.json({ notifications: enrichedNotifications });
  } catch (error: any) {
    // special handling for auth errors to avoid log spam
    if (error?.message === "UNAUTHENTICATED" || error?.message === "USER_NOT_FOUND") {
      // logger.warn("Get notifications: User not found or unauthenticated");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    logger.error("Get notifications error:", error);
    return NextResponse.json(
      { error: "Failed to get notifications" },
      { status: 500 }
    );
  }
}

// Mark notification as read
export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });

      return NextResponse.json({ message: "All notifications marked as read" });
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    return NextResponse.json({ notification: updated });
  } catch (error: any) {
    logger.error("Mark notification read error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}

// Delete notification
export async function DELETE(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const notificationId = searchParams.get("id");

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return NextResponse.json({ message: "Notification deleted" });
  } catch (error: any) {
    logger.error("Delete notification error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}
