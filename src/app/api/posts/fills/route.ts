export const dynamic = 'force-dynamic';
// src/app/api/posts/fills/route.ts
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
            chapters, // array of {time, title}
            subtitlesUrl,
            quality = 'HD',
            status = 'PUBLISHED',
        } = body;

        if (!videoUrl) {
            return NextResponse.json(
                { error: 'Video URL is required' },
                { status: 400 }
            );
        }

        const post = await prisma.post.create({
            data: {
                userId,
                postType: 'FILL',
                feature,
                content: content || '',
                visibility,
                status,
                fillData: {
                    create: {
                        thumbnailUrl,
                        duration: duration || 0,
                        chapters: chapters ? JSON.stringify(chapters) : null,
                        subtitlesUrl,
                        quality,
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
                fillData: true,
                user: {
                    include: { profile: true },
                },
                postMedia: { include: { media: true } }
            },
        });

        // B. Create FeedItem (Denormalized) for fast-reads
        const mediaPreviews = [{
            type: 'VIDEO',
            url: videoUrl,
            aspect: 16 / 9
        }];

        await prisma.feedItem.create({
            data: {
                userId,
                postId: post.id,
                authorName: post.user.profile?.displayName || 'User',
                authorAvatarUrl: post.user.profile?.avatarUrl,
                postType: 'FILL',
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
        console.error('Fill creation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create fill' },
            { status: 500 }
        );
    }
}
