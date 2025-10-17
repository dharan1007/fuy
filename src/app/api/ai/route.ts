// src/app/api/ai/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    // TODO: run your AI logic here (DB call, external APIs, etc.)
    return NextResponse.json({ ok: true, received: body }, { status: 200 });
  } catch (err: any) {
    console.error("API /api/ai POST error:", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, msg: "AI endpoint is ready (GET)" });
}
