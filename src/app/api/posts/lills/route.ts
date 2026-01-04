export const dynamic = 'force-dynamic';
// src/app/api/posts/lills/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/session';

export async function POST(req: NextRequest) {
    try {
        const userId = await requireUserId();
        const body = await req.json();

        const {
            content,
            visibility = 'PUBLIC',
            feature = 'OTHER',
            videoUrl,
            thumbnailUrl,
            duration,
            musicUrl,
            musicTitle,
            filters,
            status = 'PUBLISHED',
        } = body;

        if (!videoUrl) {
            return NextResponse.json(
                { error: 'Video URL is required' },
                { status: 400 }
            );
        }

        if (duration && duration > 60) {
            return NextResponse.json(
                { error: 'Lills must be 60 seconds or less' },
                { status: 400 }
            );
        }

        const post = await prisma.post.create({
            data: {
                userId,
                postType: 'LILL',
                feature,
                content: content || '',
                visibility,
                status,
                lillData: {
                    create: {
                        thumbnailUrl,
                        duration: duration || 0,
                        musicUrl,
                        musicTitle,
                        filters: filters ? JSON.stringify(filters) : null,
                    },
                },
                // Add media record via PostMedia
                postMedia: {
                    create: {
                        media: {
                            create: {
                                userId,
                                url: videoUrl,
                                type: 'VIDEO',
                            }
                        }
                    }
                }
            },
            include: {
                lillData: true,
                user: {
                    include: { profile: true },
                },
                postMedia: { include: { media: true } }
            },
        });

        // B. Create FeedItem (Denormalized)
        const mediaPreviews = [{
            type: 'VIDEO',
            url: videoUrl,
            thumbnailUrl,
            aspect: 9 / 16
        }];

        await prisma.feedItem.create({
            data: {
                userId,
                postId: post.id,
                authorName: post.user.profile?.displayName || 'User',
                authorAvatarUrl: post.user.profile?.avatarUrl,
                postType: 'LILL',
                feature: feature || 'OTHER',
                contentSnippet: (post.content || '').slice(0, 200),
                mediaPreviews: JSON.stringify(mediaPreviews),
                createdAt: post.createdAt,
                likeCount: 0,
                commentCount: 0,
                shareCount: 0
            }
        });

        return NextResponse.json(post);
    } catch (error: any) {
        console.error('Lill creation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create lill' },
            { status: 500 }
        );
    }
}
