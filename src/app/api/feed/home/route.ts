import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { calculateDistributionScore, extractProfileTags, getUserSlashPreferences } from "@/lib/recommendation";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    console.log("[API/HomeFeed] Request received:", request.url);
    try {
        const user = await getSessionUser();
        console.log("[API/HomeFeed] Authenticated user:", user?.id);
        const userId = user?.id;

        if (!userId) {
            console.warn("[API/HomeFeed] Unauthorized access attempt.");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '15', 10);
        console.log(`[API/HomeFeed] User: ${userId} requested limit: ${limit}`);
        // We use an hour-based time hash to inject dynamic freshness safely per session
        const timeHash = Math.floor(Date.now() / (1000 * 60 * 60)).toString();

        // 1. Get User Preferences and Safety Exclusions
        console.log("[API/HomeFeed] Fetching preferences and tags...");
        const [prefs, profileTags] = await Promise.all([
            getUserSlashPreferences(userId),
            extractProfileTags(userId)
        ]);
        console.log("[API/HomeFeed] Preferences:", Object.keys(prefs).length, "ProfileTags keys:", Object.keys(profileTags));

        const userTags = [
            ...profileTags.values,
            ...profileTags.skills,
            ...profileTags.genres,
            ...profileTags.topics,
            ...profileTags.currentlyInto,
        ];

        const excludedUserIds = [
            userId // Exclude self from home feed
        ];

        const hiddenPostIds: string[] = [];

        // 2. Fetch Candidate Posts (Broad fetch)
        console.log("[API/HomeFeed] Fetching candidate posts from Prisma...");
        const candidates = await prisma.post.findMany({
            where: {
                status: 'PUBLISHED',
                visibility: 'PUBLIC',
                userId: { notIn: excludedUserIds },
                id: { notIn: hiddenPostIds },
                // We only want relatively recent posts for the home feed
                // createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            },
            take: 100, // Fetch up to 100 to score
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        trustScore: true,
                        profile: { select: { displayName: true, avatarUrl: true } }
                    }
                },
                postMedia: {
                    select: { media: { select: { id: true, type: true, url: true } } },
                    take: 1
                },
                slashes: { select: { tag: true } },
                _count: { select: { likes: true, comments: true } } // needed for engagement score
            },
            orderBy: { createdAt: 'desc' } // Initial sort by recency before mathematical ranking
        });

        // 3. Apply Mathematical Distribution Scoring
        const scoredPosts = await Promise.all(candidates.map(async (post) => {
            const postSlashes = post.slashes.map(s => s.tag);

            const distributionInput = {
                id: post.id,
                userId: post.userId,
                createdAt: post.createdAt,
                viewCount: post.viewCount,
                likes: post._count?.likes || 0,
                comments: post._count?.comments || 0,
                creatorTrustScore: post.user?.trustScore ?? 0.5
            };

            // Home feed uses a low exploration multiplier (0.5) to keep relevance high
            let score = await calculateDistributionScore(
                userId,
                distributionInput,
                postSlashes,
                prefs,
                userTags,
                timeHash,
                0.5
            );

            // Add random jitter (±20%) so pulling to refresh changes order slightly
            score = score * (0.8 + Math.random() * 0.4);

            // Format for client
            const media = post.postMedia?.[0]?.media;
            const thumbnail = media ? { type: media.type, url: media.url, thumbnailUrl: null } : null;

            return {
                id: post.id,
                postType: post.postType,
                content: post.content,
                createdAt: post.createdAt,
                user: post.user,
                media: thumbnail ? [thumbnail] : [],
                slashTags: postSlashes,
                score // Include score purely for diagnostic observation if needed
            };
        }));

        // 4. Sort strictly by calculated score and Return
        scoredPosts.sort((a, b) => b.score - a.score);

        // 5. Explicitly return the top requested limit
        const finalFeed = scoredPosts.slice(0, limit);

        return NextResponse.json({ posts: finalFeed }, {
            headers: { 'Cache-Control': 'private, no-cache' }
        });

    } catch (error: any) {
        console.error("Error in home feed API:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
