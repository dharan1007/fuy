// src/app/api/rankings/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

export const runtime = "nodejs";

export async function GET() {
  // Sum scores per user across categories (toy example)
  const rows = await prisma.happinessScore.groupBy({
    by: ["userId"],
    _sum: { value: true },
    orderBy: { _sum: { value: "desc" } },
    take: 50,
  });

  // Inferred type for one grouped row
  type Row = typeof rows[number];

  // Collect userIds with typed callback
  const userIds = rows.map((r: Row) => r.userId);

  // Fetch minimal user info
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      name: true,
      profile: { select: { displayName: true } },
    },
  });

  // Inferred type for one user row
  type UserRow = typeof users[number];

  // Explicitly type the Map so lookup.get(...) returns UserRow | undefined
  const lookup: Map<string, UserRow> = new Map(
    users.map((u: UserRow) => [u.id, u] as [string, UserRow])
  );

  // Compose response items (fully typed)
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
