// src/app/api/posts/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, getSessionUser } from "@/lib/session";
import { moderateContent } from "@/lib/moderation";

type FeatureKeyStr =
  | "JOURNAL"
  | "JOY"
  | "AWE"
  | "BONDS"
  | "SERENDIPITY"
  | "CHECKIN"
  | "PROGRESS"
  | "OTHER";
type VisibilityStr = "PUBLIC" | "FRIENDS" | "PRIVATE";
type MediaTypeStr = "IMAGE" | "VIDEO" | "AUDIO";

const FEAT = new Set<FeatureKeyStr>([
  "JOURNAL",
  "JOY",
  "AWE",
  "BONDS",
  "SERENDIPITY",
  "CHECKIN",
  "PROGRESS",
  "OTHER",
]);
const VIS = new Set<VisibilityStr>(["PUBLIC", "FRIENDS", "PRIVATE"]);
const MT = new Set<MediaTypeStr>(["IMAGE", "VIDEO", "AUDIO"]);

const asFeat = (v: unknown): FeatureKeyStr => {
  const s = String(v ?? "").toUpperCase();
  return (FEAT.has(s as FeatureKeyStr) ? s : "OTHER") as FeatureKeyStr;
};
const asVis = (v: unknown): VisibilityStr => {
  const s = String(v ?? "").toUpperCase();
  return (VIS.has(s as VisibilityStr) ? s : "PUBLIC") as VisibilityStr;
};
const asMT = (v: unknown): MediaTypeStr => {
  const s = String(v ?? "").toUpperCase();
  return (MT.has(s as MediaTypeStr) ? s : "IMAGE") as MediaTypeStr;
};

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  const body = await req.json();

  const feature = asFeat(body.feature);
  const visibility = asVis(body.visibility);
  const postType = body.postType === "STORY" ? "STORY" : (body.postType || "STANDARD").toUpperCase();
  const content = String(body.content ?? "");
  const title = String(body.title ?? "");
  const groupId = body.groupId ? String(body.groupId) : null;

  // Timed Post Logic
  let expiresAt: Date | undefined;
  if (postType === "STORY" || body.expiresInHours) {
    const hours = Number(body.expiresInHours) || 24;
    expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  // Check content moderation
  const moderation = moderateContent(content, title);
  if (!moderation.isAllowed) {
    // Log the attempted violation
    try {
      await (prisma as any).moderationLog.create({
        data: {
          userId,
          content: content,
          reason: "BLOCK",
          violations: JSON.stringify(moderation.violations),
          severity: moderation.severity,
        },
      });
    } catch (e) {
      console.error("Failed to log moderation violation", e);
    }

    return NextResponse.json(
      {
        error: "Content violates community guidelines",
        violations: moderation.violations,
        details: moderation.violations.join("; "),
      },
      { status: 400 }
    );
  }

  const media = Array.isArray(body.media) ? body.media : [];
  const joyScore = Number.isFinite(body.joyScore) ? Math.trunc(body.joyScore) : 0;
  const connectionScore = Number.isFinite(body.connectionScore) ? Math.trunc(body.connectionScore) : 0;
  const creativityScore = Number.isFinite(body.creativityScore) ? Math.trunc(body.creativityScore) : 0;

  const postData: any = {
    userId,
    feature,
    content,
    visibility,
    groupId,
    postType,
    expiresAt,
    joyScore,
    connectionScore,
    creativityScore,
    media: {
      create: media.map((m: any) => ({
        userId,
        feature,
        type: asMT(m.type),
        url: String(m.url),
      })),
    },
  };

  if (postType === "STORY") {
    postData.storyData = {
      create: {
        duration: Number(body.expiresInHours) || 24
      }
    };
  }

  const post = await prisma.post.create({
    data: postData,
    include: {
      media: true,
      user: {
        select: {
          id: true,
          email: true,
          profile: { select: { displayName: true, avatarUrl: true } },
        },
      },
      group: { select: { id: true, name: true } },
    },
  });

  const contribs: { category: "JOY" | "CONNECTION" | "CREATIVITY"; value: number }[] = [];
  if (joyScore) contribs.push({ category: "JOY", value: Math.max(-10, Math.min(10, joyScore)) });
  if (connectionScore) contribs.push({ category: "CONNECTION", value: Math.max(-10, Math.min(10, connectionScore)) });
  if (creativityScore) contribs.push({ category: "CREATIVITY", value: Math.max(-10, Math.min(10, creativityScore)) });

  if (contribs.length) {
    await prisma.happinessScore.createMany({
      data: contribs.map((c) => ({
        userId,
        category: c.category,
        value: c.value,
        source: feature,
      })),
    });
  }

  return NextResponse.json(post);
}

