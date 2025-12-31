export const dynamic = 'force-dynamic';
// src/app/api/stats/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "../../../lib/session";

type DayItem = { day: string; journal: number; joy: number; awe: number; bonds: number };

/* ------------------------- GET: keep your existing behavior ------------------------- */
export async function GET() {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ last7: [] as DayItem[] });

  const now = new Date();
  const days = [...Array(7)].map((_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    const label = d.toLocaleDateString(undefined, { weekday: "short" });
    const key = d.toISOString().slice(0, 10);
    return { key, label };
  });

  const since = new Date();
  since.setDate(now.getDate() - 7);

  const posts = await prisma.post.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { createdAt: true, feature: true },
  });

  const byDay: Record<string, DayItem> = {};
  for (const { key, label } of days) {
    byDay[key] = { day: label, journal: 0, joy: 0, awe: 0, bonds: 0 };
  }

  for (const p of posts) {
    const key = p.createdAt.toISOString().slice(0, 10);
    const row = byDay[key];
    if (!row) continue;
    switch (p.feature) {
      case "JOURNAL":
        row.journal += 1;
        break;
      case "JOY":
        row.joy += 1;
        break;
      case "AWE":
        row.awe += 1;
        break;
      case "BONDS":
        row.bonds += 1;
        break;
      default:
        break;
    }
  }

  return NextResponse.json({ last7: days.map(({ key }) => byDay[key]) });
}

/* ------------------------- POST: generic metrics ingest ------------------------- */
/**
 * Accepts JSON:
 * {
 *   "type": "stress_avg_intensity",   // required string
 *   "value": 5.4,                     // required number
 *   "category": "CALM"                // optional string
 * }
 * Saves into Prisma `Metric` table. Attaches userId if available.
 */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId().catch(() => null);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const { type, value, category } = body as {
      type?: unknown;
      value?: unknown;
      category?: unknown;
    };

    if (typeof type !== "string" || !type.trim()) {
      return NextResponse.json({ ok: false, error: "Field 'type' is required (string)" }, { status: 400 });
    }
    if (typeof value !== "number" || Number.isNaN(value)) {
      return NextResponse.json({ ok: false, error: "Field 'value' is required (number)" }, { status: 400 });
    }
    const cat = typeof category === "string" ? category : undefined;

    await prisma.metric.create({
      data: {
        userId: userId ?? undefined,
        type: type.trim(),
        category: cat,
        value,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unable to save metric" },
      { status: 500 }
    );
  }
}

