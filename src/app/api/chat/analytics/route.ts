import { logger } from "@/lib/logger";
// src/app/api/chat/analytics/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

// Get chat analytics for the current user
export async function GET(req: Request) {
  try {
    const userId = await requireUserId();

    // Get or create analytics record
    let analytics = await prisma.chatAnalytics.findUnique({
      where: { userId },
    });

    if (!analytics) {
      analytics = await prisma.chatAnalytics.create({
        data: { userId },
      });
    }

    // Get total messages sent
    const messageCount = await prisma.message.count({
      where: { senderId: userId },
    });

    // Get conversation frequency
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participantA: userId },
          { participantB: userId },
        ],
      },
      include: {
        messages: {
          where: { senderId: userId },
          select: { id: true },
        },
        userA: { select: { id: true, name: true } },
        userB: { select: { id: true, name: true } },
      },
    });

    // Calculate chat statistics
    const conversationStats = conversations.map((conv) => ({
      contactId: conv.participantA === userId ? conv.participantB : conv.participantA,
      contactName:
        (conv.participantA === userId ? conv.userB : conv.userA)?.name ||
        "Unknown",
      messageCount: conv.messages.length,
    }));

    // Find most frequent contact
    const mostFrequent = conversationStats.reduce(
      (prev, current) =>
        prev.messageCount > current.messageCount ? prev : current,
      conversationStats[0] || { contactId: null, contactName: "", messageCount: 0 }
    );

    // Get total chat time
    const sessions = await prisma.chatSessionLog.findMany({
      where: { userId },
    });

    let totalMinutes = 0;
    for (const session of sessions) {
      if (session.durationMinutes) {
        totalMinutes += session.durationMinutes;
      } else if (session.endTime) {
        const duration =
          (session.endTime.getTime() - session.startTime.getTime()) / 60000;
        totalMinutes += Math.floor(duration);
      }
    }

    return NextResponse.json({
      analytics: {
        ...analytics,
        totalMessagesCount: messageCount,
        totalChatTimeMinutes: totalMinutes,
        mostFrequentContactId: mostFrequent.contactId,
        conversationStats,
      },
    });
  } catch (error: any) {
    logger.error("Get analytics error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

// Update analytics
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    // End any open sessions
    const openSessions = await prisma.chatSessionLog.findMany({
      where: {
        conversationId,
        userId,
        endTime: null,
      },
    });

    const now = new Date();
    for (const session of openSessions) {
      const duration = Math.floor(
        (now.getTime() - session.startTime.getTime()) / 60000
      );
      await prisma.chatSessionLog.update({
        where: { id: session.id },
        data: {
          endTime: now,
          durationMinutes: duration,
        },
      });
    }

    return NextResponse.json({ message: "Session ended" });
  } catch (error: any) {
    logger.error("End session error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to end session" },
      { status: 500 }
    );
  }
}
