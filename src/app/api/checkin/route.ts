// src/app/api/checkin/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  const since = new Date();
  since.setDate(since.getDate() - 60);

  const items = await prisma.post.findMany({
    where: { userId, feature: "CHECKIN", createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  });

  const parsed = items.map((p) => {
    try {
      return { ...p, payload: JSON.parse(p.content) };
    } catch {
      return { ...p, payload: null };
    }
  });

  return NextResponse.json(parsed);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  const body = await req.json(); // { mood:number, notes?:string, tags?:string[] }
  const content = JSON.stringify(body);

  const post = await prisma.post.create({
    data: { userId, feature: "CHECKIN", content, visibility: "PRIVATE" },
  });

  return NextResponse.json(post, { status: 201 });
}
