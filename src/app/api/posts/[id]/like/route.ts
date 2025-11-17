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

    // Get post author to send notification
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    // Don't notify if liking own post
    if (post && post.userId !== userId) {
      // Get liker's name for notification message
      const liker = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });

      // Create notification for post author
      await prisma.notification.create({
        data: {
          userId: post.userId,
          type: "POST_LIKE",
          message: `${liker?.name || "Someone"} liked your post`,
          postId,
          read: false,
        },
      });
    }
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
