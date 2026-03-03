import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { calculateDistributionScore, calculateTagOverlap, extractProfileTags, getUserSlashPreferences } from "@/lib/recommendation";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const user = await getSessionUser();
        const userId = user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '15', 10);
        const sourcePostId = searchParams.get('sourceId');

        if (!sourcePostId) {
            return NextResponse.json({ error: "sourceId is required for Similar Vibes" }, { status: 400 });
        }

        // We use an hour-based time hash to inject dynamic freshness safely per session
        const timeHash = Math.floor(Date.now() / (1000 * 60 * 60)).toString();

        // 1. Get User Preferences and Safety Exclusions + Source Post Slashes
        const [prefs, profileTags, sourcePost] = await Promise.all([
            getUserSlashPreferences(userId),
            extractProfileTags(userId),
            prisma.post.findUnique({ where: { id: sourcePostId }, include: { slashes: { select: { tag: true } } } })
        ]);

        if (!sourcePost) {
            return NextResponse.json({ error: "Source post not found" }, { status: 404 });
        }

        const sourceSlashes = sourcePost.slashes.map(s => s.tag);

        const excludedUserIds: string[] = [];

        const hiddenPostIds = [];
        // Exclude the source post itself so we don't return it as a recommendation
        hiddenPostIds.push(sourcePostId);

        // 2. Fetch Candidate Posts that share AT LEAST ONE slash with the source post
        const candidates = await prisma.post.findMany({
            where: {
                status: 'PUBLISHED',
                visibility: 'PUBLIC',
                userId: { notIn: excludedUserIds },
                id: { notIn: hiddenPostIds },
                slashes: { some: { tag: { in: sourceSlashes } } } // The core requirement for "similarity"
            },
            take: 100,
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
                _count: { select: { likes: true, comments: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // 3. Apply Mathematical Distribution Scoring specifically tuned for Similarity
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

            // Calculate standard base score assuming exploration is standard
            const baseScore = await calculateDistributionScore(
                userId,
                distributionInput,
                postSlashes,
                prefs,
                [], // don't overlap with user's core tags for similarity, we care about source overlap
                timeHash,
                1.0
            );

            // *** CRITICAL SIMILARITY INJECTION ***
            // The score is fundamentally multiplied by how closely its slashes replicate the source post's slashes
            const similarityOverlap = calculateTagOverlap(sourceSlashes, postSlashes);

            // Posts with exact matching hashtags are exponentially boosted, while standard algorithmic rules still apply
            const similarityMatchedScore = baseScore * (1.0 + (similarityOverlap * 10));

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
                score: similarityMatchedScore
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
        console.error("Error in similar vibes feed API:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
