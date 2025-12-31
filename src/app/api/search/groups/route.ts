export const dynamic = 'force-dynamic';
// src/app/api/search/groups/route.ts
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

  const groups = await prisma.group.findMany({
    where: {
      name: { contains: q },
    },
    select: {
      id: true,
      name: true,
    },
    take: 10,
  });

  return NextResponse.json(groups);
}

