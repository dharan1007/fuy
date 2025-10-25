// src/app/api/search/users/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  if (!q.trim()) {
    return NextResponse.json([]);
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { profile: { displayName: { contains: q, mode: "insensitive" } } },
      ],
      NOT: { id: userId },
    },
    select: {
      id: true,
      email: true,
      profile: { select: { displayName: true, avatarUrl: true } },
    },
    take: 10,
  });

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      displayName: u.profile?.displayName || u.email || "User",
      avatarUrl: u.profile?.avatarUrl,
    }))
  );
}
