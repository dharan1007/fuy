export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const [row] = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() AS now`;
    return NextResponse.json({ ok: true, now: row?.now?.toISOString?.() ?? null }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
