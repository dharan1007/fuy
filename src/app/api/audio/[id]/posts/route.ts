/**
 * Audio Posts API - Get posts using this audio
 * GET: Fetch all posts that use a specific audio asset with metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const sortBy = searchParams.get('sortBy') || 'recent'; // recent | popular

        const skip = (page - 1) * limit;

        // Check if audio asset exists
        const audioAsset = await prisma.audioAsset.findUnique({
            where: { id: params.id },
            select: { id: true, status: true },
        });

        if (!audioAsset) {
            return NextResponse.json(
                { error: 'Audio asset not found' },
                { status: 404 }
            );
        }

        // Build orderBy
        let orderBy: any = { createdAt: 'desc' };
        if (sortBy === 'popular') {
            orderBy = { post: { viewCount: 'desc' } };
        }

        // Get audio usages with post details
        const [usages, total] = await Promise.all([
            prisma.audioUsage.findMany({
                where: {
                    audioAssetId: params.id,
                    post: {
                        status: 'PUBLISHED',
                        visibility: 'PUBLIC',
                    },
                },
                orderBy,
                skip,
                take: limit,
                include: {
                    post: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    profile: {
                                        select: {
                                            displayName: true,
                                            avatarUrl: true,
                                        },
                                    },
                                },
                            },
                            postMedia: {
                                include: {
                                    media: {
                                        select: {
                                            id: true,
                                            url: true,
                                            type: true,
                                        },
                                    },
                                },
                                take: 1,
                            },
                            _count: {
                                select: {
                                    comments: true,
                                    reactions: true,
                                },
                            },
                        },
                    },
                },
            }),
            prisma.audioUsage.count({
                where: {
                    audioAssetId: params.id,
                    post: {
                        status: 'PUBLISHED',
                        visibility: 'PUBLIC',
                    },
                },
            }),
        ]);

        const posts = usages.map((usage) => ({
            id: usage.post.id,
            content: usage.post.content,
            postType: usage.post.postType,
            createdAt: usage.post.createdAt,
            viewCount: usage.post.viewCount,
            shareCount: usage.post.shareCount,
            user: usage.post.user,
            thumbnail: usage.post.postMedia[0]?.media?.url || null,
            mediaType: usage.post.postMedia[0]?.media?.type || null,
            audioUsage: {
                startTime: usage.startTime,
                endTime: usage.endTime,
                volume: usage.volume,
                trackOrder: usage.trackOrder,
            },
            _count: usage.post._count,
        }));

        return NextResponse.json({
            posts,
            audioAssetId: params.id,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching posts for audio:', error);
        return NextResponse.json(
            { error: 'Failed to fetch posts' },
            { status: 500 }
        );
    }
}
