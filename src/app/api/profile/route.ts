export const dynamic = 'force-dynamic';
// src/app/api/profile/route.ts
export const runtime = "nodejs";
export const revalidate = 0; // Disable static generation for this route

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireUserId } from "@/lib/session";
import { moderateContent, getModerationErrorMessage } from "@/lib/content-moderation";

// GET /api/profile
// GET /api/profile
export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = user.id;

    // 1. Fetch Profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
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

    // 2. Fetch Stats
    // Note: User model has counter fields, but we can also count relations if needed.
    // Schema uses 'Subscription' for follows.
    const [statsData, postsCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          followersCount: true,
          followingCount: true,
          _count: {
            select: {
              friendshipsA: { where: { status: 'ACCEPTED' } },
              friendshipsB: { where: { status: 'ACCEPTED' } }
            }
          }
        }
      }),
      prisma.post.count({ where: { userId, status: 'PUBLISHED', postType: { not: 'CHAN' } } })
    ]);

    const stats = {
      followers: statsData?.followersCount || 0,
      following: statsData?.followingCount || 0,
      posts: postsCount,
      friends: 0  // Friends system removed - using following/followers now
    };

    // 3. Fetch Recent Posts (Limit 12)
    const rawPosts = await prisma.post.findMany({
      where: {
        userId,
        status: 'PUBLISHED',
        postType: { not: 'CHAN' },
      },
      take: 12,
      orderBy: { createdAt: 'desc' },
      include: {
        postMedia: { include: { media: true } },
        user: {
          select: {
            id: true,
            name: true,
            profile: { select: { displayName: true, avatarUrl: true } }
          }
        },
        _count: {
          select: { likes: true, comments: true }
        }
      }
    });

    // Transform Posts
    const posts = rawPosts.map((p: any) => {
      const media = p.postMedia?.map((pm: any) => pm.media) || [];
      return {
        ...p,
        media,
        createdAt: p.createdAt.toISOString(),
        likes: p._count?.likes || 0,
        comments: p._count?.comments || 0,
        lillData: p.postType === 'LILL' ? {
          id: p.id,
          videoUrl: media[0]?.url || '',
          thumbnailUrl: media[0]?.thumbnailUrl || null,
          duration: 0
        } : undefined,
        fillData: p.postType === 'FILL' ? {
          id: p.id,
          videoUrl: media[0]?.url || '',
          thumbnailUrl: media[0]?.thumbnailUrl || null,
          duration: 0
        } : undefined,
        audData: p.postType === 'AUD' ? {
          id: p.id,
          audioUrl: media[0]?.url || '',
          title: "Audio",
          artist: "Artist",
          coverImageUrl: media[0]?.url,
          duration: 0
        } : undefined,

        xrayData: p.postType === 'XRAY' ? {
          id: p.id,
          topLayerUrl: media.find((m: any) => m.variant === 'xray-top')?.url || media[0]?.url || '',
          topLayerType: media.find((m: any) => m.variant === 'xray-top')?.type || 'IMAGE',
          bottomLayerUrl: media.find((m: any) => m.variant === 'xray-bottom')?.url || media[1]?.url || '',
          bottomLayerType: media.find((m: any) => m.variant === 'xray-bottom')?.type || 'IMAGE',
        } : undefined,
      };
    });

    return NextResponse.json({
      profile: profile || { userId: user.id }, // Ensure profile key
      stats,
      posts,
      id: user.id
    });

  } catch (e: any) {
    console.error("Profile GET Error:", e);
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

    // Content Moderation: Check display name, bio, and other user-facing text
    const combinedText = `${displayName || ''} ${bio || ''} ${conversationStarter || ''}`;
    const moderationResult = moderateContent(combinedText);
    if (!moderationResult.isClean) {
      return NextResponse.json(
        { error: getModerationErrorMessage(moderationResult) },
        { status: 400 }
      );
    }

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

    // Profile Privacy (isPrivate from checkbox - comes as 'on' or undefined)
    const isPrivateRaw = body["isPrivate"];
    const isPrivate = isPrivateRaw === true || isPrivateRaw === 'true' || isPrivateRaw === 'on';

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
        isPrivate,
      },
      update: {
        displayName, bio, location, dob, gender, height, weight, city, interactionMode, conversationStarter,
        achievements, workHistory, education,
        bestVibeTime, vibeWithPeople, lifeIsLike, emotionalFit, pleaseDont, careAbout, protectiveAbout, distanceMakers, goals, lifestyle,
        isPrivate,
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

