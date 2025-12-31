export const dynamic = 'force-dynamic';
// src/app/api/joypins/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  const pins = await prisma.post.findMany({
    where: { userId, feature: "JOY" },
    include: { media: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(pins);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  const { content, mediaUrls = [] as string[] } = await req.json();

  const post = await prisma.post.create({
    data: {
      userId,
      feature: "JOY",
      content,
      media: {
        create: mediaUrls.map((url: string) => ({
          userId,
          feature: "JOY",
          type: "IMAGE",
          url,
        })),
      },
    },
    include: { media: true },
  });

  return NextResponse.json(post, { status: 201 });
}

