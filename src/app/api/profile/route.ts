export const dynamic = 'force-dynamic';
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

  console.log(`[PROFILE_PUT] Uploading file to ${path} (User: ${userId})`);
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: true,
  });
  if (error) {
    console.error(`[PROFILE_PUT] Upload failed for ${path}:`, error);
    throw new Error(`Upload failed: ${error.message}`);
  }
  console.log(`[PROFILE_PUT] Upload success: ${path}`);

  return supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// GET /api/profile
export async function GET() {
  try {
    const userId = await requireUserId();

    const userData = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true, // Need to fetch email here since we don't have session object
        name: true,
        followersCount: true,
        followingCount: true,
        profile: true,
        autoAcceptFollows: true,
        defaultPostVisibility: true,
        taggingPrivacy: true,
        notificationSettings: true,
        createdAt: true,
      },
    });

    const [friendCount, postCount, followersCount, followingCount, posts] = await Promise.all([
      prisma.friendship.count({
        where: { status: "ACCEPTED", OR: [{ userId: userId }, { friendId: userId }] },
      }),
      prisma.post.count({ where: { userId: userId } }),
      prisma.friendship.count({
        where: { friendId: userId, status: "ACCEPTED" },
      }),
      prisma.friendship.count({
        where: { userId: userId, status: "ACCEPTED" },
      }),
      prisma.post.findMany({
        where: { userId: userId },
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
          // Need to fetch user details for post card display? 
          // HomeClient expects post.user structure. 
          // But currently profile GET returns pure posts.
          // Let's keep it as is, frontend might be handling it or these are just raw posts.
          // Actually HomeClient map usually expects post.user.
          // Let's check the old code... old code didn't select user for profile posts.
          // Just keeps it same as before.
        },
      }),
    ]);

    return NextResponse.json({
      name: userData?.name ?? null,
      email: userData?.email,
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
    console.error(`[PROFILE_DEBUG] Error fetching profile:`, e);
    if (e?.message === "UNAUTHENTICATED") {
      console.error("[PROFILE_DEBUG] Unauthenticated: No valid session found.");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (e?.message === "USER_NOT_FOUND") {
      console.error("[PROFILE_DEBUG] User Not Found: Session exists but user not in DB.");
      return NextResponse.json({ error: "Profile not found", code: "PROFILE_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ error: e?.message ?? "Failed to load profile", details: String(e) }, { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}

// PUT /api/profile (multipart form: text + files)
export async function PUT(req: Request) {
  try {
    // 1. Get Session User directly (bypass DB check)
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const userId = sessionUser.id;
    const userEmail = sessionUser.email;

    // 2. Ensure User exists in DB
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      console.log(`[PROFILE_PUT] Creating new user record for ${userId}`);
      if (!userEmail) {
        return NextResponse.json({ error: "Email is required for new users" }, { status: 400 });
      }
      const normalizedEmail = userEmail.toLowerCase().trim();

      // Check for conflict with existing email in Prisma (in case of ID mismatch/zombie)
      const emailConflict = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (emailConflict) {
        // If the email exists but IDs don't match, we have a mess. 
        // For now, let's just log it and return error to prevent logic errors.
        console.error(`[PROFILE_PUT] Email conflict for ${normalizedEmail}. Existing ID: ${emailConflict.id}, New ID: ${userId}`);
        return NextResponse.json({ error: "Email already in use by another account." }, { status: 409 });
      }

      await prisma.user.create({
        data: {
          id: userId,
          email: normalizedEmail,
          name: "New User", // Will be updated below
        }
      });
    }

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
    const gender = getStr("gender");
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
        gender,
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
        displayName, bio, location, dob, gender, height, weight, city, interactionMode, conversationStarter,
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

