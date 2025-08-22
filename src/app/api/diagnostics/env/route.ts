export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const raw = process.env.DATABASE_URL || "";
    const u = raw ? new URL(raw) : null;
    const safe = u
      ? {
          protocol: u.protocol,
          user: u.username,
          host: u.hostname,
          port: u.port,
          db: u.pathname,
          hasSSLRequire: u.searchParams.get("sslmode") === "require",
          hasPgBouncer: u.searchParams.get("pgbouncer") === "true",
        }
      : null;

    return NextResponse.json({ ok: true, parsed: safe }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
