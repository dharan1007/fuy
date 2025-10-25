// src/app/api/posts/[id]/share/route.ts
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

  // Log the share action
  await prisma.postShare.create({
    data: {
      userId,
      postId,
    },
  });

  return NextResponse.json({ success: true });
}
