// src/app/api/followers/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireUserId } from "../../../lib/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId().catch(() => null);

    if (!userId) {
      return NextResponse.json(
        { followers: [] },
        {
          status: 200,
          headers: { "Cache-Control": "no-store, max-age=0" },
        }
      );
    }

    // Get followers - users who have accepted friendship requests from them
    const followers = await prisma.friendship.findMany({
      where: {
        friendId: userId,
        status: "ACCEPTED",
      },
      include: {
        user: { include: { profile: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const list = followers.map((f) => ({
      id: f.id,
      friendshipId: f.id,
      user: {
        id: f.user.id,
        name: f.user.name,
        profile: f.user.profile
          ? {
              displayName: f.user.profile.displayName ?? null,
              avatarUrl: f.user.profile.avatarUrl ?? null,
            }
          : null,
      },
      createdAt:
        typeof f.createdAt === "string" ? f.createdAt : f.createdAt.toISOString(),
    }));

    return NextResponse.json(
      { followers: list },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  } catch (error) {
    console.error("Error fetching followers:", error);
    return NextResponse.json(
      { error: "Failed to load followers." },
      { status: 500 }
    );
  }
}
