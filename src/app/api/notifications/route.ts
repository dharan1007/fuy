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
      take: 200,
    });

    // --- BATCH FETCH for performance (fix N+1 query) ---
    const friendRequestNotifs = notifications.filter(
      n => (n.type === "FRIEND_REQUEST" || n.type === "FRIEND_ACCEPT") && n.postId
    );
    const postNotifs = notifications.filter(
      n => n.postId && n.type !== "FRIEND_REQUEST" && n.type !== "FRIEND_ACCEPT"
    );

    // Batch fetch senders for friend requests
    const senderIds = [...new Set(friendRequestNotifs.map(n => n.postId!))];
    const senders = senderIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, name: true, profile: { select: { displayName: true, avatarUrl: true } } }
    }) : [];
    const senderMap = new Map(senders.map(s => [s.id, s]));

    // Batch fetch friendships
    const friendships = senderIds.length > 0 ? await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: { in: senderIds }, friendId: userId },
          { userId: userId, friendId: { in: senderIds } }
        ]
      }
    }) : [];
    const friendshipMap = new Map(friendships.map(f => [
      f.userId === userId ? f.friendId : f.userId, f
    ]));

    // Batch fetch subscriptions (follow status)
    const subscriptions = senderIds.length > 0 ? await prisma.subscription.findMany({
      where: { subscriberId: userId, subscribedToId: { in: senderIds } }
    }) : [];
    const subscriptionSet = new Set(subscriptions.map(s => s.subscribedToId));

    // Batch fetch posts for post-related notifications
    const postIds = [...new Set(postNotifs.map(n => n.postId!))];
    const posts = postIds.length > 0 ? await prisma.post.findMany({
      where: { id: { in: postIds } },
      select: {
        id: true, content: true,
        user: { select: { id: true, name: true, profile: { select: { displayName: true, avatarUrl: true } } } }
      }
    }) : [];
    const postMap = new Map(posts.map(p => [p.id, p]));

    // Enrich notifications (now O(1) lookups)
    const enrichedNotifications = notifications.map(notif => {
      if ((notif.type === "FRIEND_REQUEST" || notif.type === "FRIEND_ACCEPT") && notif.postId) {
        const sender = senderMap.get(notif.postId);
        const friendship = friendshipMap.get(notif.postId);
        return {
          ...notif,
          sender,
          friendshipId: friendship?.id,
          friendshipStatus: friendship?.status,
          isGhosted: friendship?.isGhosted,
          isFollowing: subscriptionSet.has(notif.postId),
        };
      }

      if (notif.postId && notif.type !== "FRIEND_REQUEST" && notif.type !== "FRIEND_ACCEPT") {
        return { ...notif, post: postMap.get(notif.postId) };
      }

      return notif;
    });

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
