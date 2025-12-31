export const dynamic = 'force-dynamic';
// src/app/api/routes/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  const routes = await prisma.post.findMany({
    where: { userId, feature: "AWE" },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(routes);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  const { content } = await req.json(); // could store GPX/GeoJSON string in content
  const post = await prisma.post.create({
    data: { userId, feature: "AWE", content },
  });
  return NextResponse.json(post, { status: 201 });
}

