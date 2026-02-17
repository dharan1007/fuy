
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getUserSlashPreferences, calculateTagOverlap, extractProfileTags } from "@/lib/recommendation";

export const dynamic = 'force-dynamic';

// In-memory cache for better performance
let cachedData: any = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30000; // 30 seconds cache

export async function GET() {
    try {
        const user = await getSessionUser();
        const userId = user?.id;

        // Return cached data for non-authenticated users
        if (!userId && cachedData && Date.now() - cacheTimestamp < CACHE_TTL) {
            return NextResponse.json(cachedData, {
                headers: {
                    'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
                }
            });
        }

        // Get user preferences for personalization
        let slashPrefs: Record<string, number> = {};
        let userTags: string[] = [];

        // --- Safety Filtering ---
        let excludedUserIds: string[] = [];
        let hiddenPostIds: string[] = [];

        if (userId) {
            const [prefs, profileTags, blocked, blockedBy, muted, hidden] = await Promise.all([
                getUserSlashPreferences(userId),
                extractProfileTags(userId),
                prisma.blockedUser.findMany({ where: { blockerId: userId }, select: { blockedId: true } }),
                prisma.blockedUser.findMany({ where: { blockedId: userId }, select: { blockerId: true } }),
                prisma.mutedUser.findMany({ where: { muterId: userId }, select: { mutedUserId: true } }),
                prisma.hiddenPost.findMany({ where: { userId }, select: { postId: true } })
            ]);
            slashPrefs = prefs;
            userTags = [
                ...profileTags.values,
                ...profileTags.skills,
                ...profileTags.genres,
                ...profileTags.currentlyInto,
            ];

            excludedUserIds = [
                ...blocked.map(b => b.blockedId),
                ...blockedBy.map(b => b.blockerId),
                ...muted.map(m => m.mutedUserId)
            ];
            hiddenPostIds = hidden.map(h => h.postId);
        }

        // Optimized fetch - lean queries with minimal includes
        const fetchByType = async (type?: string, limit = 15) => {
            const where: any = { status: 'PUBLISHED', visibility: 'PUBLIC' };

            if (type) {
                where.postType = type;
            } else {
                where.postType = { notIn: ['STORY', 'CHAN', 'XRAY'] };
            }

            // Safety Filtering
            if (excludedUserIds.length > 0) {
                where.userId = { notIn: excludedUserIds };
            }
            if (hiddenPostIds.length > 0) {
                where.id = { notIn: hiddenPostIds };
            }

            // Lean include - only essential fields
            const include: any = {
                postMedia: {
                    select: {
                        media: {
                            select: { id: true, type: true, url: true }
                        }
                    },
                    take: 1 // Only first media for preview
                },
                user: {
                    select: {
                        id: true,
                        profile: {
                            select: { displayName: true, avatarUrl: true }
                        }
                    }
                },
                slashes: { select: { tag: true }, take: 5 },
                _count: { select: { likes: true, comments: true } }
            };

            // Type-specific includes (minimal)
            if (type === 'CHAN') {
                include.chanData = {
                    select: {
                        id: true,
                        channelName: true,
                        coverImageUrl: true,
                        isLive: true,
                        watchingCount: true
                    }
                };
            }
            if (type === 'PULLUPDOWN') {
                include.pullUpDownData = {
                    select: {
                        question: true,
                        options: { select: { id: true, text: true } }
                    }
                };
            }
            if (type === 'CHAPTER') include.chapterData = { select: { title: true } };
            if (type === 'XRAY') include.xrayData = { select: { topLayerUrl: true } };
            if (type === 'LILL') include.lillData = { select: { coverImageUrl: true, thumbnailUrl: true, videoUrl: true } };
            if (type === 'FILL') include.fillData = { select: { coverImageUrl: true, thumbnailUrl: true, videoUrl: true } };
            if (type === 'AUD') include.audData = { select: { coverImageUrl: true, audioUrl: true, title: true } };

            const posts = await prisma.post.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                include,
                take: limit // Direct limit, no over-fetch
            });

            // Fast normalize media
            return posts.map((post: any) => {
                const media = post.postMedia?.[0]?.media;
                let thumbnail = media ? { type: media.type, url: media.url, thumbnailUrl: null } : null;

                // Type-specific thumbnail fallbacks
                if (!thumbnail) {
                    if (post.lillData?.coverImageUrl) thumbnail = { type: 'IMAGE', url: post.lillData.coverImageUrl, thumbnailUrl: null };
                    else if (post.fillData?.coverImageUrl) thumbnail = { type: 'IMAGE', url: post.fillData.coverImageUrl, thumbnailUrl: null };
                    else if (post.audData?.coverImageUrl) thumbnail = { type: 'IMAGE', url: post.audData.coverImageUrl, thumbnailUrl: null };
                    else if (post.chanData?.coverImageUrl) thumbnail = { type: 'IMAGE', url: post.chanData.coverImageUrl, thumbnailUrl: null };
                    else if (post.xrayData?.topLayerUrl) thumbnail = { type: 'IMAGE', url: post.xrayData.topLayerUrl, thumbnailUrl: null };
                }

                // Simple score for logged-in users
                let recoScore = 0;
                if (userId) {
                    const postSlashes = post.slashes?.map((s: any) => s.tag) || [];
                    for (const tag of postSlashes) {
                        recoScore += slashPrefs[tag] || 0;
                    }
                    recoScore += (post._count.likes + post._count.comments) / 20;
                }

                return {
                    id: post.id,
                    postType: post.postType,
                    content: post.content?.substring(0, 100), // Truncate content
                    createdAt: post.createdAt,
                    user: post.user,
                    media: thumbnail ? [thumbnail] : [],
                    slashTags: post.slashes?.map((s: any) => s.tag) || [],
                    likeCount: post._count.likes,
                    commentCount: post._count.comments,
                    recoScore,
                    // Type-specific data
                    ...(post.chanData && { chanData: post.chanData }),
                    ...(post.pullUpDownData && {
                        question: post.pullUpDownData.question,
                        options: post.pullUpDownData.options
                    }),
                    ...(post.chapterData && { title: post.chapterData.title }),
                    ...(post.lillData && { lillData: post.lillData }),
                    ...(post.fillData && { fillData: post.fillData }),
                    ...(post.audData && { audData: post.audData }),
                    ...(post.xrayData && { xrayData: post.xrayData }),
                };
            }).sort((a: any, b: any) => b.recoScore - a.recoScore);
        };

        // Reduced parallel queries - fetch only what's needed
        const [main, chans, lills, fills, auds, chapters, puds, texts] = await Promise.all([
            fetchByType(undefined, 25), // Reduced from 40
            fetchByType('CHAN', 12),    // Reduced from 20
            fetchByType('LILL', 12),
            fetchByType('FILL', 12),
            fetchByType('AUD', 12),
            fetchByType('CHAPTER', 12),
            fetchByType('PULLUPDOWN', 12),
            fetchByType('SIMPLE_TEXT', 12),
        ]);

        const responseData = { main, chans, lills, fills, auds, chapters, puds, texts };

        // Cache for non-authenticated requests
        if (!userId) {
            cachedData = responseData;
            cacheTimestamp = Date.now();
        }

        return NextResponse.json(responseData, {
            headers: {
                'Cache-Control': userId
                    ? 'private, no-cache'
                    : 'public, s-maxage=30, stale-while-revalidate=60',
            }
        });

    } catch (error: any) {
        console.error("Error in explore summary API:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
