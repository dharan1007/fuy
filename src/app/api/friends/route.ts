export const dynamic = 'force-dynamic';
// src/app/api/friends/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "../../../lib/session";

export const runtime = "nodejs"; // Prisma works on the Node.js runtime

export async function GET() {
  try {
    const userId = await requireUserId().catch(() => null);

    if (!userId) {
      return NextResponse.json(
        { friends: [] },
        {
          status: 200,
          headers: { "Cache-Control": "no-store, max-age=0" },
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

    // Explicitly type r using the inferred element type of rows
    const list = rows.map((r: typeof rows[number]) => {
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
          // Keep nullable shape for UI
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
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to load friends." },
      { status: 500 }
    );
  }
}

