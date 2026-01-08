// src/app/api/reco/feed/route.ts
// Ranked feed using recommendation brain with personalized scoring

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import {
    extractProfileTags,
    getUserSlashPreferences,
    calculateTagOverlap,
    hasHardNoConflict,
    logRecoFeedback
} from "@/lib/recommendation";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);
        const cursor = searchParams.get("cursor");

        const user = await getSessionUser();
        const userId = user?.id;

        if (!userId) {
            // Return public trending posts for non-logged users
            const publicPosts = await prisma.post.findMany({
                where: { visibility: 'PUBLIC', moderationStatus: 'CLEAN' },
                orderBy: [
                    { viewCount: 'desc' },
                    { createdAt: 'desc' }
                ],
                take: limit,
                include: {
                    user: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } },
                    postMedia: { include: { media: true }, orderBy: { orderIndex: 'asc' } },
                    slashes: { select: { tag: true } },
                    _count: { select: { likes: true, comments: true } }
                }
            });

            return NextResponse.json({
                posts: formatPosts(publicPosts, new Set(), {}),
                nextCursor: null
            });
        }

        // Get user preferences
        const [profileTags, slashPrefs] = await Promise.all([
            extractProfileTags(userId),
            getUserSlashPreferences(userId)
        ]);

        const allUserTags = [
            ...profileTags.values,
            ...profileTags.skills,
            ...profileTags.genres,
            ...profileTags.topics,
            ...profileTags.currentlyInto,
        ];

        // Get user's friends for social boost
        const friendships = await prisma.friendship.findMany({
            where: {
                OR: [{ userId, status: 'ACCEPTED' }, { friendId: userId, status: 'ACCEPTED' }]
            },
            select: { userId: true, friendId: true }
        });
        const friendIds = new Set(friendships.flatMap(f => [f.userId, f.friendId]));
        friendIds.delete(userId);

        // Get subscriptions
        const subscriptions = await prisma.subscription.findMany({
            where: { subscriberId: userId },
            select: { subscribedToId: true }
        });
        const subscribedIds = new Set(subscriptions.map(s => s.subscribedToId));

        // Get candidate posts
        const candidates = await prisma.post.findMany({
            where: {
                OR: [
                    { visibility: 'PUBLIC' },
                    { userId: { in: Array.from(friendIds) } },
                    { userId: { in: Array.from(subscribedIds) } },
                ],
                moderationStatus: 'CLEAN',
                userId: { not: userId }
            },
            orderBy: { createdAt: 'desc' },
            take: 100, // Fetch more than needed for scoring
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            include: {
                user: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } },
                postMedia: { include: { media: true }, orderBy: { orderIndex: 'asc' } },
                slashes: { select: { tag: true } },
                _count: { select: { likes: true, comments: true } }
            }
        });

        // Score each post
        const scored = candidates.map(post => {
            const postSlashes = post.slashes.map(s => s.tag);
            let score = 0;

            // Check hard no conflicts - strongly demote
            if (hasHardNoConflict(postSlashes, profileTags.hardNos)) {
                score -= 20;
            }

            // Slash preference score
            for (const tag of postSlashes) {
                score += slashPrefs[tag] || 0;
            }

            // Tag overlap with user profile
            score += calculateTagOverlap(allUserTags, postSlashes) * 8;

            // Friend content boost
            if (friendIds.has(post.userId)) {
                score += 4;
            }

            // Subscribed content boost
            if (subscribedIds.has(post.userId)) {
                score += 6;
            }

            // Engagement signal
            const engagementRatio = (post._count.likes + post._count.comments * 2) /
                Math.max(post.viewCount || 1, 1);
            score += Math.min(engagementRatio * 3, 5);

            // Freshness decay (prefer newer content)
            const ageHours = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
            const freshnessBoost = Math.max(0, 5 - (ageHours / 24)); // Decays over days
            score += freshnessBoost;

            return { post, score };
        });

        // Sort by score
        scored.sort((a, b) => b.score - a.score);

        // Take top results
        const topPosts = scored.slice(0, limit);

        // Get user's likes for likedByMe flag
        const postIds = topPosts.map(p => p.post.id);
        const myLikes = await prisma.postLike.findMany({
            where: { userId, postId: { in: postIds } },
            select: { postId: true }
        });
        const likedPostIds = new Set(myLikes.map(l => l.postId));

        // Build score context for transparency
        const scoreContext: Record<string, { score: number; reasons: string[] }> = {};
        for (const { post, score } of topPosts) {
            const reasons: string[] = [];
            if (friendIds.has(post.userId)) reasons.push('From a friend');
            if (subscribedIds.has(post.userId)) reasons.push('From someone you follow');
            const postSlashes = post.slashes.map(s => s.tag);
            if (postSlashes.some(s => slashPrefs[s] > 0)) reasons.push('Matches your interests');
            if (reasons.length === 0) reasons.push('Trending content');

            scoreContext[post.id] = { score: Math.round(score * 10) / 10, reasons };
        }

        const nextCursor = topPosts.length === limit ? topPosts[topPosts.length - 1].post.id : null;

        return NextResponse.json({
            posts: formatPosts(topPosts.map(p => p.post), likedPostIds, scoreContext),
            nextCursor
        });

    } catch (error: any) {
        console.error("Reco Feed Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

function formatPosts(posts: any[], likedPostIds: Set<string>, scoreContext: Record<string, any>) {
    return posts.map(post => {
        const media = post.postMedia?.map((pm: any) => ({
            type: pm.media.type,
            url: pm.media.url,
            aspectRatio: pm.media.width && pm.media.height
                ? pm.media.width / pm.media.height
                : 1
        })) || [];

        return {
            id: post.id,
            userId: post.userId,
            postType: post.postType,
            feature: post.feature,
            content: post.content,
            createdAt: post.createdAt,
            user: {
                id: post.user?.id,
                profile: post.user?.profile
            },
            media,
            likes: post._count?.likes || 0,
            comments: post._count?.comments || 0,
            likedByMe: likedPostIds.has(post.id),
            slashes: post.slashes?.map((s: any) => s.tag) || [],
            // Recommendation context
            recoScore: scoreContext[post.id]?.score,
            recoReasons: scoreContext[post.id]?.reasons,
        };
    });
}
