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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    if (!type || !["followers", "following"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be 'followers' or 'following'" },
        { status: 400 }
      );
    }

    let users = [];
    let total = 0;

    if (type === "following") {
      // Get users that the current user is following (where status is ACCEPTED)
      const friendships = await prisma.friendship.findMany({
        where: {
          userId,
          status: "ACCEPTED",
          friend: search ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { profile: { displayName: { contains: search, mode: "insensitive" } } },
            ],
          } : undefined,
        },
        include: {
          friend: {
            select: {
              id: true,
              name: true,
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
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      });

      // Get total count
      total = await prisma.friendship.count({
        where: {
          userId,
          status: "ACCEPTED",
          friend: search ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { profile: { displayName: { contains: search, mode: "insensitive" } } },
            ],
          } : undefined,
        },
      });

      users = friendships.map((f) => f.friend);
    } else {
      // Get followers (users following current user)
      const friendships = await prisma.friendship.findMany({
        where: {
          friendId: userId,
          status: "ACCEPTED",
          user: search ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { profile: { displayName: { contains: search, mode: "insensitive" } } },
            ],
          } : undefined,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
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
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      });

      // Get total count
      total = await prisma.friendship.count({
        where: {
          friendId: userId,
          status: "ACCEPTED",
          user: search ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { profile: { displayName: { contains: search, mode: "insensitive" } } },
            ],
          } : undefined,
        },
      });

      users = friendships.map((f) => f.user);
    }

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
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
