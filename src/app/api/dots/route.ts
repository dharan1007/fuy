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
        const category = searchParams.get('category'); // e.g., 'fills', 'lills', 'shots'

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
            userId,
            ...blockedByMe.map(b => b.blockedId),
            ...blockedMe.map(b => b.blockerId),
            ...mutedByMe.map(m => m.mutedUserId)
        ];

        // Define mapping for dot categories to database ENUM strings based on typical mappings
        const categoryMap: Record<string, string[]> = {
            'fills': ['PHOTO', 'ALBUM', 'TEXT'], // Fills = General media
            'lills': ['VIDEO'], // Lills = short videos like reels
            'auds': ['AUDIO'],
            'shots': ['PHOTO'] // if there's a strict boundary
        };

        const targetTypes = category ? categoryMap[category.toLowerCase()] : undefined;

        // 2. Fetch Candidate Posts explicitly filtered by postType requested
        const candidates = await prisma.post.findMany({
            where: {
                status: 'PUBLISHED',
                visibility: 'PUBLIC',
                userId: { notIn: excludedUserIds },
                ...(targetTypes && { postType: { in: targetTypes } }),
                createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Allow 30 days for dot categories to find enough
            },
            take: 150,
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
                    select: { media: { select: { id: true, type: true, url: true } } }
                    // Not taking just 1 here because Dots UI might need grid views
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

            // Dot specific categories (lills/fills) use a standard exploration multiplier 
            const score = await calculateDistributionScore(
                userId,
                distributionInput,
                postSlashes,
                prefs,
                userTags,
                timeHash,
                1.0
            );

            // Format for client grid/feed (return all media formatted)
            const media = post.postMedia.map(pm => {
                if (!pm.media) return null;
                return { type: pm.media.type, url: pm.media.url, thumbnailUrl: null };
            }).filter(Boolean);

            return {
                id: post.id,
                postType: post.postType,
                content: post.content,
                createdAt: post.createdAt,
                user: post.user,
                media: media,
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
        console.error("Error in dots feed API:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