// 162 already has getSessionUser, but it's redundant. Removing it here if it's already at the top?
// Actually line 162 is deep in the file. I'll move it to the top.

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  const userId = user?.id; // Optional user ID

  const { searchParams } = new URL(req.url);
  const scope = (searchParams.get("scope") ?? "public").toLowerCase();
  const groupId = searchParams.get("groupId");
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
  const type = searchParams.get("type"); // New: Filter by post type

  // use a safe, non-any accumulator for where conditions
  const where: Record<string, unknown> = {};
  if (groupId) where.groupId = groupId;

  // Filter by post type if provided
  if (type) {
    where.postType = type.toUpperCase();
  } else {
    // Default: Exclude stories, clocks AND Channels from main mixed feed
    // Channels are considered separate from regular posts
    where.postType = { notIn: ["STORY", "CHAN"] };
  }

  // Always filter out drafts unless specific scope handling says otherwise (e.g. "me" might want drafts, but we use separate endpoint)
  where.status = "PUBLISHED";


  if (scope === "me") {
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    where.userId = userId;
  } else if (scope === "friends") {
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const friends = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId, status: "ACCEPTED" },
          { friendId: userId, status: "ACCEPTED" },
        ],
      },
      select: { userId: true, friendId: true },
    });

    // infer element type from the actual query result
    type FriendRow = typeof friends[number];

    const ids = new Set<string>([userId]);
    friends.forEach((f: FriendRow) => {
      ids.add(f.userId === userId ? f.friendId : f.userId);
    });

    where.userId = { in: [...ids] };
    where.visibility = { in: ["FRIENDS", "PUBLIC"] as VisibilityStr[] };
  } else if (scope === "bloom") {
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const subscriptions = await prisma.subscription.findMany({
      where: { subscriberId: userId },
      select: { subscribedToId: true }
    });

    const subscribedIds = subscriptions.map(s => s.subscribedToId);
    // Include self? Usually feed includes self, but Bloom might be strictly subscriptions. 
    // Let's include self for now so user sees their own posts too if they want, or maybe strict.
    // "only the content user subscribes will show up" -> strict.
    where.userId = { in: subscribedIds };
    // Visibility: They subbed, so they should see PUBLIC. FRIENDS if they are also friends?
    // Start with PUBLIC. If friend logic is complex, maybe just Public for now or check friendship too.
    where.visibility = "PUBLIC";
  } else {
    where.visibility = "PUBLIC";
  }

  // Fetch subscriptions, hidden posts, and muted users if logged in
  let mySubscriptions: Set<string> = new Set();
  const hiddenPostIds = new Set<string>();
  const mutedUsersMap = new Map<string, string[]>(); // userId -> types[]

  if (userId) {
    const [subs, hidden, muted] = await Promise.all([
      prisma.subscription.findMany({
        where: { subscriberId: userId },
        select: { subscribedToId: true },
        take: 1000 // Reasonable limit
      }),
      (prisma as any).hiddenPost.findMany({
        where: { userId },
        select: { postId: true },
        take: 500
      }),
      (prisma as any).mutedUser.findMany({
        where: { muterId: userId },
        select: { mutedUserId: true, mutedTypes: true },
        take: 200
      })
    ]);

    subs.forEach((s: { subscribedToId: string }) => mySubscriptions.add(s.subscribedToId));
    hidden.forEach((h: { postId: string }) => hiddenPostIds.add(h.postId));

    muted.forEach((m: { mutedUserId: string; mutedTypes: string }) => {
      try {
        const types = JSON.parse(m.mutedTypes);
        mutedUsersMap.set(m.mutedUserId, Array.isArray(types) ? types : ["ALL"]);
      } catch (e) {
        mutedUsersMap.set(m.mutedUserId, ["ALL"]);
      }
    });
  }

  // Apply Hidden Posts Filter
  if (hiddenPostIds.size > 0) {
    where.id = { notIn: Array.from(hiddenPostIds) };
  }

  // Apply Muted Users Filter (Partial application in WHERE is hard if purely by type, 
  // but we can filter ALL here and specific types in post-processing or advanced AND)
  // For simplicity and performance, if "ALL" is muted, exclude userId.
  // If specific types, we might need to filter after fetch OR usage complex OR logic.
  // Complex OR: where.AND = [ { OR: [ { userId: { notIn: fullyMutedIds } }, { userId: partialId, postType: { notIn: types } } ] } ]
  // Let's do a simple exclusion of "ALL" muted users first.
  const fullyMutedIds = Array.from(mutedUsersMap.entries())
    .filter(([_, types]) => types.includes("ALL"))
    .map(([id]) => id);

  if (fullyMutedIds.length > 0) {
    where.userId = { notIn: fullyMutedIds };
  }

  // Note: For specific muted types (e.g. STORIES), we will filter in the map/filter step below or enhance query.
  // Given pagination, query filtering is better. Let's try to add specific type exclusion if possible.
  // It's hard with Prisma's simple where types dynamically. 
  // Strategy: We fetch posts as usual (minus fully blocked), then filter out specific muted types from the results.
  // This might clear the page size slightly but is safer.

  // Determine what to include based on requested type
  const include: any = {
    media: true,
    user: {
      select: {
        id: true,
        profile: { select: { displayName: true, avatarUrl: true } },
      },
    },
    likes: {
      select: { userId: true },
      take: 10 // Only need a snippet to check "likedByMe" if not using _count
    },
    _count: {
      select: {
        likes: true,
        comments: true,
        shares: true,
        reactionBubbles: true
      }
    }
  };

  // Only include specific data if it's the requested type or if it's a mixed feed
  // In a mixed feed, we might still want these, but let's be strategic.
  if (!type || type === 'CHAN') include.chanData = {
    include: {
      shows: {
        where: { isArchived: false },
        take: 1,
        include: { episodes: { take: 1, orderBy: { createdAt: 'desc' } } }
      }
    }
  };
  if (!type || type === 'PULLUPDOWN') include.pullUpDownData = { include: { options: true, votes: userId ? { where: { userId }, select: { optionId: true } } : undefined } };
  if (!type || type === 'CHAPTER') include.chapterData = true;
  if (!type || type === 'XRAY') include.xrayData = true;
  if (!type || type === 'SIMPLE') include.simpleData = true;
  if (!type || type === 'LILL') include.lillData = true;
  if (!type || type === 'FILL') include.fillData = true;
  if (!type || type === 'AUD') include.audData = true;

  // Only fetch a few bubbles/comments for feed view
  include.reactionBubbles = {
    take: 2,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, profile: { select: { avatarUrl: true } } } }
    }
  };

  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include,
    take: limit,
  });

  // Transform to include likes count, likedByMe, comments count, shares count
  // AND normalize media for specialized post types
  const transformed = posts.map((post: any) => {
    const normalizedMedia = [...post.media];

    // LILL: standard video
    if (post.lillData && post.lillData.videoUrl) {
      normalizedMedia.push({
        id: `lill-${post.id}`,
        type: 'VIDEO',
        url: post.lillData.videoUrl,
        postId: post.id,
        userId: post.userId,
        feature: 'LILL',
        createdAt: post.createdAt
      });
    }

    // FILL: standard video
    if (post.fillData && post.fillData.videoUrl) {
      normalizedMedia.push({
        id: `fill-${post.id}`,
        type: 'VIDEO',
        url: post.fillData.videoUrl,
        postId: post.id,
        userId: post.userId,
        feature: 'FILL',
        createdAt: post.createdAt
      });
    }

    // AUD: audio
    if (post.audData && post.audData.audioUrl) {
      normalizedMedia.push({
        id: `aud-${post.id}`,
        type: 'AUDIO',
        url: post.audData.audioUrl,
        postId: post.id,
        userId: post.userId,
        feature: 'AUD',
        createdAt: post.createdAt
      });
    }

    // CHAN: cover image
    if (post.chanData && post.chanData.coverImageUrl) {
      normalizedMedia.push({
        id: `chan-${post.id}`,
        type: 'IMAGE',
        url: post.chanData.coverImageUrl,
        postId: post.id,
        userId: post.userId,
        feature: 'CHAN',
        createdAt: post.createdAt
      });
    }

    // XRAY: top layer as preview image
    if (post.xrayData && post.xrayData.topLayerUrl) {
      normalizedMedia.push({
        id: `xray-${post.id}`,
        type: 'IMAGE',
        url: post.xrayData.topLayerUrl,
        postId: post.id,
        userId: post.userId,
        feature: 'XRAY',
        createdAt: post.createdAt
      });
    }

    // SIMPLE: parse simpleData JSON media
    if (post.simpleData && post.simpleData.mediaUrls) {
      try {
        const urls = JSON.parse(post.simpleData.mediaUrls);
        const types = post.simpleData.mediaTypes ? JSON.parse(post.simpleData.mediaTypes) : [];

        urls.forEach((url: string, idx: number) => {
          normalizedMedia.push({
            id: `simple-${post.id}-${idx}`,
            type: types[idx] || 'IMAGE', // Default to IMAGE if type missing
            url: url,
            postId: post.id,
            userId: post.userId,
            feature: 'SIMPLE',
            createdAt: post.createdAt
          });
        });
      } catch (e) {
        console.error("Failed to parse simpleData media", e);
      }
    }

    return {
      ...post,
      media: normalizedMedia, // Use the enriched media array
      likes: post._count?.likes || 0,
      likedByMe: userId ? post.likes?.some((like: any) => like.userId === userId) : false,
      shares: post._count?.shares || 0,
      isSubscribed: mySubscriptions.has(post.userId),
      userVote: post.pullUpDownData?.votes?.[0]?.optionId || null,

      // Simplified reactions if needed, but for now we keep the counts
      reactionCounts: { W: 0, L: 0, CAP: 0, FIRE: 0 }, // Should be calculated or fetched separately for efficiency
      userReaction: null,

      // Bubbles
      topBubbles: post.reactionBubbles || [],
      totalBubbles: post._count?.reactionBubbles || 0,
    };
  });

  return NextResponse.json(transformed);
}
