// src/app/api/search/users/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';
import { requireUserId } from "@/lib/session";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    if (!search || search.trim().length === 0) {
      return NextResponse.json({ users: [] });
    }

    // Search all users by name or displayName, excluding current user
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            id: {
              not: userId, // Exclude current user
            },
          },
          {
            OR: [
              {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                profile: {
                  is: {
                    displayName: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              },
            ],
          },
        ],
      },
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
      take: 50, // Limit to 50 results for performance
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    logger.error("Search users error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
