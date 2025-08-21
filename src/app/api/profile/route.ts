// src/app/api/profile/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { requireUserId } from "../../../lib/session";
import { z } from "zod";

/** Helpers to normalize empty values */
const toUndef = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;
const toNullIfEmpty = (v: unknown) =>
  v === null || v === undefined || (typeof v === "string" && v.trim() === "")
    ? null
    : v;

/** Allow absolute URL, relative "/path", or data URL */
const RelativeOrAbsUrl = z.union([
  z.string().url().max(500),                 // https://...
  z.string().regex(/^\/[^\s]*$/).max(500),   // /uploads/abc.jpg
  z.string().regex(/^data:/).max(2_000_000), // data:image/png;base64,...
]);

/** Input validator (matches updated Prisma model incl. location,tags) */
const ProfileInput = z.object({
  displayName: z.preprocess(toUndef, z.string().trim().min(1).max(80)).optional(),
  bio: z.preprocess(toUndef, z.string().trim().max(280)).optional(),
  avatarUrl: z.preprocess(toNullIfEmpty, RelativeOrAbsUrl).nullable().optional(),
  location: z.preprocess(toUndef, z.string().trim().max(120)).optional(),
  // accept array of strings or comma-separated string
  tags: z
    .preprocess(
      (v) => {
        if (Array.isArray(v)) return v.map((s) => String(s));
        if (typeof v === "string") {
          return v
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
        return undefined;
      },
      z.array(z.string().trim().max(30))
    )
    .optional(),
});

/** Keep only defined keys (null is allowed) */
function compact<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

/** GET profile */
export async function GET() {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { userId } });
  // For convenience, expand tags string -> array in response
  const result =
    profile && typeof profile.tags === "string"
      ? { ...profile, tags: profile.tags.split(",").map((s) => s.trim()).filter(Boolean) }
      : profile;

  return NextResponse.json({ ok: true, profile: result });
}

/** POST upsert profile */
export async function POST(req: Request) {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });

  let parsed: z.infer<typeof ProfileInput>;
  try {
    parsed = ProfileInput.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const data = compact({
    displayName: parsed.displayName ?? undefined,
    bio: parsed.bio ?? undefined,
    avatarUrl: parsed.avatarUrl ?? undefined, // can be null to clear
    location: parsed.location ?? undefined,
    tags: parsed.tags ? parsed.tags.join(",") : undefined, // store as CSV
  });

  try {
    const profile = await prisma.profile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });

    // expand tags back to array for client convenience
    const result =
      profile && typeof profile.tags === "string"
        ? { ...profile, tags: profile.tags.split(",").map((s) => s.trim()).filter(Boolean) }
        : profile;

    return NextResponse.json({ ok: true, profile: result });
  } catch {
    return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  }
}
