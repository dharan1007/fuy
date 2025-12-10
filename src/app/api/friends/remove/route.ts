// src/app/api/friends/remove/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "../../../../lib/session";

export const runtime = "nodejs";

export async function DELETE(req: Request) {
  try {
    const userId = await requireUserId();
    const { friendshipId } = await req.json();

    if (!friendshipId) {
      return NextResponse.json(
        { error: "friendshipId is required" },
        { status: 400 }
      );
    }

    // Verify the friendship exists and user is involved
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      return NextResponse.json(
        { error: "Friendship not found" },
        { status: 404 }
      );
    }

    // Verify user is part of this friendship
    if (friendship.userId !== userId && friendship.friendId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Delete the friendship
    await prisma.friendship.delete({
      where: { id: friendshipId },
    });

    // Update follower/following counts
    if (friendship.status === "ACCEPTED") {
      await prisma.user.update({
        where: { id: friendship.userId },
        data: { followingCount: { decrement: 1 } },
      });

      await prisma.user.update({
        where: { id: friendship.friendId },
        data: { followersCount: { decrement: 1 } },
      });
    }

    return NextResponse.json(
      { success: true },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  } catch (error) {
    console.error("Error removing friend:", error);
    return NextResponse.json(
      { error: "Failed to remove friend" },
      { status: 500 }
    );
  }
}
