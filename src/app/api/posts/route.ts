// src/app/api/posts/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
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
  const content = String(body.content ?? "");
  const title = String(body.title ?? "");
  const groupId = body.groupId ? String(body.groupId) : null;

  // Check content moderation
  const moderation = moderateContent(content, title);
  if (!moderation.isAllowed) {
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

  const post = await prisma.post.create({
    data: {
      userId,
      feature,
      content,
      visibility,
      groupId,
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
    },
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

import { getSessionUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  const userId = user?.id; // Optional user ID

  const { searchParams } = new URL(req.url);
  const scope = (searchParams.get("scope") ?? "public").toLowerCase();
  const groupId = searchParams.get("groupId");
  const type = searchParams.get("type"); // New: Filter by post type

  // use a safe, non-any accumulator for where conditions
  const where: Record<string, unknown> = {};
  if (groupId) where.groupId = groupId;

  // Filter by post type if provided
  if (type) {
    where.postType = type.toUpperCase();
  }

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
  } else {
    where.visibility = "PUBLIC";
  }

  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
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
      likes: {
        select: {
          userId: true,
        },
      },
      comments: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          userId: true,
          user: {
            select: {
              id: true,
              email: true,
              profile: { select: { displayName: true, avatarUrl: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      shares: {
        select: {
          id: true,
        },
      },
      // Include all new post types
      chapterData: true,
      xrayData: true,
      btsData: true,
      lillData: true,
      fillData: true,
      audData: true,
      chanData: true,
      pullUpDownData: {
        include: {
          votes: userId ? {
            where: {
              userId,
            },
          } : false,
        },
      },
    },
    take: 50,
  });

  // Transform to include likes count, likedByMe, comments count, shares count
  // AND normalize media for specialized post types
  const transformed = posts.map((post) => {
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

    return {
      ...post,
      media: normalizedMedia, // Use the enriched media array
      likes: post.likes?.length || 0,
      likedByMe: userId ? post.likes?.some((like) => like.userId === userId) : false,
      shares: post.shares?.length || 0,
      // Add user vote status for polls
      userVote: post.pullUpDownData?.votes?.[0]?.vote || null,
    };
  });

  return NextResponse.json(transformed);
}
