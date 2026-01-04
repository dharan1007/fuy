export const dynamic = 'force-dynamic';
// src/app/api/posts/auds/route.ts
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
            audioUrl,
            duration,
            waveformData,
            coverImageUrl,
            artist,
            title,
            genre,
            status = 'PUBLISHED',
        } = body;

        if (!audioUrl) {
            return NextResponse.json(
                { error: 'Audio URL is required' },
                { status: 400 }
            );
        }

        const post = await prisma.post.create({
            data: {
                userId,
                postType: 'AUD',
                feature,
                content: content || title || '',
                visibility,
                status,
                audData: {
                    create: {
                        duration: duration || 0,
                        waveformData: waveformData ? JSON.stringify(waveformData) : null,
                        coverImageUrl,
                        artist,
                        title,
                        genre,
                    },
                },
                // Media will be added in a separate update step to ensure relation correctness
            },
            include: {
                audData: true,
                user: {
                    include: { profile: true },
                },
            },
        });

        // Add media record via Post update
        await prisma.post.update({
            where: { id: post.id },
            data: {
                postMedia: {
                    create: {
                        media: {
                            create: {
                                userId,
                                url: audioUrl,
                                type: 'AUDIO',
                            }
                        }
                    }
                }
            }
        });

        // Fetch complete post for FeedItem creation and response
        const completePost = await prisma.post.findUnique({
            where: { id: post.id },
            include: {
                audData: true,
                user: {
                    include: { profile: true },
                },
                postMedia: { include: { media: true } }
            }
        }) as any;

        if (completePost) {
            // B. Create FeedItem (Denormalized)
            const mediaPreviews = [{
                type: 'AUDIO',
                url: audioUrl,
                aspect: 1
            }];

            await prisma.feedItem.create({
                data: {
                    userId,
                    postId: completePost.id,
                    authorName: completePost.user.profile?.displayName || 'User',
                    authorAvatarUrl: completePost.user.profile?.avatarUrl,
                    postType: 'AUD',
                    feature: feature || 'OTHER',
                    contentSnippet: (completePost.content || '').slice(0, 200),
                    mediaPreviews: JSON.stringify(mediaPreviews),
                    createdAt: completePost.createdAt,
                    likeCount: 0,
                    commentCount: 0,
                    shareCount: 0
                }
            });
        }

        return NextResponse.json(completePost);
    } catch (error: any) {
        console.error('Aud creation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create audio post' },
            { status: 500 }
        );
    }
}
