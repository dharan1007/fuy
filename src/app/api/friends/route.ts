// src/app/api/friends/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireUserId } from "../../../lib/session";

export const runtime = "nodejs"; // or "edge" if your prisma setup supports it

export async function GET() {
  try {
    const userId = await requireUserId().catch(() => null);
    if (!userId) {
      return NextResponse.json(
        { friends: [] },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        }
      );
    }

    const rows = await prisma.friendship.findMany({
      where: {
        OR: [{ userId }, { friendId: userId }],
        status: "ACCEPTED",
      },
      include: {
        user: { include: { profile: true } },
        friend: { include: { profile: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Normalize to "the other person" for the caller.
    const list = rows.map((r) => {
      const other = r.userId === userId ? r.friend : r.user;
      return {
        id: r.id,
        createdAt:
          typeof r.createdAt === "string"
            ? r.createdAt
            : r.createdAt.toISOString(),
        friend: {
          id: other.id,
          name: other.name,
          // Keep nullable shape for the UI (displayName / avatarUrl optional)
          profile: other.profile
            ? {
                displayName: other.profile.displayName ?? null,
                avatarUrl: other.profile.avatarUrl ?? null,
              }
            : null,
        },
      };
    });

    return NextResponse.json(
      { friends: list },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (err) {
    // Minimal, JSON-only error (prevents big HTML error bodies)
    return NextResponse.json(
      { error: "Failed to load friends." },
      { status: 500 }
    );
  }
}
