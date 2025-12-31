export const dynamic = 'force-dynamic';
// src/app/api/diagnostics/fix-counts/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();

    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    let fixed = 0;

    // Recalculate counts for each user
    for (const user of users) {
      // Count accepted friendships where this user is the follower (userId is the one following)
      const followingCount = await prisma.friendship.count({
        where: {
          userId: user.id,
          status: "ACCEPTED",
        },
      });

      // Count accepted friendships where this user is the followee (friendId is the follower)
      const followersCount = await prisma.friendship.count({
        where: {
          friendId: user.id,
          status: "ACCEPTED",
        },
      });

      // Update the user with correct counts
      await prisma.user.update({
        where: { id: user.id },
        data: {
          followingCount,
          followersCount,
        },
      });

      fixed++;
    }

    return NextResponse.json({
      success: true,
      message: `Fixed counts for ${fixed} users`,
      count: fixed,
    });
  } catch (error: any) {
    console.error("Error fixing counts:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fix counts" },
      { status: 500 }
    );
  }
}

