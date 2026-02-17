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
    // Hide specialized types from main feed if needed, similar to original logic
    postType: { notIn: ["STORY", "CLOCK"] },
    status: "PUBLISHED"
  };

  // --- Scope Filtering ---
  if (scope === "public") {
    where.visibility = "PUBLIC";
  } else if (scope === "me" && userId) {
    where.userId = userId;
  } else if (scope === "friends" && userId) {
    where.visibility = { in: ["PUBLIC", "FRIENDS"] };
    const friends = await prisma.friendship.findMany({
      where: {
        OR: [{ userId, status: "ACCEPTED" }, { friendId: userId, status: "ACCEPTED" }]
      },
      select: { userId: true, friendId: true }
    });
    const friendIds = friends.map(f => f.userId === userId ? f.friendId : f.userId);
    where.userId = { in: [...friendIds, userId] };
  } else if (scope === "bloom" && userId) {
    // Bloom scope - strictly people I subscribe to
    const subs = await prisma.subscription.findMany({
      where: { subscriberId: userId },
      select: { subscribedToId: true }
    });
    where.userId = { in: subs.map(s => s.subscribedToId) };
  }

  // --- Safety Filtering (Block/Mute/Hidden) ---
  if (userId) {
    const [blocked, blockedBy, muted, hidden] = await Promise.all([
      prisma.blockedUser.findMany({ where: { blockerId: userId }, select: { blockedId: true } }),
      prisma.blockedUser.findMany({ where: { blockedId: userId }, select: { blockerId: true } }),
      prisma.mutedUser.findMany({ where: { muterId: userId }, select: { mutedUserId: true } }),
      prisma.hiddenPost.findMany({ where: { userId }, select: { postId: true } })
    ]);

    const excludedUserIds = [
      ...blocked.map(b => b.blockedId),
      ...blockedBy.map(b => b.blockerId),
      ...muted.map(m => m.mutedUserId)
    ];

    const hiddenPostIds = hidden.map(h => h.postId);

    if (excludedUserIds.length > 0) {
      where.userId = { ...where.userId, notIn: excludedUserIds };
    }
    if (hiddenPostIds.length > 0) {
      where.id = { notIn: hiddenPostIds };
    }
  }

  // --- Fetch Posts from Canonical 'Post' Table ---
  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          isHumanVerified: true,
          profile: {
            select: {
              displayName: true,
              avatarUrl: true,
              location: true
            }
          }
        }
      },
      // Relations for media and specialized data
      postMedia: {
        include: {
          media: true
        },
        orderBy: {
          orderIndex: 'asc'
        }
      },
      lillData: true,
      fillData: true,
      chanData: true,
      audData: true,
      xrayData: true,
      simpleData: true,

      // Engagement
      _count: {
        select: {
          likes: true,
          comments: true,
          shares: true
        }
      },
      // Check if liked by me
      likes: userId ? {
        where: { userId },
        select: { id: true }
      } : false,

      // Top bubbles
      reactionBubbles: {
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              profile: { select: { avatarUrl: true, displayName: true } }
            }
          }
        }
      }
    }
  });

  // --- Fetch Real-Time Reaction Counts (Granular W/L/CAP) ---
  const postIds = posts.map(p => p.id);
  const allReactions = await prisma.reaction.groupBy({
    by: ['postId', 'type'],
    where: { postId: { in: postIds } },
    _count: { type: true }
  });

  const reactionMap: Record<string, { W: number; L: number; CAP: number }> = {};
  allReactions.forEach(r => {
    if (!reactionMap[r.postId]) reactionMap[r.postId] = { W: 0, L: 0, CAP: 0 };
    const type = r.type as keyof typeof reactionMap[string];
    if (reactionMap[r.postId][type] !== undefined) {
      reactionMap[r.postId][type] = r._count.type;
    }
  });

  // --- Transform to Frontend Format ---
  const transformed = posts.map((post) => {
    // 1. Process Media
    // Map PostMedia -> MediaPreview format expected by frontend
    const media = post.postMedia.map(pm => ({
      type: pm.media.type, // IMAGE, VIDEO, AUDIO
      url: pm.media.url,
      variant: pm.media.variant || undefined,
      thumbnailUrl: undefined // Could map from variant if needed
    }));

    // 2. Synthesize Data (using helper or inline)
    const realTimeCounts = reactionMap[post.id] || { W: 0, L: 0, CAP: 0 };
    const totalLikes = Object.values(realTimeCounts).reduce((a, b) => a + b, 0);

    const synthesized = synthesizePostData(
      {
        postId: post.id,
        postType: post.postType,
        contentSnippet: post.content,
        authorName: post.user.profile?.displayName || 'User'
      },
      media
    );

    return {
      id: post.id,
      userId: post.userId,
      feature: post.feature,
      postType: post.postType,
      content: post.content,
      createdAt: post.createdAt,
      user: {
        id: post.user.id,
        email: post.user.email,
        profile: post.user.profile
      },
      media: media,

      // Counts
      likes: totalLikes > 0 ? totalLikes : post._count.likes,
      comments: post._count.comments,
      shares: post.shareCount || post._count.shares,

      // Reaction Details
      reactionCounts: realTimeCounts,

      // Context
      likedByMe: post.likes && post.likes.length > 0,
      isSubscribed: false, // Need subscription check if critical, else skip for list view

      // Bubbles
      topBubbles: post.reactionBubbles,
      totalBubbles: 0, // Need separate count if important

      // Specialized Data
      ...synthesized,
      // Manual overrides if synthesize doesn't cover everything from joined tables
      lillData: post.lillData ? { ...synthesized.lillData, ...post.lillData } : synthesized.lillData,
      fillData: post.fillData ? { ...synthesized.fillData, ...post.fillData } : synthesized.fillData,
      chanData: post.chanData ? { ...synthesized.chanData, ...post.chanData } : synthesized.chanData,
      xrayData: post.xrayData ? { ...synthesized.xrayData, ...post.xrayData } : synthesized.xrayData,
    };
  });

  return NextResponse.json(transformed);
}
