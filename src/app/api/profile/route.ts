// src/app/api/profile/route.ts
export const runtime = "nodejs";
export const revalidate = 0; // Disable static generation for this route

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireUserId } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = process.env.SUPABASE_PROFILE_BUCKET || "profiles";

async function uploadToStorage(userId: string, kind: "avatar" | "cover" | "stalk", file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
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
    if (!u?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } });

    const userData = await prisma.user.findUnique({
      where: { id: u.id },
      select: {
        name: true,
        followersCount: true,
        followingCount: true,
        profile: true, // Fetch all profile fields including new ones
        autoAcceptFollows: true,
        defaultPostVisibility: true,
        taggingPrivacy: true,
        notificationSettings: true,
        createdAt: true, // For showing account age
      },
    });

    const [friendCount, postCount, followersCount, followingCount, posts] = await Promise.all([
      prisma.friendship.count({
        where: { status: "ACCEPTED", OR: [{ userId: u.id }, { friendId: u.id }] },
      }),
      prisma.post.count({ where: { userId: u.id } }),
      // Count followers: users who have accepted friendships where this user is the friendId
      prisma.friendship.count({
        where: {
          friendId: u.id,
          status: "ACCEPTED",
        },
      }),
      // Count following: users who this user has accepted friendships with
      prisma.friendship.count({
        where: {
          userId: u.id,
          status: "ACCEPTED",
        },
      }),
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
          status: true,
        },
      }),
    ]);

    return NextResponse.json({
      name: userData?.name ?? null,
      email: u.email, // Return email for display
      createdAt: userData?.createdAt,
      autoAcceptFollows: userData?.autoAcceptFollows,
      defaultPostVisibility: userData?.defaultPostVisibility,
      taggingPrivacy: userData?.taggingPrivacy,
      notificationSettings: userData?.notificationSettings,
      profile: userData?.profile ?? null,
      followersCount,
      followingCount,
      stats: { friends: friendCount, posts: postCount, followers: followersCount, following: followingCount },
      posts,
    }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to load profile" }, { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } });
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

    // Core helpers
    const getStr = (key: string) => (form.get(key) as string) || undefined;
    const getArr = (key: string) => {
      const val = form.get(key);
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return []; }
      }
      return undefined;
    };

    // Basics
    const name = getStr("name");
    const displayName = getStr("displayName");
    const bio = getStr("bio");
    const location = getStr("location");
    const dobStr = getStr("dob"); // Expecting ISO string or YYYY-MM-DD
    let dob: Date | undefined;
    if (dobStr) {
      const parsed = new Date(dobStr);
      if (!isNaN(parsed.getTime())) {
        dob = parsed;
      } else {
        console.warn(`Invalid DOB format received: ${dobStr}`);
      }
    }
    const height = getStr("height");
    const weight = getStr("weight");
    const conversationStarter = getStr("conversationStarter");

    // Professional
    const achievements = getStr("achievements");
    const workHistory = getStr("workHistory");
    const education = getStr("education");
    const skills = getArr("skills");

    // Vibe
    const city = getStr("city");
    const interactionMode = getStr("interactionMode");
    const bestVibeTime = getStr("bestVibeTime");
    const vibeWithPeople = getStr("vibeWithPeople");
    const lifeIsLike = getStr("lifeIsLike");

    // Deep Dive
    const emotionalFit = getStr("emotionalFit");
    const pleaseDont = getStr("pleaseDont");
    const careAbout = getStr("careAbout");
    const protectiveAbout = getStr("protectiveAbout");
    const distanceMakers = getStr("distanceMakers");
    const goals = getStr("goals");
    const lifestyle = getStr("lifestyle");

    // Arrays
    const values = getArr("values");
    const hardNos = getArr("hardNos");
    const topMovies = getArr("topMovies");
    const topGenres = getArr("topGenres");
    const topSongs = getArr("topSongs");
    const topFoods = getArr("topFoods");
    const topPlaces = getArr("topPlaces");
    const topGames = getArr("topGames");
    const currentlyInto = getArr("currentlyInto");
    const dislikes = getArr("dislikes");
    const icks = getArr("icks");
    const interactionTopics = getArr("interactionTopics");
    const stalkMeInput = getStr("stalkMe");

    // Settings
    const cardSettings = getStr("cardSettings");

    // Files
    const avatar = form.get("avatar") as File | null;
    const cover = form.get("cover") as File | null;

    let avatarUrl: string | undefined;
    let coverVideoUrl: string | undefined;
    let coverImageUrl: string | undefined;
    let cardBackgroundUrl: string | undefined; // Added declaration

    if (avatar && typeof avatar !== "string") {
      avatarUrl = await uploadToStorage(userId, "avatar", avatar);
    }

    if (cover && typeof cover !== "string") {
      const isVideo = cover.type.startsWith("video/");
      const isImage = cover.type.startsWith("image/");
      const url = await uploadToStorage(userId, "cover", cover);

      if (isVideo) {
        coverVideoUrl = url;
        coverImageUrl = "";
      } else if (isImage) {
        coverImageUrl = url;
        coverVideoUrl = "";
      }
    }

    const cardBackground = form.get("cardBackground") as File | null;
    if (cardBackground && typeof cardBackground !== "string") {
      cardBackgroundUrl = await uploadToStorage(userId, "stalk", cardBackground); // Reusing 'stalk' or create new folder logic if needed, but 'stalk' is fine or 'background'
    }

    // Privacy Settings
    const autoAcceptFollowsStr = getStr("autoAcceptFollows");
    const defaultPostVisibility = getStr("defaultPostVisibility");
    const taggingPrivacy = getStr("taggingPrivacy");
    const notificationSettingsStr = getStr("notificationSettings");

    // Update User Model (Name & Settings)
    const userUpdateData: any = {};
    if (name) userUpdateData.name = name;
    if (autoAcceptFollowsStr !== undefined) userUpdateData.autoAcceptFollows = autoAcceptFollowsStr === "true";
    if (defaultPostVisibility) userUpdateData.defaultPostVisibility = defaultPostVisibility;
    if (taggingPrivacy) userUpdateData.taggingPrivacy = taggingPrivacy;

    if (notificationSettingsStr) {
      try {
        userUpdateData.notificationSettings = JSON.parse(notificationSettingsStr);
      } catch (e) {
        console.error("Failed to parse notification settings", e);
      }
    }

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({ where: { id: userId }, data: userUpdateData });
    }

    // Update Profile Model
    await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        displayName,
        bio,
        location,
        dob,
        height,
        weight,
        achievements,
        workHistory,
        education,
        skills: skills || [],
        city,
        interactionMode,
        conversationStarter,
        bestVibeTime,
        vibeWithPeople,
        lifeIsLike,
        emotionalFit,
        pleaseDont,
        careAbout,
        protectiveAbout,
        distanceMakers,
        goals,
        lifestyle,
        values: values || [],
        hardNos: hardNos || [],
        topMovies: topMovies || [],
        topGenres: topGenres || [],
        topSongs: topSongs || [],
        topFoods: topFoods || [],
        topPlaces: topPlaces || [],
        topGames: topGames || [],
        currentlyInto: currentlyInto || [],
        dislikes: dislikes || [],
        icks: icks || [],
        interactionTopics: interactionTopics || [],
        stalkMe: stalkMeInput,
        avatarUrl,
        coverVideoUrl,
        coverImageUrl,
        cardBackgroundUrl,
        cardSettings,
      },
      update: {
        displayName, bio, location, dob, height, weight, city, interactionMode, conversationStarter,
        achievements, workHistory, education,
        bestVibeTime, vibeWithPeople, lifeIsLike, emotionalFit, pleaseDont, careAbout, protectiveAbout, distanceMakers, goals, lifestyle,
        ...(skills ? { skills } : {}),
        ...(values ? { values } : {}),
        ...(hardNos ? { hardNos } : {}),
        ...(topMovies ? { topMovies } : {}),
        ...(topGenres ? { topGenres } : {}),
        ...(topSongs ? { topSongs } : {}),
        ...(topFoods ? { topFoods } : {}),
        ...(topPlaces ? { topPlaces } : {}),
        ...(topGames ? { topGames } : {}),
        ...(currentlyInto ? { currentlyInto } : {}),
        ...(dislikes ? { dislikes } : {}),
        ...(icks ? { icks } : {}),
        ...(interactionTopics ? { interactionTopics } : {}),
        ...(stalkMeInput !== undefined ? { stalkMe: stalkMeInput } : {}),
        ...(avatarUrl ? { avatarUrl } : {}),
        ...(coverVideoUrl !== undefined ? { coverVideoUrl } : {}),
        ...(coverImageUrl !== undefined ? { coverImageUrl } : {}),
        ...(cardBackgroundUrl ? { cardBackgroundUrl } : {}),
        ...(cardSettings ? { cardSettings } : {}),
      },
    });

    return NextResponse.json({ ok: true, avatarUrl, coverVideoUrl, coverImageUrl });
  } catch (e: any) {
    console.error("Profile save error detailed:", e);
    // Return specific Prisma error if possible, or stack
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: errorMessage, details: String(e) }, { status: 500 });
  }
}
