
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const user = await getSessionUser();
        const userId = user?.id;

        // Helper to fetch posts by type
        const fetchByType = async (type?: string, limit = 20) => {
            const where: any = { status: 'PUBLISHED' };
            if (type) {
                where.postType = type;
            } else {
                where.postType = { notIn: ['STORY', 'CHAN'] };
            }
            where.visibility = 'PUBLIC';

            const include: any = {
                postMedia: {
                    include: {
                        media: true
                    }
                },
                user: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } },
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
            if (type === 'PULLUPDOWN') include.pullUpDownData = { include: { options: true } };
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
                take: limit
            });

            // Normalize media for specialized post types
            return posts.map((post: any) => {
                const normalizedMedia = post.postMedia?.map((pm: any) => pm.media) || [];

                // LILL: video
                if (post.lillData?.videoUrl) {
                    normalizedMedia.push({
                        id: `lill-${post.id}`,
                        type: 'VIDEO',
                        url: post.lillData.videoUrl,
                        thumbnailUrl: post.lillData.thumbnailUrl,
                        feature: 'LILL'
                    });
                }

                // FILL: video
                if (post.fillData?.videoUrl) {
                    normalizedMedia.push({
                        id: `fill-${post.id}`,
                        type: 'VIDEO',
                        url: post.fillData.videoUrl,
                        thumbnailUrl: post.fillData.thumbnailUrl,
                        feature: 'FILL'
                    });
                }

                // AUD: audio
                if (post.audData?.audioUrl) {
                    normalizedMedia.push({
                        id: `aud-${post.id}`,
                        type: 'AUDIO',
                        url: post.audData.audioUrl,
                        coverImageUrl: post.audData.coverImageUrl,
                        feature: 'AUD'
                    });
                }

                // CHAN: cover (for preview)
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

                return {
                    ...post,
                    media: normalizedMedia
                };
            });
        };

        const [main, chans, lills, fills, auds, chapters, xrays, puds] = await Promise.all([
            fetchByType(undefined, 40),
            fetchByType('CHAN', 20),
            fetchByType('LILL', 20),
            fetchByType('FILL', 20),
            fetchByType('AUD', 20),
            fetchByType('CHAPTER', 20),
            fetchByType('XRAY', 20),
            fetchByType('PULLUPDOWN', 20),
        ]);

        return NextResponse.json({
            main,
            chans,
            lills,
            fills,
            auds,
            chapters,
            xrays,
            puds
        });

    } catch (error: any) {
        console.error("Error in explore summary API:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
