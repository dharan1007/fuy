// src/app/api/rankings/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

export async function GET() {
  // Sum scores per user across categories (toy example)
  const rows = await prisma.happinessScore.groupBy({
    by: ["userId"],
    _sum: { value: true },
    orderBy: { _sum: { value: "desc" } },
    take: 50,
  });

  const users = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.userId) } },
    select: { id: true, name: true, profile: { select: { displayName: true } } },
  });
  const lookup = new Map(users.map((u) => [u.id, u]));

  const items = rows.map((r) => {
    const u = lookup.get(r.userId);
    return {
      userId: r.userId,
      name: u?.profile?.displayName ?? u?.name ?? "Anonymous",
      score: r._sum.value ?? 0,
      category: "Overall",
    };
  });

  return NextResponse.json(items);
}
