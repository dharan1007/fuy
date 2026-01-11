
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getUserSlashPreferences, calculateTagOverlap, extractProfileTags } from "@/lib/recommendation";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const user = await getSessionUser();
        const userId = user?.id;

        // Get user preferences for personalization
        let slashPrefs: Record<string, number> = {};
        let userTags: string[] = [];

        if (userId) {
            const [prefs, profileTags] = await Promise.all([
                getUserSlashPreferences(userId),
                extractProfileTags(userId)
            ]);
            slashPrefs = prefs;
            userTags = [
                ...profileTags.values,
                ...profileTags.skills,
                ...profileTags.genres,
                ...profileTags.currentlyInto,
            ];
        }

        // Helper to fetch posts by type
        const fetchByType = async (type?: string, limit = 20) => {
            const where: any = { status: 'PUBLISHED' };
            if (type) {
                where.postType = type;
            } else {
                where.postType = { notIn: ['STORY', 'CHAN', 'XRAY'] };
            }
            where.visibility = 'PUBLIC';

            const include: any = {
                postMedia: {
                    include: {
                        media: true
                    }
                },
                user: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } },
                slashes: { select: { tag: true } },
                _count: { select: { likes: true, comments: true, reactionBubbles: true, shares: true } }
            };

            if (type === 'CHAN') {
                include.chanData = {
                    include: {
                        shows: {
                            include: {
                                episodes: {
                                    orderBy: { createdAt: 'desc' },
                                    take: 1
                                }
                            },
                            orderBy: { createdAt: 'desc' },
                            take: 1
                        }
                    }
                };
            }
            if (type === 'PULLUPDOWN') {
                include.pullUpDownData = {
                    include: {
                        options: true,
                        votes: userId ? { where: { userId }, select: { optionId: true } } : false
                    }
                };
            }
            if (type === 'CHAPTER') include.chapterData = true;
            if (type === 'XRAY') include.xrayData = true;
            if (type === 'SIMPLE') include.simpleData = true;
            if (type === 'LILL') include.lillData = true;
            if (type === 'FILL') include.fillData = true;
            if (type === 'AUD') include.audData = true;

            const posts = await prisma.post.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                include,
                take: limit * 2 // Fetch more to score and filter
            });

            // Normalize media and score posts
            const normalized = posts.map((post: any) => {
                const normalizedMedia = post.postMedia?.map((pm: any) => pm.media) || [];

                // LILL: Add cover image or video
                if (post.lillData?.coverImageUrl) {
                    normalizedMedia.unshift({
                        id: `lill-cover-${post.id}`,
                        type: 'IMAGE',
                        url: post.lillData.coverImageUrl,
                        feature: 'LILL'
                    });
                }
                if (post.lillData?.videoUrl) {
                    normalizedMedia.push({
                        id: `lill-${post.id}`,
                        type: 'VIDEO',
                        url: post.lillData.videoUrl,
                        thumbnailUrl: post.lillData.thumbnailUrl || post.lillData.coverImageUrl,
                        feature: 'LILL'
                    });
                }

                // FILL: Add cover image or video
                if (post.fillData?.coverImageUrl) {
                    normalizedMedia.unshift({
                        id: `fill-cover-${post.id}`,
                        type: 'IMAGE',
                        url: post.fillData.coverImageUrl,
                        feature: 'FILL'
                    });
                }
                if (post.fillData?.videoUrl) {
                    normalizedMedia.push({
                        id: `fill-${post.id}`,
                        type: 'VIDEO',
                        url: post.fillData.videoUrl,
                        thumbnailUrl: post.fillData.thumbnailUrl || post.fillData.coverImageUrl,
                        feature: 'FILL'
                    });
                }

                // AUD: audio with cover
                if (post.audData?.audioUrl) {
                    normalizedMedia.push({
                        id: `aud-${post.id}`,
                        type: 'AUDIO',
                        url: post.audData.audioUrl,
                        coverImageUrl: post.audData.coverImageUrl,
                        feature: 'AUD'
                    });
                }

                // CHAN: cover
                if (post.chanData?.coverImageUrl) {
                    normalizedMedia.push({
                        id: `chan-${post.id}`,
                        type: 'IMAGE',
                        url: post.chanData.coverImageUrl,
                        feature: 'CHAN'
                    });
                } else if (post.chanData?.shows?.[0]?.episodes?.[0]?.coverUrl) {
                    normalizedMedia.push({
                        id: `chan-ep-${post.id}`,
                        type: 'IMAGE',
                        url: post.chanData.shows[0].episodes[0].coverUrl,
                        feature: 'CHAN'
                    });
                } else if (post.user?.profile?.avatarUrl) {
                    normalizedMedia.push({
                        id: `chan-user-${post.id}`,
                        type: 'IMAGE',
                        url: post.user.profile.avatarUrl,
                        feature: 'CHAN'
                    });
                }

                // XRAY: top layer
                if (post.xrayData?.topLayerUrl) {
                    normalizedMedia.push({
                        id: `xray-${post.id}`,
                        type: 'IMAGE',
                        url: post.xrayData.topLayerUrl,
                        feature: 'XRAY'
                    });
                }

                // Calculate recommendation score
                let recoScore = 0;
                const postSlashes = post.slashes?.map((s: any) => s.tag) || [];

                // Slash preference matching
                for (const tag of postSlashes) {
                    recoScore += slashPrefs[tag] || 0;
                }

                // Profile tag overlap
                if (userTags.length > 0) {
                    recoScore += calculateTagOverlap(userTags, postSlashes) * 5;
                }

                // Engagement boost
                const engagementScore = (post._count.likes + post._count.comments * 2) / 10;
                recoScore += Math.min(engagementScore, 3);

                // Extract userVote for PullUpDown
                let userVote = null;
                if (post.postType === 'PULLUPDOWN' && post.pullUpDownData?.votes?.length > 0) {
                    userVote = post.pullUpDownData.votes[0].optionId;
                }

                return {
                    ...post,
                    media: normalizedMedia,
                    recoScore: Math.round(recoScore * 100) / 100,
                    slashTags: postSlashes,
                    userVote // For PullUpDown posts
                };
            });

            // Sort by recommendation score if user is logged in
            if (userId) {
                normalized.sort((a: any, b: any) => b.recoScore - a.recoScore);
            }

            return normalized.slice(0, limit);
        };

        const [main, chans, lills, fills, auds, chapters, xrays, puds, texts] = await Promise.all([
            fetchByType(undefined, 40),
            fetchByType('CHAN', 20),
            fetchByType('LILL', 20),
            fetchByType('FILL', 20),
            fetchByType('AUD', 20),
            fetchByType('CHAPTER', 20),
            fetchByType('XRAY', 20),
            fetchByType('PULLUPDOWN', 20),
            fetchByType('SIMPLE_TEXT', 20),
        ]);

        return NextResponse.json({
            main,
            chans,
            lills,
            fills,
            auds,
            chapters,
            xrays,
            puds,
            texts
        });

    } catch (error: any) {
        console.error("Error in explore summary API:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
