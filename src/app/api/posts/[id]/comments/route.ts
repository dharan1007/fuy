// src/app/api/posts/[id]/comments/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await requireUserId();
  const { id: postId } = params;
  const body = await req.json();
  const content = String(body.content || "").trim();

  if (!content) {
    return NextResponse.json(
      { error: "Comment content is required" },
      { status: 400 }
    );
  }

  const comment = await prisma.postComment.create({
    data: {
      userId,
      postId,
      content,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          profile: { select: { displayName: true, avatarUrl: true } },
        },
      },
    },
  });

  return NextResponse.json(comment);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await requireUserId();
  const { id: postId } = params;

  const comments = await prisma.postComment.findMany({
    where: { postId },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          profile: { select: { displayName: true, avatarUrl: true } },
        },
      },
    },
    take: 50,
  });

  return NextResponse.json(comments);
}
