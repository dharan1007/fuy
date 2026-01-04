export const dynamic = 'force-dynamic';
// src/app/api/posts/chans/route.ts
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
            channelName,
            description,
            coverImageUrl,
            schedule, // array of {day, time, title}
            episodes, // array of {title, url, thumbnail, duration, publishedAt}
            status = 'PUBLISHED',
        } = body;

        if (!channelName) {
            return NextResponse.json(
                { error: 'Channel name is required' },
                { status: 400 }
            );
        }

        if (!episodes || !Array.isArray(episodes) || episodes.length === 0) {
            return NextResponse.json(
                { error: 'At least one episode is required' },
                { status: 400 }
            );
        }

        const post = await prisma.post.create({
            data: {
                userId,
                postType: 'CHAN',
                feature,
                content: content || description || '',
                visibility,
                status,
                chanData: {
                    create: {
                        channelName,
                        description,
                        coverImageUrl,
                        schedule: schedule ? JSON.stringify(schedule) : null,
                        episodes: JSON.stringify(episodes),
                    },
                },
                // Add cover image as media if exists
                ...(coverImageUrl ? {
                    postMedia: {
                        create: {
                            media: {
                                create: {
                                    userId,
                                    url: coverImageUrl,
                                    type: 'IMAGE',
                                }
                            }
                        }
                    }
                } : {})
            },
            include: {
                chanData: true,
                user: {
                    include: { profile: true },
                },
                postMedia: { include: { media: true } }
            },
        });

        // B. Create FeedItem (Denormalized)
        const mediaPreviews = coverImageUrl ? [{
            type: 'IMAGE',
            url: coverImageUrl,
            aspect: 16 / 9
        }] : [];

        await prisma.feedItem.create({
            data: {
                userId,
                postId: post.id,
                authorName: post.user.profile?.displayName || 'User',
                authorAvatarUrl: post.user.profile?.avatarUrl,
                postType: 'CHAN',
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
        console.error('Chan creation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create channel' },
            { status: 500 }
        );
    }
}
