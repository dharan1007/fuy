// src/app/api/export/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();

  const posts = await prisma.post.findMany({
    where: { userId },
    include: { media: true },
    orderBy: { createdAt: "asc" },
  });

  // group by feature for convenience
  const grouped = posts.reduce<Record<string, typeof posts>>((acc, p) => {
    (acc[p.feature] ||= []).push(p);
    return acc;
  }, {});

  return NextResponse.json({ export: grouped });
}
