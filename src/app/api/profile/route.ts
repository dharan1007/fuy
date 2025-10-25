// src/app/api/profile/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireUserId } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = process.env.SUPABASE_PROFILE_BUCKET || "profiles";

async function uploadToStorage(userId: string, kind: "avatar" | "cover", file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || (kind === "avatar" ? "jpg" : "mp4")).toLowerCase();
  const path = `${userId}/${kind}-${Date.now()}.${ext}`;

  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  return supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// GET /api/profile
export async function GET() {
  try {
    const u = await getSessionUser();
    if (!u?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const userData = await prisma.user.findUnique({
      where: { id: u.id },
      select: {
        name: true,
        profile: {
          select: {
            displayName: true,
            avatarUrl: true,
            bio: true,
            location: true,
            tags: true,
            coverVideoUrl: true,
          },
        },
      },
    });

    const [friendCount, postCount, posts] = await Promise.all([
      prisma.friendship.count({
        where: { status: "ACCEPTED", OR: [{ userId: u.id }, { friendId: u.id }] },
      }),
      prisma.post.count({ where: { userId: u.id } }),
      prisma.post.findMany({
        where: { userId: u.id },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          content: true,
          visibility: true,
          feature: true,
          createdAt: true,
          media: { select: { type: true, url: true } },
        },
      }),
    ]);

    return NextResponse.json({
      name: userData?.name ?? null,
      profile: userData?.profile ?? null,
      stats: { friends: friendCount, posts: postCount },
      posts,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to load profile" }, { status: 500 });
  }
}

// PUT /api/profile (multipart form: text + files)
export async function PUT(req: Request) {
  try {
    const userId = await requireUserId();

    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Send as multipart/form-data" }, { status: 400 });
    }

    const form = await req.formData();
    const name = (form.get("name") as string) || undefined;
    const displayName = (form.get("displayName") as string) || undefined;
    const bio = (form.get("bio") as string) || undefined;
    const location = (form.get("location") as string) || undefined;
    const tags = (form.get("tags") as string) || undefined;
    const avatar = form.get("avatar") as File | null;
    const cover = form.get("cover") as File | null;

    let avatarUrl: string | undefined;
    let coverVideoUrl: string | undefined;

    if (avatar && typeof avatar !== "string") {
      avatarUrl = await uploadToStorage(userId, "avatar", avatar);
    }
    if (cover && typeof cover !== "string") {
      coverVideoUrl = await uploadToStorage(userId, "cover", cover);
    }

    if (typeof name === "string") {
      await prisma.user.update({ where: { id: userId }, data: { name } });
    }

    await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        displayName: displayName ?? null,
        bio: bio ?? null,
        location: location ?? null,
        tags: tags ?? null,
        ...(avatarUrl ? { avatarUrl } : {}),
        ...(coverVideoUrl ? { coverVideoUrl } : {}),
      },
      update: {
        displayName: displayName ?? null,
        bio: bio ?? null,
        location: location ?? null,
        tags: tags ?? null,
        ...(avatarUrl ? { avatarUrl } : {}),
        ...(coverVideoUrl ? { coverVideoUrl } : {}),
      },
    });

    return NextResponse.json({ ok: true, avatarUrl, coverVideoUrl });
  } catch (e: any) {
    if (e?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: e?.message ?? "Failed to save profile" }, { status: 500 });
  }
}

// PATCH /api/profile (JSON: simple text updates only)
export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { displayName, bio, location } = body;

    await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        displayName: displayName ?? null,
        bio: bio ?? null,
        location: location ?? null,
      },
      update: {
        ...(displayName !== undefined ? { displayName } : {}),
        ...(bio !== undefined ? { bio } : {}),
        ...(location !== undefined ? { location } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: e?.message ?? "Failed to update profile" }, { status: 500 });
  }
}
