import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { userRateLimit } from '@/lib/rate-limit';

// Rate limit: 10 posts per hour
const limiter = userRateLimit({
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
    getUser: (req) => req.headers.get('x-user-id') // Or extract from session if needed, but here we strictly follow the wrapper pattern
});

async function createPostHandler(request: NextRequest) {
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
                            // videoUrl moved to PostMedia
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
                            // videoUrl moved to PostMedia
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
                            // topLayerUrl/Type moved to PostMedia
                            // bottomLayerUrl/Type moved to PostMedia
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
                            // audioUrl moved to PostMedia
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
                            linkedChapterId: chapterData.linkedChapterId,
                            linkedPostId: chapterData.linkedPostId,
                            orderIndex: chapterData.orderIndex || 0,
                        },
                    });
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
                // Standard post - nothing special
                break;
        }

        // UNIVERSAL MEDIA CREATION
        // This ensures FeedItems get populated with media previews for ALL post types
        if (mediaUrls && mediaUrls.length > 0) {
            await prisma.post.update({
                where: { id: post.id },
                data: {
                    postMedia: {
                        create: mediaUrls.slice(0, 10).map((url: string, i: number) => ({
                            media: {
                                create: {
                                    userId,
                                    url,
                                    type: mediaTypes?.[i] || 'IMAGE',
                                }
                            }
                        }))
                    }
                }
            });
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
                postMedia: { include: { media: true } },
                lillData: true,
                fillData: true,
                xrayData: true,
                audData: true,
                chanData: true,
                chapterData: true,
                pullUpDownData: true,
            },
        }) as any;

        if (completePost) {
            completePost.media = completePost.postMedia?.map((pm: any) => pm.media) || [];

            // B. Create FeedItem (Denormalized) for fast-reads
            const mediaPreviews = (completePost.postMedia || []).map((pm: any) => ({
                type: pm.media.type,
                url: pm.media.url,
                aspect: 1
            }));

            // If it's a LILL or FILL, we might want to ensure the video URL is in previews if not already in postMedia
            // (Though in the current schema migration, they SHOULD be in postMedia now)

            await prisma.feedItem.create({
                data: {
                    userId,
                    postId: completePost.id,
                    authorName: completePost.user.profile?.displayName || 'User',
                    authorAvatarUrl: completePost.user.profile?.avatarUrl,
                    postType: completePost.postType,
                    feature: completePost.feature || 'OTHER',
                    contentSnippet: (completePost.content || '').slice(0, 200),
                    mediaPreviews: JSON.stringify(mediaPreviews),
                    createdAt: completePost.createdAt,
                    likeCount: 0,
                    commentCount: 0,
                    shareCount: 0
                }
            });
        }

        return NextResponse.json({ success: true, post: completePost });
    } catch (error: any) {
        console.error('Create post error:', error);
        return NextResponse.json({ error: error.message || 'Failed to create post' }, { status: 500 });
    }
}

export const POST = limiter(createPostHandler);

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
                postMedia: { include: { media: true } },
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

        const formattedPosts = posts.map((p: any) => ({
            ...p,
            media: p.postMedia?.map((pm: any) => pm.media) || []
        }));

        return NextResponse.json({ posts: formattedPosts });
    } catch (error: any) {
        console.error('Get posts error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
