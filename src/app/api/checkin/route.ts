// src/app/api/checkin/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs"; // Prisma works on Node runtime

type CheckinPayload = {
  mood: number;
  notes?: string;
  tags?: string[];
};

export async function GET() {
  try {
    const userId = await requireUserId();

    const since = new Date();
    since.setDate(since.getDate() - 60);

    const items = await prisma.post.findMany({
      where: { userId, feature: "CHECKIN", createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
    });

    // Explicitly type the element with the inferred type
    const parsed = items.map((p: typeof items[number]) => {
      let payload: unknown = null;
      try {
        if (typeof (p as any).content === "string") {
          payload = JSON.parse((p as any).content as string);
        } else if ((p as any).content != null) {
          // If content is already JSON-like (e.g., Prisma Json type), pass through
          payload = (p as any).content;
        }
      } catch {
        payload = null;
      }
      return { ...p, payload };
    });

    return NextResponse.json(parsed, {
      status: 200,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to load check-ins." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json()) as CheckinPayload; // { mood:number, notes?:string, tags?:string[] }

    // Very light validation (optional)
    if (typeof body?.mood !== "number") {
      return NextResponse.json(
        { error: "Invalid payload: 'mood' (number) is required." },
        { status: 400 }
      );
    }

    const content =
      typeof body === "string" ? body : JSON.stringify(body ?? {});

    const post = await prisma.post.create({
      data: { userId, feature: "CHECKIN", content, visibility: "PRIVATE" },
    });

    return NextResponse.json(post, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create check-in." },
      { status: 500 }
    );
  }
}
