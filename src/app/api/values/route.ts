import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

function toTitle(s: string) {
  return s
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  const body = await req.json().catch(() => ({}));
  const slugs: string[] = Array.isArray(body?.values)
    ? body.values.map((v: any) => String(v))
    : [];

  if (slugs.length === 0) {
    return NextResponse.json({ ok: true, updated: 0 });
  }

  // 1) Ensure Value rows exist for all slugs
  const existing = await prisma.value.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });
  const existingMap = new Map(existing.map((v) => [v.slug, v.id]));
  const missing = slugs.filter((s) => !existingMap.has(s));

  if (missing.length) {
    await prisma.value.createMany({
      data: missing.map((slug) => ({ slug, label: toTitle(slug) }))
    });
  }

  // Re-read to get ids for all
  const allValues = await prisma.value.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });
  const idBySlug = new Map(allValues.map((v) => [v.slug, v.id]));

  // 2) Upsert ranks
  const ops = slugs.map((slug, idx) => {
    const valueId = idBySlug.get(slug);
    if (!valueId) throw new Error(`Value id not found for slug: ${slug}`);

    return prisma.userValue.upsert({
      where: { userId_valueId: { userId, valueId } },
      update: { rank: idx + 1 },
      create: { userId, valueId, rank: idx + 1 },
    });
  });

  await prisma.$transaction(ops);

  return NextResponse.json({ ok: true, updated: slugs.length });
}

export async function GET() {
  const userId = await requireUserId();

  const rows = await prisma.userValue.findMany({
    where: { userId },
    include: { value: true },
    orderBy: { rank: "asc" },
  });

  return NextResponse.json({
    values: rows.map((r) => ({
      slug: r.value.slug,
      label: r.value.label,
      rank: r.rank,
    })),
  });
}
