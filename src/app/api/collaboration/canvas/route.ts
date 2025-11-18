import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

/**
 * GET - Fetch canvas data for a session
 */
export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
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
        { error: "Not authorized to view this session" },
        { status: 403 }
      );
    }

    // Parse canvas data
    const canvasData = session.canvasData ? JSON.parse(session.canvasData) : null;

    return NextResponse.json(
      {
        sessionId,
        canvasData,
        autoSaveEnabled: session.autoSaveEnabled,
        lastSavedAt: session.lastSavedAt,
        lastModifiedBy: session.lastModifiedBy,
        syncVersion: session.syncVersion,
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error("Fetch canvas data error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch canvas data" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Save canvas data with auto-save handling
 * Body:
 * - sessionId: string (required)
 * - canvasData: object (required) - blocks and drawing state
 * - autoSaveEnabled: boolean (optional)
 */
export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { sessionId, canvasData, autoSaveEnabled } = body;

    if (!sessionId || !canvasData) {
      return NextResponse.json(
        { error: "Session ID and canvas data are required" },
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

    // Update session with new canvas data
    const updated = await prisma.featureSession.update({
      where: { id: sessionId },
      data: {
        canvasData: JSON.stringify(canvasData),
        lastSavedAt: new Date(),
        lastModifiedBy: userId,
        syncVersion: {
          increment: 1,
        },
        ...(autoSaveEnabled !== undefined && {
          autoSaveEnabled,
        }),
      },
    });

    // Create a SAVE operation record
    await prisma.collaborationUpdate.create({
      data: {
        sessionId,
        userId,
        operation: "SAVE",
        data: JSON.stringify({
          autoSaveEnabled: updated.autoSaveEnabled,
          blockCount: Object.keys(canvasData.blocks || {}).length,
        }),
        synced: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        sessionId,
        lastSavedAt: updated.lastSavedAt,
        syncVersion: updated.syncVersion,
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error("Save canvas data error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to save canvas data" },
      { status: 500 }
    );
  }
}
