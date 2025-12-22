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

  // Fetch subscriptions for isSubscribed check if user is logged in
  let mySubscriptions: Set<string> = new Set();
  if (userId) {
    const subs = await prisma.subscription.findMany({
      where: { subscriberId: userId },
      select: { subscribedToId: true }
    });
    subs.forEach(s => mySubscriptions.add(s.subscribedToId));
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
          followersCount: true, // Needed for UI
          followingCount: true, // Needed for UI
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
      reactions: {
        select: {
          type: true,
          userId: true,
        },
      },
      reactionBubbles: {
        take: 3,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              profile: { select: { avatarUrl: true, displayName: true } }
            }
          }
        }
      },
      // Include all new post types
      chapterData: true,
      xrayData: true,
      simpleData: true,
      lillData: true,
      fillData: true,
      audData: true,
      chanData: {
        include: {
          shows: {
            include: {
              episodes: {
                orderBy: { createdAt: 'desc' },
                take: 1 // Only need the latest for preview
              }
            },
            take: 1 // Get the latest show
          }
        }
      },
      pullUpDownData: {
        include: {
          options: true, // Need all options for stats in detail view
          votes: {
            include: {
              user: {
                select: {
                  id: true,
                  profile: { select: { displayName: true, avatarUrl: true } }
                }
              }
            }
          }
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
          shares: true,
          reactionBubbles: true
        }
      }
    },
    take: 50,
  } as any) as any;

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

    return {
      ...post,
      media: normalizedMedia, // Use the enriched media array
      likes: post.likes?.length || 0,
      likedByMe: userId ? post.likes?.some((like: any) => like.userId === userId) : false,
      shares: post.shares?.length || 0,
      isSubscribed: mySubscriptions.has(post.userId), // NEW: Add subscription status
      // Add user vote status for polls
      userVote: post.pullUpDownData?.votes?.[0]?.vote || null,

      // Reactions Logic
      reactionCounts: post.reactions.reduce((acc: any, r: any) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      }, { W: 0, L: 0, CAP: 0, FIRE: 0 }),
      userReaction: userId ? post.reactions.find((r: any) => r.userId === userId)?.type || null : null,

      // Bubbles
      topBubbles: post.reactionBubbles,
      totalBubbles: post._count?.reactionBubbles || 0,
    };
  });

  return NextResponse.json(transformed);
}
