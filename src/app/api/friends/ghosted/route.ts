// src/app/api/friends/ghosted/route.ts
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

// Get ghosted friend requests (requests the current user sent but were ghosted by recipient)
export async function GET(req: Request) {
  try {
    const userId = await requireUserId();

    // Get all ghosted requests sent by the current user
    const ghostedRequests = await prisma.friendship.findMany({
      where: {
        userId, // Requests sent by current user
        isGhosted: true,
        ghostedBy: { not: null },
      },
      include: {
        friend: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: {
              select: {
                avatarUrl: true,
                bio: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ ghostedRequests });
  } catch (error: any) {
    logger.error("Get ghosted requests error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch ghosted requests" },
      { status: 500 }
    );
  }
}

// Un-ghost a request (remove from ghosted list)
export async function PUT(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { friendshipId } = body;

    if (!friendshipId) {
      return NextResponse.json(
        { error: "Friendship ID is required" },
        { status: 400 }
      );
    }

    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      return NextResponse.json(
        { error: "Friendship not found" },
        { status: 404 }
      );
    }

    // Verify the current user sent this request
    if (friendship.userId !== userId) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    // Verify it's ghosted
    if (!friendship.isGhosted) {
      return NextResponse.json(
        { error: "Request is not ghosted" },
        { status: 400 }
      );
    }

    // Remove ghosted status
    const updated = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { isGhosted: false, ghostedBy: null },
    });

    return NextResponse.json({ friendship: updated, message: "Ghosted status removed" });
  } catch (error: any) {
    logger.error("Un-ghost request error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to update ghosted request" },
      { status: 500 }
    );
  }
}
