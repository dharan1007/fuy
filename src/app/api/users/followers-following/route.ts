// src/app/api/users/followers-following/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "followers" or "following"
    const search = searchParams.get("search") || "";

    if (!type || !["followers", "following"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be 'followers' or 'following'" },
        { status: 400 }
      );
    }

    let users = [];

    if (type === "following") {
      // Get users that the current user is following (where status is ACCEPTED)
      const friendships = await prisma.friendship.findMany({
        where: {
          userId,
          status: "ACCEPTED",
        },
        include: {
          friend: {
            select: {
              id: true,
              name: true,
              email: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                  bio: true,
                },
              },
            },
          },
        },
      });
      users = friendships.map((f) => f.friend);
    } else {
      // Get followers (users following current user)
      const friendships = await prisma.friendship.findMany({
        where: {
          friendId: userId,
          status: "ACCEPTED",
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                  bio: true,
                },
              },
            },
          },
        },
      });
      users = friendships.map((f) => f.user);
    }

    // Filter by search query if provided
    const filtered = users.filter(
      (user) =>
        user.name?.toLowerCase().includes(search.toLowerCase()) ||
        user.profile?.displayName?.toLowerCase().includes(search.toLowerCase())
    );

    return NextResponse.json({ users: filtered });
  } catch (error: any) {
    logger.error("Get followers/following error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch followers/following" },
      { status: 500 }
    );
  }
}
