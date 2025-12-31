export const dynamic = 'force-dynamic';
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

/**
 * POST - Create a collaboration update (track canvas operations)
 * Tracks operations like: ADD_BLOCK | UPDATE_BLOCK | REMOVE_BLOCK | DRAW | SAVE
 */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { sessionId, operation, blockId, data } = body;

    if (!sessionId || !operation || !data) {
      return NextResponse.json(
        { error: "Session ID, operation, and data are required" },
        { status: 400 }
      );
    }

    // Verify session exists and user is a participant
    const session = await prisma.featureSession.findUnique({
      where: { id: sessionId },
      include: {
        participants: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const isParticipant = session.participants.some(
      (p) => p.userId === userId && p.status === "ACTIVE"
    );

    if (!isParticipant && session.creatorId !== userId) {
      return NextResponse.json(
        { error: "Not authorized to update this session" },
        { status: 403 }
      );
    }

    // Create collaboration update
    const update = await prisma.collaborationUpdate.create({
      data: {
        sessionId,
        userId,
        operation,
        blockId,
        data: JSON.stringify(data),
        synced: false,
      },
    });

    return NextResponse.json({ update }, { status: 201 });
  } catch (error: any) {
    logger.error("Create collaboration update error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to create collaboration update" },
      { status: 500 }
    );
  }
}

/**
 * GET - Fetch collaboration updates for a session
 * Query params:
 * - sessionId: string (required)
 * - since?: timestamp (optional - only updates after this time)
 * - limit?: number (default: 100)
 */
export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const since = searchParams.get("since");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Verify user is a participant
    const session = await prisma.featureSession.findUnique({
      where: { id: sessionId },
      include: {
        participants: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const isParticipant = session.participants.some(
      (p) => p.userId === userId && p.status === "ACTIVE"
    );

    if (!isParticipant && session.creatorId !== userId) {
      return NextResponse.json(
        { error: "Not authorized to view this session" },
        { status: 403 }
      );
    }

    // Fetch updates
    const whereClause: any = { sessionId };
    if (since) {
      whereClause.createdAt = {
        gt: new Date(since),
      };
    }

    const updates = await prisma.collaborationUpdate.findMany({
      where: whereClause,
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
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    // Parse data field back to objects
    const parsedUpdates = updates.map((u) => ({
      ...u,
      data: JSON.parse(u.data),
    }));

    return NextResponse.json({ updates: parsedUpdates }, { status: 200 });
  } catch (error: any) {
    logger.error("Fetch collaboration updates error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch collaboration updates" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Mark updates as synced
 */
export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { updateIds } = body;

    if (!updateIds || !Array.isArray(updateIds) || updateIds.length === 0) {
      return NextResponse.json(
        { error: "Update IDs array is required" },
        { status: 400 }
      );
    }

    const updated = await prisma.collaborationUpdate.updateMany({
      where: {
        id: { in: updateIds },
      },
      data: {
        synced: true,
      },
    });

    return NextResponse.json({ updated: updated.count }, { status: 200 });
  } catch (error: any) {
    logger.error("Mark collaboration updates as synced error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to mark updates as synced" },
      { status: 500 }
    );
  }
}

