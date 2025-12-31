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
        // This is a simplified version; for scale, use raw SQL or caching.
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
                media: true,
                slashes: true,
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                        shares: true, // Assuming relation exists, if not, use shareCount field
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
            score += (post.joyScore || 0) * 0.5;
            score += (post.connectionScore || 0) * 0.5;

            // Format for Frontend
            const mappedPost = {
                ...post,
                // Flatten counts for UI
                likesCount: post._count.likes,
                commentsCount: post._count.comments,
                sharesCount: post.shareCount || post._count.shares || 0, // Use cached or relation
                impressions: post.impressions || 0,
                // Add debug explanation
                matchReason: slashOverlap > 0 ? 'Similar Vibe' : (interestOverlap > 0 ? 'Based on your interests' : 'Trending')
            };

            return { post: mappedPost, score };
        });

        // Sort by score DESC
        const sorted = ranked.sort((a, b) => b.score - a.score).map(r => r.post).slice(0, limit);

        return NextResponse.json(sorted);

    } catch (error) {
        console.error('Similar Feed Error:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

