// src/app/api/journal/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  const posts = await prisma.post.findMany({
    where: { userId, feature: "JOURNAL" },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  const { content, visibility = "PRIVATE" } = await req.json();

  const post = await prisma.post.create({
    data: { userId, feature: "JOURNAL", content, visibility },
  });

  return NextResponse.json(post, { status: 201 });
}
