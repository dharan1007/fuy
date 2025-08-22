// src/app/api/diagnostics/env/route.ts
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
          user: u.username,          // should be: postgres.kuzwpzuulvpjdviwmptb
          host: u.hostname,          // should be: aws-1-ap-south-1.pooler.supabase.com
          port: u.port,              // should be: 5432 (session pooler) or 6543 (txn pooler)
          db: u.pathname,            // /postgres
          hasSSLRequire: u.searchParams.get("sslmode") === "require",
          hasPgBouncer: u.searchParams.get("pgbouncer") === "true",
        }
      : null;

    return NextResponse.json({ ok: true, parsed: safe }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
