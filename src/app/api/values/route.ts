// src/app/api/values/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
export const dynamic = "force-dynamic";

export const runtime = "nodejs";

function toTitle(s: string) {
  return s
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());
}

export async function POST(req: Request) {
  const userId = await requireUserId();

  const body = await req.json().catch(() => ({} as unknown));
  const slugs: string[] = Array.isArray((body as any)?.values)
    ? (body as any).values.map((v: unknown) => String(v))
    : [];

  if (slugs.length === 0) {
    return NextResponse.json({ ok: true, updated: 0 }, { status: 200 });
  }

  // 1) Ensure Value rows exist for all slugs
  const existing = await prisma.value.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });

  // Type the mapper so 'v' isn't any
  const existingMap = new Map(
    existing.map((v: (typeof existing)[number]) => [v.slug, v.id] as const)
  );

  const missing = slugs.filter((s: string) => !existingMap.has(s));

  if (missing.length) {
    await prisma.value.createMany({
      data: missing.map((slug: string) => ({ slug, label: toTitle(slug) })),
    });
  }

  // Re-read to get ids for all
  const allValues = await prisma.value.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });

  const idBySlug = new Map(
    allValues.map((v: (typeof allValues)[number]) => [v.slug, v.id] as const)
  );

  // 2) Upsert ranks in a single transaction
  const ops = slugs.map((slug: string, idx: number) => {
    const valueId = idBySlug.get(slug);
    if (!valueId) throw new Error(`Value id not found for slug: ${slug}`);

    return prisma.userValue.upsert({
      where: { userId_valueId: { userId, valueId } },
      update: { rank: idx + 1 },
      create: { userId, valueId, rank: idx + 1 },
    });
  });

  await prisma.$transaction(ops);

  return NextResponse.json({ ok: true, updated: slugs.length }, { status: 200 });
}

export async function GET() {
  const userId = await requireUserId();

  const rows = await prisma.userValue.findMany({
    where: { userId },
    include: { value: true },
    orderBy: { rank: "asc" },
  });

  type Row = (typeof rows)[number];

  return NextResponse.json(
    {
      values: rows.map((r: Row) => ({
        slug: r.value.slug,
        label: r.value.label,
        rank: r.rank,
      })),
    },
    { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
