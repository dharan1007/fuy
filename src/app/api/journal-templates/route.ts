import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma"; // ✅ named import

type Visibility = "PUBLIC" | "PRIVATE";

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
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_JournalTemplate_user ON JournalTemplate(userId)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_JournalTemplate_visibility ON JournalTemplate(visibility)
  `);
};

// Small helper to read user id safely even if types aren’t augmented yet
function getUserId(session: any): string | null {
  return session?.user?.id ?? null;
}

function esc(s: string) {
  return s.replace(/'/g, "''");
}

function filterByQuery(row: any, q: string) {
  if (!q) return true;
  const hay = `${row.name ?? ""} ${row.description ?? ""} ${row.author ?? ""}`.toLowerCase();
  return hay.includes(q);
}

export async function GET(req: Request) {
  await ensureTable();
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") || "public"; // "public" | "mine"
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();

  const session = await getServerSession(authOptions);
  const userId = getUserId(session);

  try {
    if (scope === "mine") {
      if (!userId) return NextResponse.json({ items: [] });
      const rows: any[] = await prisma.$queryRawUnsafe(`
        SELECT id, name, description, visibility, author, createdAt
        FROM JournalTemplate
        WHERE userId = '${esc(userId)}'
        ORDER BY datetime(createdAt) DESC
      `);
      const items = rows.filter((r) => filterByQuery(r, q));
      return NextResponse.json({ items });
    } else {
      const rows: any[] = await prisma.$queryRawUnsafe(`
        SELECT id, name, description, visibility, author, createdAt
        FROM JournalTemplate
        WHERE visibility = 'PUBLIC'
        ORDER BY datetime(createdAt) DESC
      `);
      const items = rows.filter((r) => filterByQuery(r, q));
      return NextResponse.json({ items });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await ensureTable();
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  const author = session?.user?.name ?? null;

  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.name || !Array.isArray(body?.blocks)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const name = String(body.name).slice(0, 120);
  const description = body.description ? String(body.description) : null;
  const visibility: Visibility = body.visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE";
  const blocks = JSON.stringify(body.blocks);

  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO JournalTemplate (id, userId, name, description, visibility, blocks, author, createdAt, updatedAt)
      VALUES ('${esc(id)}', '${esc(userId)}', '${esc(name)}', ${
      description ? `'${esc(description)}'` : "NULL"
    }, '${visibility}', '${esc(blocks)}', ${author ? `'${esc(author)}'` : "NULL"}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    return NextResponse.json({ id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 });
  }
}
