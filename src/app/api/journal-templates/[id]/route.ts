import { NextResponse } from "next/server";
import { getServerSession } from '@/lib/auth';
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma"; // ✅ named import

const ensureTable = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS JournalTemplate (
      id TEXT PRIMARY KEY,
      userId TEXT,
      name TEXT NOT NULL,
      description TEXT,
      visibility TEXT NOT NULL DEFAULT 'PRIVATE',
      blocks TEXT NOT NULL,
      author TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

function esc(s: string) {
  return s.replace(/'/g, "''");
}

function getUserId(session: any): string | null {
  return session?.user?.id ?? null;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  await ensureTable();
  const id = params.id;

  try {
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT id, userId, name, description, visibility, blocks, author, createdAt
      FROM JournalTemplate
      WHERE id = '${esc(id)}'
      LIMIT 1
    `);
    const t = rows[0];
    if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (t.visibility !== "PUBLIC") {
      const session = await getServerSession(authOptions);
      const userId = getUserId(session);
      if (!userId || userId !== t.userId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    const tpl = {
      id: t.id,
      name: t.name,
      description: t.description,
      visibility: t.visibility,
      author: t.author,
      createdAt: t.createdAt,
      blocks: JSON.parse(t.blocks),
    };

    return NextResponse.json(tpl);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  await ensureTable();
  const id = params.id;
  const body = await req.json().catch(() => ({} as any));
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owner: any[] = await prisma.$queryRawUnsafe(`
    SELECT userId FROM JournalTemplate WHERE id = '${esc(id)}' LIMIT 1
  `);
  if (!owner?.[0] || owner[0].userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const patch: string[] = [];
  if (typeof body.name === "string") patch.push(`name='${esc(body.name.slice(0, 120))}'`);
  if (typeof body.description === "string" || body.description === null)
    patch.push(`description=${body.description === null ? "NULL" : `'${esc(body.description)}'`}`);
  if (body.visibility === "PUBLIC" || body.visibility === "PRIVATE")
    patch.push(`visibility='${body.visibility}'`);
  if (Array.isArray(body.blocks))
    patch.push(`blocks='${esc(JSON.stringify(body.blocks))}'`);

  if (patch.length === 0) return NextResponse.json({ ok: true });

  try {
    await prisma.$executeRawUnsafe(`
      UPDATE JournalTemplate
      SET ${patch.join(", ")}, updatedAt = CURRENT_TIMESTAMP
      WHERE id='${esc(id)}'
    `);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  await ensureTable();
  const id = params.id;
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owner: any[] = await prisma.$queryRawUnsafe(`
    SELECT userId FROM JournalTemplate WHERE id = '${esc(id)}' LIMIT 1
  `);
  if (!owner?.[0] || owner[0].userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.$executeRawUnsafe(`
      DELETE FROM JournalTemplate WHERE id='${esc(id)}'
    `);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 });
  }
}
