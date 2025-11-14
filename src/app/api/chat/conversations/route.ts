// src/app/api/chat/conversations/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { logger } from "@/lib/logger";

// Get all conversations for the current user with pagination
export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participantA: userId },
          { participantB: userId },
        ],
      },
      include: {
        userA: {
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
        userB: {
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
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            content: true,
            createdAt: true,
            senderId: true,
          },
        },
      },
      orderBy: { lastMessageAt: "desc" },
      skip,
      take: limit,
    });

    // Get total count for pagination metadata
    const total = await prisma.conversation.count({
      where: {
        OR: [
          { participantA: userId },
          { participantB: userId },
        ],
      },
    });

    return NextResponse.json({
      conversations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    logger.error("Get conversations error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

// Create or get a conversation with another user
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { friendId } = body;

    logger.debug("[POST /api/chat/conversations] userId and friendId received");

    if (!friendId) {
      return NextResponse.json(
        { error: "Friend ID is required" },
        { status: 400 }
      );
    }

    if (userId === friendId) {
      return NextResponse.json(
        { error: "Cannot create conversation with yourself" },
        { status: 400 }
      );
    }

    // Verify both users exist
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    const friendExists = await prisma.user.findUnique({ where: { id: friendId } });

    logger.debug("[POST /api/chat/conversations] User validation completed");

    if (!userExists || !friendExists) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if conversation already exists
    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { participantA: userId, participantB: friendId },
          { participantA: friendId, participantB: userId },
        ],
      },
      include: {
        userA: {
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
        userB: {
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

    // If not, create a new one
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participantA: userId,
          participantB: friendId,
        },
        include: {
          userA: {
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
          userB: {
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
    }

    return NextResponse.json({ conversation });
  } catch (error: any) {
    logger.error("Create conversation error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
