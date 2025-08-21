// src/app/api/export/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const userId = await requireUserId();

  const posts = await prisma.post.findMany({
    where: { userId },
    include: { media: true },
    orderBy: { createdAt: "asc" },
  });

  // Element type inferred from the query result
  type Post = typeof posts[number];

  // Group by feature with fully typed accumulator and item
  const grouped = posts.reduce<Record<string, Post[]>>(
    (acc: Record<string, Post[]>, p: Post) => {
      (acc[p.feature] ??= []).push(p);
      return acc;
    },
    {} as Record<string, Post[]>
    // alternatively: {}, but TS likes the explicit cast with noImplicitAny
  );

  return NextResponse.json({ export: grouped }, {
    status: 200,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
