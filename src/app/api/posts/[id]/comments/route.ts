// src/app/api/posts/[id]/comments/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { getServerSession } from "@/lib/auth"; // Correct import
import { authOptions } from "@/lib/auth";
import { moderateContent, getModerationErrorMessage } from "@/lib/content-moderation";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await requireUserId();
  const { id: postId } = params;
  const body = await req.json();
  const content = String(body.content || "").trim();
  const parentId = body.parentId || null;

  if (!content) {
    return NextResponse.json(
      { error: "Comment content is required" },
      { status: 400 }
    );
  }

  // Comprehensive Content Moderation
  const moderationResult = moderateContent(content);
  if (!moderationResult.isClean) {
    return NextResponse.json(
      { error: getModerationErrorMessage(moderationResult) },
      { status: 400 }
    );
  }

  const comment = await prisma.postComment.create({
    data: {
      userId,
      postId,
      content,
      parentId,
    } as any,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          profile: { select: { displayName: true, avatarUrl: true } },
        },
      },
      reactions: true,
    } as any,
  });

  // Get post author to send notification
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { userId: true },
  });

  // Don't notify if commenting on own post
  if (post && post.userId !== userId) {
    // Get commenter's name for notification message
    const commenter = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Create notification for post author
    await prisma.notification.create({
      data: {
        userId: post.userId,
        type: "POST_COMMENT",
        message: `${commenter?.name || "Someone"} commented on your post`,
        postId,
        read: false,
      },
    });
  }

  // Update FeedItem comment count
  await prisma.feedItem.updateMany({
    where: { postId },
    data: { commentCount: { increment: 1 } }
  });

  return NextResponse.json(comment);
}


export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;
  const { id: postId } = params;

  // We fetch only top-level comments (parentId is null)
  // Replies are fetched via relation
  const comments = await prisma.postComment.findMany({
    where: { postId, parentId: null } as any,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          profile: { select: { displayName: true, avatarUrl: true } },
        },
      },
      reactions: true,
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: { select: { displayName: true, avatarUrl: true } },
            }
          },
          reactions: true
        }
      }
    } as any,
    take: 50,
  });

  // Helper to format comment for frontend (add hasLiked, etc)
  const formatComment = (c: any) => {
    const reactionCounts = { W: 0, L: 0, CAP: 0, FIRE: 0 };
    let userReaction = null;

    c.reactions.forEach((r: any) => {
      if (reactionCounts[r.type as keyof typeof reactionCounts] !== undefined) {
        reactionCounts[r.type as keyof typeof reactionCounts]++;
      }
      if (currentUserId && r.userId === currentUserId) {
        userReaction = r.type;
      }
    });

    return {
      ...c,
      reactionCounts,
      userReaction,
      replies: c.replies ? c.replies.map(formatComment) : []
    };
  };

  const formattedComments = comments.map(formatComment);

  return NextResponse.json(formattedComments);
}
