// src/app/api/posts/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, getSessionUser } from "@/lib/session";
import { moderateContent } from "@/lib/moderation";
import { rateLimit } from "@/lib/rate-limit";
import { synthesizePostData } from "@/lib/post-synthesis";

// Helper Types
type FeatureKeyStr = "JOURNAL" | "AWE" | "BONDS" | "SERENDIPITY" | "CHECKIN" | "PROGRESS" | "OTHER";
type VisibilityStr = "PUBLIC" | "FRIENDS" | "PRIVATE";
type MediaTypeStr = "IMAGE" | "VIDEO" | "AUDIO";

const asFeat = (v: unknown): FeatureKeyStr => ["JOURNAL", "AWE", "BONDS", "SERENDIPITY", "CHECKIN", "PROGRESS", "OTHER"].includes(String(v).toUpperCase() as any) ? String(v).toUpperCase() as FeatureKeyStr : "OTHER";
const asVis = (v: unknown): VisibilityStr => ["PUBLIC", "FRIENDS", "PRIVATE"].includes(String(v).toUpperCase() as any) ? String(v).toUpperCase() as VisibilityStr : "PUBLIC";
const asMT = (v: unknown): MediaTypeStr => ["IMAGE", "VIDEO", "AUDIO"].includes(String(v).toUpperCase() as any) ? String(v).toUpperCase() as MediaTypeStr : "IMAGE";

// Rate limit: 30 posts per hour to prevent spam
const postLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 30,
});

async function postHandler(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await req.json();

    const feature = asFeat(body.feature);
    const visibility = asVis(body.visibility);
    const postType = body.postType === "STORY" ? "STORY" : (body.postType || "STANDARD").toUpperCase();
    const content = String(body.content ?? "");
    const title = String(body.title ?? "");
    const groupId = body.groupId ? String(body.groupId) : null;

    // Moderation
    const moderation = moderateContent(content, title);
    if (!moderation.isAllowed) {
      return NextResponse.json({ error: "Content violates community guidelines", violations: moderation.violations }, { status: 400 });
    }

    // --- 1. Prepare Media Data ---
    // Handle both mobile (flat mediaUrls/Types) and web (array of objects) formats
    const rawMedia = Array.isArray(body.mediaUrls) ? body.mediaUrls.map((url: string, i: number) => {
      // For XRAY posts, properly assign variants
      let variant = 'standard';
      if (postType === 'XRAY') {
        variant = i === 0 ? 'xray-top' : 'xray-bottom';
      }
      return {
        url,
        type: body.mediaTypes?.[i] || 'IMAGE',
        variant
      };
    }) : (Array.isArray(body.media) ? body.media : []);

    // Validation: Ensure XRAY posts have valid media layers
    if (postType === 'XRAY') {
      const mediaCount = rawMedia.length;
      if (mediaCount < 2) {
        return NextResponse.json({
          error: "XRAY posts require exactly 2 media layers (top and bottom).",
          received: mediaCount
        }, { status: 400 });
      }
    }

    // --- 2. Create Post Transaction ---
    const post = await prisma.$transaction(async (tx) => {

      // A. Create Core Post
      const newPost = await tx.post.create({
        data: {
          userId,
          feature,
          content,
          visibility,
          groupId,
          postType,
          connectionScore: Number(body.connectionScore) || 0,
          creativityScore: Number(body.creativityScore) || 0,
          postMedia: {
            create: rawMedia.map((m: any, idx: number) => ({
              orderIndex: idx,
              media: {
                create: {
                  userId,
                  type: asMT(m.type),
                  url: String(m.url),
                  variant: m.variant || 'standard'
                }
              }
            }))
          }
        },
        include: {
          user: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } },
          postMedia: { include: { media: true } }
        }
      });

      // B. Create FeedItem (Denormalized)
      const mediaPreviews = newPost.postMedia.map(pm => ({
        type: pm.media.type,
        url: pm.media.url,
        aspect: 1
      }));

      await tx.feedItem.create({
        data: {
          userId,
          postId: newPost.id,
          authorName: newPost.user.profile?.displayName || 'User',
          authorAvatarUrl: newPost.user.profile?.avatarUrl,
          postType,
          feature,
          contentSnippet: content.slice(0, 200),
          mediaPreviews: JSON.stringify(mediaPreviews),
          createdAt: newPost.createdAt,
          likeCount: 0,
          commentCount: 0,
          shareCount: 0
        }
      });

      // C. Handle Legacy/Metadata Tables (No URLs)
      if (postType === 'LILL') {
        const duration = Number(body.duration) || 0;
        await tx.lill.create({
          data: {
            postId: newPost.id,
            duration,
            aspectRatio: "9:16"
          }
        });
      } else if (postType === 'SIMPLE' || postType === 'SIMPLE_TEXT') {
        await tx.simplePost.create({
          data: { postId: newPost.id }
        });
      } else if (postType === 'CHAN') {
        await tx.chan.create({
          data: {
            postId: newPost.id,
            channelName: body.channelName || "Untitled Channel",
            description: body.description,
            coverImageUrl: body.coverImageUrl,
            episodes: JSON.stringify(body.episodes || [])
          }
        });
      } else if (postType === 'FILL') {
        await tx.fill.create({
          data: {
            postId: newPost.id,
            duration: Number(body.duration) || 0
          }
        });
      } else if (postType === 'AUD') {
        await tx.aud.create({
          data: {
            postId: newPost.id,
            duration: Number(body.duration) || 0,
            title: body.title,
            artist: body.artist,
            coverImageUrl: body.coverImageUrl // if provided
          }
        });
      } else if (postType === 'XRAY') {
        await tx.xray.create({
          data: {
            postId: newPost.id,
            scratchPattern: 'RANDOM'
          }
        });
      }

      return newPost;
    }, {
      maxWait: 10000, // 10s wait for connection
      timeout: 20000  // 20s execution limit
    });

    return NextResponse.json(post);

  } catch (error: any) {
    // Error logged server-side for debugging
    return NextResponse.json(
      { error: "Failed to create post." },
      { status: 500 }
    );
  }
}

