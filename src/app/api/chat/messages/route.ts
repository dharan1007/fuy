export const dynamic = 'force-dynamic';
import { logger } from "@/lib/logger";

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
    const cursor = searchParams.get("cursor");
    const take = parseInt(searchParams.get("take") || "50");

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

    // Get messages with pagination
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

        // @ts-ignore
        sharedPost: {
          select: {
            id: true,
            content: true,
            postType: true,
            user: {
              select: {
                id: true,
                name: true,
                profile: { select: { displayName: true, avatarUrl: true } }
              }
            },
            postMedia: { take: 1, include: { media: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: take,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    });

    const nextCursor = messages.length === take ? messages[messages.length - 1].id : undefined;

    // Reverse to get chronological order (oldest to newest)
    messages.reverse();

    // Mark messages as read (only if looking at latest messages - arbitrary check, but safe to always do or limit to initial load)
    // We'll proceed with existing logic to mark as read, as fetching them implies viewing.
    // Optimization: Only mark as read if not pagineating deep history? 
    // For now, keep simple: mark as read.
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
        id: { in: messages.map(m => m.id) } // Only mark fetched messages as read
      },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ messages, nextCursor });
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

    // Allow empty content if sharing a post or sending media
    const hasContent = content && content.trim().length > 0;
    const isSpecialType = body.type !== 'text' || body.sharedPostId || body.mediaUrl;

    if (!conversationId || (!hasContent && !isSpecialType)) {
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
        type: body.type || 'text',
        sharedPostId: body.sharedPostId || null,
      } as any, // Cast to any to bypass likely stale Prisma client types
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

    // Supabase Realtime automatically handles 'INSERT' events on the Message table.
    // Use 'postgres_changes' on certain tables in your client to listen.

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

