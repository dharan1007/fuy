export const dynamic = 'force-dynamic';
// src/app/api/share/post/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  const body = await req.json();
  const postId = String(body.postId || "");
  const toUserId = body.toUserId ? String(body.toUserId) : null;
  const toGroupId = body.toGroupId ? String(body.toGroupId) : null;
  const message = body.message ? String(body.message) : null;

  if (!postId) {
    return NextResponse.json(
      { error: "Post ID is required" },
      { status: 400 }
    );
  }

  // Create a share record
  await prisma.postShare.create({
    data: {
      userId,
      postId,
      toUserId,
      toGroupId,
      message,
    },
  });

  // Optionally create a notification for the recipient
  if (toUserId) {
    await prisma.notification.create({
      data: {
        userId: toUserId,
        type: "POST_SHARED",
        message: message || `Someone shared a post with you`,
        postId,
      },
    }).catch(() => {
      // Ignore if notification table doesn't exist
    });
  }

  return NextResponse.json({ success: true });
}

