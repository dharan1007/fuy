// src/app/api/following/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireUserId } from "../../../lib/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId().catch(() => null);

    if (!userId) {
      return NextResponse.json(
        { following: [] },
        {
          status: 200,
          headers: { "Cache-Control": "no-store, max-age=0" },
        }
      );
    }

    // Get following - users that this user has accepted friendship requests to
    const following = await prisma.friendship.findMany({
      where: {
        userId: userId,
        status: "ACCEPTED",
      },
      include: {
        friend: { include: { profile: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const list = following.map((f) => ({
      id: f.id,
      friendshipId: f.id,
      user: {
        id: f.friend.id,
        name: f.friend.name,
        profile: f.friend.profile
          ? {
              displayName: f.friend.profile.displayName ?? null,
              avatarUrl: f.friend.profile.avatarUrl ?? null,
            }
          : null,
      },
      createdAt:
        typeof f.createdAt === "string" ? f.createdAt : f.createdAt.toISOString(),
    }));

    return NextResponse.json(
      { following: list },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  } catch (error) {
    console.error("Error fetching following:", error);
    return NextResponse.json(
      { error: "Failed to load following." },
      { status: 500 }
    );
  }
}
