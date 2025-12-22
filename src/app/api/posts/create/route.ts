import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            userId,
            postType,
            content,
            visibility = 'PUBLIC',
            // Type-specific data
            lillData,
            fillData,
            xrayData,

            audData,
            chanData,
            chapterData,
            pullUpDownData,
            // Media for general posts
            mediaUrls,
            mediaTypes,
        } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // Content Moderation check
        let moderationStatus = "CLEAN";
        let moderationReason = null;
        let finalVisibility = visibility;

        if (content) {
            const { analyzeContent } = await import("@/lib/moderation");
            const analysis = analyzeContent(content);
            if (analysis.flagged) {
                moderationStatus = "REMOVED";
                moderationReason = analysis.reason;
                finalVisibility = "PRIVATE"; // Hide from public
            }
        }

        // Create the post
        const post = await prisma.post.create({
            data: {
                userId,
                postType: postType || 'STANDARD',
                content: content || '',
                visibility: finalVisibility,
                moderationStatus,
                moderationReason,
            },
        });

        // If moderated, notify the user
        if (moderationStatus === "REMOVED") {
            await prisma.notification.create({
                data: {
                    userId,
                    type: "SYSTEM",
                    message: `Your post was removed because it violated our community guidelines: ${moderationReason || "Inappropriate content"}`,
                    postId: post.id,
                },
            });
        }

        // Create type-specific data based on postType
        switch (postType) {
            case 'LILL':
                if (lillData) {
                    await prisma.lill.create({
                        data: {
                            postId: post.id,
                            videoUrl: lillData.videoUrl,
                            duration: Math.min(lillData.duration || 60, 60), // Max 60 seconds
                            thumbnailUrl: lillData.thumbnailUrl || lillData.thumbnail,
                            aspectRatio: lillData.aspectRatio || '9:16',
                            musicUrl: lillData.musicUrl,
                            musicTitle: lillData.musicTitle,
                            filters: lillData.filters,
                        },
                    });
                }
                break;

            case 'FILL':
                if (fillData) {
                    await prisma.fill.create({
                        data: {
                            postId: post.id,
                            videoUrl: fillData.videoUrl,
                            duration: Math.min(fillData.duration || 0, 18000), // Max 5 hours
                            thumbnailUrl: fillData.thumbnailUrl || fillData.thumbnail,
                            aspectRatio: fillData.aspectRatio || '16:9',
                            chapters: fillData.chapters,
                            subtitlesUrl: fillData.subtitlesUrl,
                            quality: fillData.quality || 'HD',
                        },
                    });
                }
                break;

            case 'XRAY':
                if (xrayData) {
                    await prisma.xray.create({
                        data: {
                            postId: post.id,
                            topLayerUrl: xrayData.topLayerUrl || xrayData.beforeUrl,
                            topLayerType: xrayData.topLayerType || 'IMAGE',
                            bottomLayerUrl: xrayData.bottomLayerUrl || xrayData.afterUrl,
                            bottomLayerType: xrayData.bottomLayerType || 'IMAGE',
                            scratchPattern: xrayData.scratchPattern || xrayData.revealType || 'RANDOM',
                            revealPercent: xrayData.revealPercent || 0,
                        },
                    });
                }
                break;



            case 'AUD':
                if (audData) {
                    await prisma.aud.create({
                        data: {
                            postId: post.id,
                            audioUrl: audData.audioUrl,
                            duration: audData.duration || 0,
                            coverImageUrl: audData.coverImageUrl || audData.coverImage,
                            waveformData: audData.waveformData,
                            artist: audData.artist,
                            title: audData.title,
                            genre: audData.genre,
                        },
                    });
                }
                break;

            case 'CHAN':
                if (chanData) {
                    await prisma.chan.create({
                        data: {
                            postId: post.id,
                            channelName: chanData.channelName,
                            description: chanData.description,
                            coverImageUrl: chanData.coverImageUrl || chanData.thumbnail,
                            schedule: chanData.schedule,
                            isLive: chanData.isLive || false,
                            liveUrl: chanData.liveUrl,
                            episodes: chanData.episodes || JSON.stringify([{
                                title: chanData.episodeTitle || 'Episode 1',
                                url: chanData.videoUrl,
                                thumbnail: chanData.thumbnail,
                                duration: chanData.duration || 0,
                                publishedAt: new Date().toISOString(),
                            }]),
                        },
                    });
                }
                break;

            case 'CHAPTER':
                if (chapterData) {
                    await prisma.chapter.create({
                        data: {
                            postId: post.id,
                            title: chapterData.title || 'Untitled',
                            description: chapterData.description || '',
                            mediaUrls: JSON.stringify(mediaUrls || []),
                            mediaTypes: JSON.stringify(mediaTypes || []),
                            linkedChapterId: chapterData.linkedChapterId,
                            linkedPostId: chapterData.linkedPostId,
                            orderIndex: chapterData.orderIndex || 0,
                        },
                    });
                }
                // Also handle media for chapters
                if (mediaUrls && mediaUrls.length > 0) {
                    const mediaToCreate = mediaUrls.slice(0, 10).map((url: string, i: number) => ({
                        postId: post.id,
                        userId,
                        url,
                        type: mediaTypes?.[i] || 'IMAGE',
                    }));
                    await prisma.media.createMany({ data: mediaToCreate });
                }
                break;

            case 'PULLUPDOWN':
                if (pullUpDownData) {
                    await prisma.pullUpDown.create({
                        data: {
                            postId: post.id,
                            question: pullUpDownData.question,
                            allowMultiple: pullUpDownData.allowMultiple || false,
                            expiresAt: pullUpDownData.expiresAt,
                            options: {
                                create: [
                                    { text: pullUpDownData.optionA },
                                    { text: pullUpDownData.optionB }
                                ]
                            }
                        },
                    });
                }
                break;

            default:
                // Standard post - just create media if provided
                if (mediaUrls && mediaUrls.length > 0) {
                    const mediaToCreate = mediaUrls.map((url: string, i: number) => ({
                        postId: post.id,
                        userId,
                        url,
                        type: mediaTypes?.[i] || 'IMAGE',
                    }));
                    await prisma.media.createMany({ data: mediaToCreate });
                }
        }

        // Fetch the complete post with relations
        const completePost = await prisma.post.findUnique({
            where: { id: post.id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        profile: { select: { avatarUrl: true } },
                    },
                },
                media: true,
                lillData: true,
                fillData: true,
                xrayData: true,

                audData: true,
                chanData: true,
                chapterData: true,
                pullUpDownData: true,
            },
        });

        return NextResponse.json({ success: true, post: completePost });
    } catch (error: any) {
        console.error('Create post error:', error);
        return NextResponse.json({ error: error.message || 'Failed to create post' }, { status: 500 });
    }
}

// GET all posts (for dots page)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const postType = searchParams.get('type');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');

        const where: any = { visibility: 'PUBLIC' };
        if (postType && postType !== 'mix') {
            // Map category to postType
            const typeMap: Record<string, string> = {
                lills: 'LILL',
                fills: 'FILL',
                auds: 'AUD',
                channels: 'CHAN',
                chapters: 'CHAPTER',
                xrays: 'XRAY',
                pupds: 'PULLUPDOWN',

            };
            if (typeMap[postType]) {
                where.postType = typeMap[postType];
            }
        }

        const posts = await prisma.post.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        profile: { select: { avatarUrl: true } },
                    },
                },
                media: true,
                lillData: true,
                fillData: true,
                xrayData: true,

                audData: true,
                chanData: true,
                chapterData: true,
                pullUpDownData: true,
                _count: {
                    select: { likes: true, comments: true },
                },
            },
        });

        return NextResponse.json({ posts });
    } catch (error: any) {
        console.error('Get posts error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
