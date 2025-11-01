// src/app/api/notifications/route.ts
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";

// Get all notifications for current user
export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { read: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
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

          return {
            ...notif,
            sender,
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
    logger.error("Get notifications error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
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
