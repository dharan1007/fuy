// src/app/api/ai/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    // Do your AI logic here (call DB, call OpenAI, etc.)
    // Example simple response:
    return NextResponse.json({ ok: true, received: body }, { status: 200 });
  } catch (err: any) {
    console.error("API /api/ai error:", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}

// optional: also export GET if you want to support GET requests
export async function GET(req: Request) {
  return NextResponse.json({ ok: true, msg: "AI endpoint (GET) alive" });
}
