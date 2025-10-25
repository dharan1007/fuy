// src/app/api/posts/[id]/like/route.ts
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
  const like = Boolean(body.like);

  if (like) {
    // Add like
    await prisma.postLike.upsert({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
      create: {
        userId,
        postId,
      },
      update: {},
    });
  } else {
    // Remove like
    await prisma.postLike.deleteMany({
      where: {
        userId,
        postId,
      },
    });
  }

  return NextResponse.json({ success: true, like });
}
