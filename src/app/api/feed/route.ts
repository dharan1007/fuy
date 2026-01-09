// src/app/api/feed/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { synthesizePostData } from "@/lib/post-synthesis";

export const revalidate = 60; // Cache for 60 seconds (ISR-like)

// Rate limit: 200 requests per minute per IP/User to prevent abuse while allowing high-traffic reading
const limiter = rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 500,
});

async function feedHandler(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const scope = (searchParams.get("scope") ?? "public").toLowerCase();

        // Only fetch user session if we need it for personalized scopes
        const user = (scope !== "public" || searchParams.get("includeLikes") === "true")
            ? await getSessionUser()
            : null;
        const userId = user?.id;

        const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
        const cursor = searchParams.get("cursor");

        const where: any = {};

        // --- Optimized Scope Filtering ---
        if (scope === "me" && userId) {
            where.userId = userId;
        } else if (scope === "following" && userId) {
            const following = await prisma.subscription.findMany({
                where: { subscriberId: userId },
                select: { subscribedToId: true }
            });
            where.userId = { in: following.map(f => f.subscribedToId) };
        } else if (scope === "friends" && userId) {
            const friends = await prisma.friendship.findMany({
                where: { OR: [{ userId, status: "ACCEPTED" }, { friendId: userId, status: "ACCEPTED" }] },
                select: { userId: true, friendId: true }
            });
            const friendIds = friends.map(f => f.userId === userId ? f.friendId : f.userId);
            where.userId = { in: [...friendIds, userId] };
        }

        // Fetch from FeedItem (Zero-Join Read)
        const feedItems = await prisma.feedItem.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
        });

        // --- Lightweight Hydration (Likes) ---
        // We only fetch for the current user's interaction
        const postIds = feedItems.map((f: any) => f.postId);
        const myLikes = userId ? await prisma.postLike.findMany({
            where: { userId, postId: { in: postIds } },
            select: { postId: true }
        }) : [];
        const likedPostIds = new Set(myLikes.map(l => l.postId));

        // --- Transform to Frontend Format ---
        const posts = feedItems.map((item: any) => {
            let media = [];
            try {
                media = item.mediaPreviews ? JSON.parse(item.mediaPreviews) : [];
            } catch (e) { }

            return {
                id: item.postId,
                userId: item.userId,
                postType: item.postType,
                feature: item.feature,
                content: item.contentSnippet,
                createdAt: item.createdAt,
                user: {
                    id: item.userId,
                    profile: {
                        displayName: item.authorName,
                        avatarUrl: item.authorAvatarUrl
                    }
                },
                media,
                likes: item.likeCount,
                comments: item.commentCount,
                shares: item.shareCount,
                likedByMe: likedPostIds.has(item.postId),

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

        const nextCursor = feedItems.length === limit ? feedItems[feedItems.length - 1].id : null;

        return NextResponse.json({
            posts,
            nextCursor
        });

    } catch (error: any) {
        console.error("Feed API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const GET = limiter(feedHandler);
