export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
    // 1. Auth & Input Validation
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!postId) {
        return new NextResponse('Missing postId', { status: 400 });
    }

    try {
        // 2. Fetch Source Post & User Profile
        const sourcePost = await prisma.post.findUnique({
            where: { id: postId },
            include: { slashes: true, user: true }
        });

        if (!sourcePost) {
            return new NextResponse('Post not found', { status: 404 });
        }

        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { profile: true }
        });

        const sourceSlashes = sourcePost.slashes.map(s => s.tag);
        const userInterests = [
            ...(currentUser?.profile?.currentlyInto || []),
            ...(currentUser?.profile?.interactionTopics || [])
        ];

        // 3. Find "Slash Twins" - Users who post with similar slashes
        const similarSlashPosts = await prisma.post.findMany({
            where: {
                id: { not: postId },
                slashes: {
                    some: {
                        tag: { in: sourceSlashes }
                    }
                },
                visibility: 'PUBLIC'
            },
            select: { userId: true },
            take: 50
        });

        const slashTwinUserIds = Array.from(new Set(similarSlashPosts.map(p => p.userId)));

        // 4. Query Candidates
        const candidates = await prisma.post.findMany({
            where: {
                id: { not: postId }, // Exclude source
                visibility: 'PUBLIC',
                postType: { not: 'CHAN' },
                OR: [
                    // A. Match Slashes
                    {
                        slashes: {
                            some: {
                                tag: { in: sourceSlashes }
                            }
                        }
                    },
                    // B. From Slash Twins (Recent)
                    {
                        userId: { in: slashTwinUserIds },
                        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
                    },
                    // C. Match User Interests (Fallback)
                    {
                        slashes: {
                            some: {
                                tag: { in: userInterests }
                            }
                        }
                    }
                ]
            },
            include: {
                user: {
                    include: {
                        profile: {
                            select: { displayName: true, avatarUrl: true }
                        }
                    }
                },
                postMedia: { include: { media: true } },
                slashes: true,
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                        shares: true,
                        reactions: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100 // Fetch pool then rank
        });

        // 5. Ranking Algorithm
        const ranked = candidates.map((post: any) => {
            let score = 0;

            // Overlap Score: How many slashes match source?
            const postTags = post.slashes.map((s: { tag: string }) => s.tag);
            const slashOverlap = postTags.filter((t: string) => sourceSlashes.includes(t)).length;
            score += slashOverlap * 10;

            // Interest Score: How many slashes match user interests?
            const interestOverlap = postTags.filter((t: string) => userInterests.includes(t)).length;
            score += interestOverlap * 5;

            // Twin Bonus
            if (slashTwinUserIds.includes(post.userId)) score += 15;

            // Engagement Bonus
            score += (post.connectionScore || 0) * 0.5;

            // Format for Frontend
            const media = post.postMedia?.map((pm: any) => pm.media) || [];
            const mappedPost = {
                ...post,
                media,
                // Flatten counts for UI
                likesCount: post._count.likes,
                commentsCount: post._count.comments,
                sharesCount: post.shareCount || post._count.shares || 0,
                impressions: post.impressions || 0,
                // Add debug explanation
                matchReason: slashOverlap > 0 ? 'Similar Vibe' : (interestOverlap > 0 ? 'Based on your interests' : 'Trending'),

                // Synthesize xrayData if XRAY post
                xrayData: post.postType === 'XRAY' ? {
                    id: post.id,
                    topLayerUrl: media.find((m: any) => m.variant === 'xray-top')?.url || media[0]?.url || '',
                    topLayerType: media.find((m: any) => m.variant === 'xray-top')?.type || 'IMAGE',
                    bottomLayerUrl: media.find((m: any) => m.variant === 'xray-bottom')?.url || media[1]?.url || '',
                    bottomLayerType: media.find((m: any) => m.variant === 'xray-bottom')?.type || 'IMAGE',
                } : undefined
            };

            return { post: mappedPost, score };
        });

        // Sort by score DESC
        let sorted = ranked.sort((a, b) => b.score - a.score).map(r => r.post).slice(0, limit);

        // FALLBACK: If we don't have enough "Similar" posts, fill with Trending/Recent
        if (sorted.length < limit) {
            const needed = limit - sorted.length;
            const existingIds = [postId, ...sorted.map(p => p.id)];

            const fallbackPosts = await prisma.post.findMany({
                where: {
                    id: { notIn: existingIds },
                    visibility: 'PUBLIC',
                    postType: { not: 'CHAN' },
                    status: 'PUBLISHED'
                },
                take: needed,
                orderBy: [
                    // Mix of Recency and Popularity could be good, but let's just do Recency for "Discovery"
                    // or we can do popularity. Let's do Recency to ensure fresh content.
                    { createdAt: 'desc' }
                ],
                include: {
                    user: {
                        include: {
                            profile: {
                                select: { displayName: true, avatarUrl: true }
                            }
                        }
                    },
                    postMedia: { include: { media: true } },
                    slashes: true,
                    _count: {
                        select: {
                            likes: true,
                            comments: true,
                            shares: true,
                            reactions: true
                        }
                    }
                }
            });

            const mappedFallback = fallbackPosts.map((post: any) => {
                const media = post.postMedia?.map((pm: any) => pm.media) || [];
                return {
                    ...post,
                    media,
                    likesCount: post._count.likes,
                    commentsCount: post._count.comments,
                    sharesCount: post.shareCount || post._count.shares || 0,
                    impressions: post.impressions || 0,
                    matchReason: 'Discovery', // Reason for fallback

                    // Synthesize xrayData if XRAY post
                    xrayData: post.postType === 'XRAY' ? {
                        id: post.id,
                        topLayerUrl: media.find((m: any) => m.variant === 'xray-top')?.url || media[0]?.url || '',
                        topLayerType: media.find((m: any) => m.variant === 'xray-top')?.type || 'IMAGE',
                        bottomLayerUrl: media.find((m: any) => m.variant === 'xray-bottom')?.url || media[1]?.url || '',
                        bottomLayerType: media.find((m: any) => m.variant === 'xray-bottom')?.type || 'IMAGE',
                    } : undefined
                };
            });

            sorted = [...sorted, ...mappedFallback];
        }

        return NextResponse.json(sorted);

    } catch (error) {
        console.error('Similar Feed Error:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
