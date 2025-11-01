import { logger } from "@/lib/logger";
// src/app/api/collaboration/sessions/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

// Get all collaboration sessions the user is involved in
export async function GET(req: Request) {
  try {
    const userId = await requireUserId();

    const sessions = await prisma.featureSession.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { participants: { some: { userId } } },
        ],
      },
      include: {
        creator: {
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
        participants: {
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
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ sessions });
  } catch (error: any) {
    logger.error("Get sessions error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

// Create a new collaboration session
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { type, title, description, participantIds } = body;

    if (!type || !title) {
      return NextResponse.json(
        { error: "Type and title are required" },
        { status: 400 }
      );
    }

    // Create session
    const session = await prisma.featureSession.create({
      data: {
        type,
        title,
        description,
        creatorId: userId,
        participants: {
          create: [
            { userId }, // Add creator as participant
            ...(participantIds || []).map((id: string) => ({ userId: id })),
          ],
        },
      },
      include: {
        creator: {
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
        participants: {
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
          },
        },
      },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error: any) {
    logger.error("Create session error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
