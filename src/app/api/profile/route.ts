export const dynamic = 'force-dynamic';
// src/app/api/profile/route.ts
export const runtime = "nodejs";
export const revalidate = 0; // Disable static generation for this route

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireUserId } from "@/lib/session";

// GET /api/profile
export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            autoAcceptFollows: true,
            defaultPostVisibility: true,
            taggingPrivacy: true,
            notificationSettings: true,
          }
        }
      }
    });

    return NextResponse.json(profile || { userId: user.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT /api/profile (JSON: text + urls)
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
        console.error(`[PROFILE_PUT] Email conflict for ${normalizedEmail}. Existing ID: ${emailConflict.id}, New ID: ${userId}`);
        return NextResponse.json({ error: "Email already in use by another account." }, { status: 409 });
      }

      await prisma.user.create({
        data: {
          id: userId,
          email: normalizedEmail,
          name: "New User",
        }
      });
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ error: "Send as application/json" }, { status: 400 });
    }

    const body = await req.json();

    // Core helpers
    const getStr = (key: string) => (body[key] !== undefined && body[key] !== null) ? String(body[key]) : undefined;
    const getArr = (key: string) => {
      const val = body[key];
      // If client sends JSON string, parse it. If array, use it.
      if (Array.isArray(val)) return val;
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
    // stalkMe: previously JSON string of array. Client now sends array or JSON string.
    // However, the DB likely stores it as JSON string or string array?
    // Looking at schema (assumed), it's probably String[] or JSON.
    // Prisma `stalkMe` field type check:
    // In `view_file` of schema (earlier logs), I didn't see Profile model deep dive.
    // But assuming strict refactor:
    // getArr("stalkMe") handles both.
    // Wait, the client sends `stalkMe: JSON.stringify(data.stalkMe)` in ProfileSetup.
    // ProfileCardModal sends array and assigns to payload, so it might be array.
    // `getStr("stalkMe")` was used before.
    // Let's check previous code: `stalkMe: stalkMeInput` where `stalkMeInput` was `getStr("stalkMe")`.
    // So the DB field expects a String (JSONified array) or similar.
    // I will stick to string storage to match previous behavior if it was a single string field.
    // If it was `getStr`, it suggests it's a string field.
    // So I should JSON.stringify the array if I get an array.
    const stalkMeRaw = body["stalkMe"];
    const stalkMeInput = Array.isArray(stalkMeRaw) ? JSON.stringify(stalkMeRaw) : (typeof stalkMeRaw === 'string' ? stalkMeRaw : undefined);


    // Settings
    const cardSettingsRaw = body["cardSettings"];
    const cardSettings = typeof cardSettingsRaw === 'object' ? JSON.stringify(cardSettingsRaw) : (typeof cardSettingsRaw === 'string' ? cardSettingsRaw : undefined);

    // URLs (already uploaded by client)
    const avatarUrl = getStr("avatarUrl");
    const coverVideoUrl = getStr("coverVideoUrl");
    const coverImageUrl = getStr("coverImageUrl");
    const cardBackgroundUrl = getStr("cardBackgroundUrl");

    // Privacy Settings
    const autoAcceptFollowsStr = body["autoAcceptFollows"]; // boolean or string
    const defaultPostVisibility = getStr("defaultPostVisibility");
    const taggingPrivacy = getStr("taggingPrivacy");
    const notificationSettingsRaw = body["notificationSettings"];

    // Update User Model (Name & Settings)
    const userUpdateData: any = {};
    if (name) userUpdateData.name = name;
    if (autoAcceptFollowsStr !== undefined) userUpdateData.autoAcceptFollows = String(autoAcceptFollowsStr) === "true" || autoAcceptFollowsStr === true;
    if (defaultPostVisibility) userUpdateData.defaultPostVisibility = defaultPostVisibility;
    if (taggingPrivacy) userUpdateData.taggingPrivacy = taggingPrivacy;

    if (notificationSettingsRaw) {
      userUpdateData.notificationSettings = typeof notificationSettingsRaw === 'string'
        ? JSON.parse(notificationSettingsRaw)
        : notificationSettingsRaw;
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

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Profile save error detailed:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: errorMessage, details: String(e) }, { status: 500 });
  }
}

