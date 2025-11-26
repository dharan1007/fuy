import { logger } from "@/lib/logger";
import { pusherServer } from "@/lib/pusher";
// src/app/api/chat/messages/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

// Get messages for a conversation
export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    // Verify user is part of this conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (
      conversation.participantA !== userId &&
      conversation.participantB !== userId
    ) {
      return NextResponse.json(
        { error: "Not authorized to view this conversation" },
        { status: 403 }
      );
    }

    // Get messages with pagination (default: last 50 messages)
    const limit = 50;
    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
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
      take: limit,
    });

    // Reverse to get chronological order
    messages.reverse();

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ messages });
  } catch (error: any) {
    logger.error("Get messages error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// Send a message
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { conversationId, content } = body;

    if (!conversationId || !content) {
      return NextResponse.json(
        { error: "Conversation ID and content are required" },
        { status: 400 }
      );
    }

    // Verify user is part of this conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (
      conversation.participantA !== userId &&
      conversation.participantB !== userId
    ) {
      return NextResponse.json(
        { error: "Not authorized to send messages in this conversation" },
        { status: 403 }
      );
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: content.trim(),
      },
      include: {
        sender: {
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

    // Update conversation last message
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: content.trim(),
        lastMessageAt: new Date(),
      },
    });

    // Log session start if not already logged
    const existingLog = await prisma.chatSessionLog.findFirst({
      where: {
        conversationId,
        userId,
        endTime: null,
      },
    });

    if (!existingLog) {
      await prisma.chatSessionLog.create({
        data: {
          conversationId,
          userId,
        },
      });
    }

    // Trigger Pusher event
    await pusherServer.trigger(
      `conversation-${conversationId}`,
      "message:new",
      {
        id: message.id,
        conversationId,
        senderId: userId,
        senderName: message.sender.name,
        senderAvatar: message.sender.profile?.avatarUrl,
        content: message.content,
        timestamp: message.createdAt.getTime(),
        read: false,
      }
    );

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    logger.error("Send message error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
