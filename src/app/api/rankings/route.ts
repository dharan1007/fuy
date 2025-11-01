// src/app/api/rankings/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  const rows = await prisma.happinessScore.groupBy({
    by: ["userId"],
    _sum: { value: true },
    orderBy: { _sum: { value: "desc" } },
    take: 50,
  });

  type Row = (typeof rows)[number];
  const userIds = rows.map((r: Row) => r.userId);

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      name: true,
      profile: { select: { displayName: true } },
    },
  });

  type UserRow = (typeof users)[number];
  const lookup: Map<string, UserRow> = new Map(
    users.map((u: UserRow) => [u.id, u] as [string, UserRow])
  );

  const items = rows.map((r: Row) => {
    const u = lookup.get(r.userId);
    return {
      userId: r.userId,
      name: u?.profile?.displayName ?? u?.name ?? "Anonymous",
      score: r._sum.value ?? 0,
      category: "Overall",
    };
  });

  return NextResponse.json(items, {
    status: 200,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
