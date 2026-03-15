import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { calculateDistributionScore, extractProfileTags, getUserSlashPreferences } from "@/lib/recommendation";

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
        // We use an hour-based time hash to inject dynamic freshness safely per session
        const timeHash = Math.floor(Date.now() / (1000 * 60 * 60)).toString();

        // 1. Get User Preferences and Safety Exclusions
        const [prefs, profileTags] = await Promise.all([
            getUserSlashPreferences(userId),
            extractProfileTags(userId)
        ]);

        const userTags = [
            ...profileTags.values,
            ...profileTags.skills,
            ...profileTags.genres,
            ...profileTags.topics,
            ...profileTags.currentlyInto,
        ];

        // Fetch safety exclusions (Blocked and Muted Users)
        const [blockedByMe, blockedMe, mutedByMe] = await Promise.all([
            prisma.blockedUser.findMany({ where: { blockerId: userId }, select: { blockedId: true } }),
            prisma.blockedUser.findMany({ where: { blockedId: userId }, select: { blockerId: true } }),
            prisma.mutedUser.findMany({ where: { muterId: userId }, select: { mutedUserId: true } })
        ]);

        const excludedUserIds = [
            userId, // Exclude self from explore feed
            ...blockedByMe.map(b => b.blockedId),
            ...blockedMe.map(b => b.blockerId),
            ...mutedByMe.map(m => m.mutedUserId)
        ];

        // 2. Fetch Candidate Posts (Broader fetch for exploration)
        const candidates = await prisma.post.findMany({
            where: {
                status: 'PUBLISHED',
                visibility: 'PUBLIC',
                userId: { notIn: excludedUserIds },
                // Explore can look back further (14 days) to find hidden gems
                // createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
            },
            take: 200, // Fetch up to 200 out of which we mathematics select the best limit
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

            // EXPLORE feed uses a HIGHER exploration multiplier (3.0 vs 0.5 for Home)
            // This injects mathematical drift to introduce adjacent content and untrusted/new creators
            let score = await calculateDistributionScore(
                userId,
                distributionInput,
                postSlashes,
                prefs,
                userTags,
                timeHash,
                3.0
            );

            // Add HIGH random jitter (0.5x to 1.5x) to strongly shuffle explore feed on every refresh
            score = score * (0.5 + Math.random() * 1.0);

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
                score
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
        console.error("Error in explore feed API:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
