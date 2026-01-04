// src/app/api/export/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  const userId = await requireUserId();

  const posts = await prisma.post.findMany({
    where: { userId },
    include: { postMedia: { include: { media: true } } },
    orderBy: { createdAt: "asc" },
  });

  const formattedPosts = posts.map((p: any) => ({
    ...p,
    media: p.postMedia?.map((pm: any) => pm.media) || []
  }));

  type Post = (typeof formattedPosts)[number];

  const grouped = formattedPosts.reduce<Record<string, Post[]>>(
    (acc: Record<string, Post[]>, p: Post) => {
      (acc[p.feature] ??= []).push(p);
      return acc;
    },
    {} as Record<string, Post[]>
  );

  return NextResponse.json(
    { export: grouped },
    { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