// Export POST with rate limiting
export const POST = postLimiter(postHandler);

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  const userId = user?.id;
  const { searchParams } = new URL(req.url);
  const scope = (searchParams.get("scope") ?? "public").toLowerCase();
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

  const where: any = {
    postType: { not: "STORY" }
  };

  // --- Scope Filtering on FeedItem ---
  if (scope === "me" && userId) {
    where.userId = userId;
  } else if (scope === "friends" && userId) {
    const friends = await prisma.friendship.findMany({
      where: { OR: [{ userId, status: "ACCEPTED" }, { friendId: userId, status: "ACCEPTED" }] },
      select: { userId: true, friendId: true }
    });
    const friendIds = friends.map(f => f.userId === userId ? f.friendId : f.userId);
    where.userId = { in: [...friendIds, userId] };
  } else if (scope === "bloom" && userId) {
    const subs = await prisma.subscription.findMany({
      where: { subscriberId: userId },
      select: { subscribedToId: true }
    });
    where.userId = { in: subs.map(s => s.subscribedToId) };
  }

  // Fetch from FeedItem (Result Set 1)
  const feedItems = await prisma.feedItem.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // --- Hydrate User State (LikedByMe) ---
  const postIds = feedItems.map((f: any) => f.postId);
  const myLikes = userId ? await prisma.postLike.findMany({
    where: { userId, postId: { in: postIds } },
    select: { postId: true }
  }) : [];
  const likedPostIds = new Set(myLikes.map(l => l.postId));

  // --- Fetch Real-Time Reaction Counts ---
  const allReactions = await prisma.reaction.groupBy({
    by: ['postId', 'type'],
    where: { postId: { in: postIds } },
    _count: { type: true }
  });

  const reactionMap: Record<string, { W: number; L: number; CAP: number }> = {};

  allReactions.forEach(r => {
    if (!reactionMap[r.postId]) {
      reactionMap[r.postId] = { W: 0, L: 0, CAP: 0 };
    }
    const type = r.type as keyof typeof reactionMap[string];
    if (reactionMap[r.postId][type] !== undefined) {
      reactionMap[r.postId][type] = r._count.type;
    }
  });

  // --- Transform to Frontend Format ---
  const transformed = feedItems.map((item: any) => {
    let media = [];
    try {
      media = item.mediaPreviews ? JSON.parse(item.mediaPreviews) : [];
    } catch (e) { }

    const realTimeCounts = reactionMap[item.postId] || { W: 0, L: 0, CAP: 0 };
    const totalLikes = Object.values(realTimeCounts).reduce((a: number, b: number) => a + b, 0);

    return {
      id: item.postId,
      userId: item.userId,
      feature: item.feature,
      postType: item.postType,
      content: item.contentSnippet,
      createdAt: item.createdAt,
      user: {
        id: item.userId,
        profile: {
          displayName: item.authorName,
          avatarUrl: item.authorAvatarUrl
        }
      },
      media: media,

      // Counts
      likes: totalLikes, // Override stored count with real-time sum
      comments: item.commentCount,
      shares: item.shareCount,

      // Reaction Details
      reactionCounts: realTimeCounts,

      // Context
      likedByMe: likedPostIds.has(item.postId),
      isSubscribed: false,

      // Synthesize specialized post type data
      ...synthesizePostData(
        {
          postId: item.postId,
          postType: item.postType,
          contentSnippet: item.contentSnippet,
          authorName: item.authorName
        },
        media
      ),
    };
  });

  return NextResponse.json(transformed);
}
