export const dynamic = 'force-dynamic';

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
            mediaUrls, // Array of strings
            mediaTypes, // Array of 'IMAGE' | 'VIDEO'
            status = 'PUBLISHED', // New field for drafts
        } = body;

        if (!mediaUrls || !Array.isArray(mediaUrls)) {
            return NextResponse.json(
                { error: 'Media URLs array is required' },
                { status: 400 }
            );
        }

        if (mediaUrls.length > 8) {
            return NextResponse.json(
                { error: 'Maximum 8 media items allowed' },
                { status: 400 }
            );
        }

        if (!mediaTypes || !Array.isArray(mediaTypes) || mediaTypes.length !== mediaUrls.length) {
            return NextResponse.json(
                { error: 'Media types must match media URLs' },
                { status: 400 }
            );
        }

        const post = await prisma.post.create({
            data: {
                userId,
                postType: 'SIMPLE',
                feature,
                content: content || '',
                visibility,
                status, // Use the provided status
                simpleData: {
                    create: {
                        // mediaUrls and mediaTypes moved to PostMedia
                    },
                } as any,
                // postMedia will be added via update
            },
            include: {
                simpleData: true,
                user: {
                    include: { profile: true },
                },
                // postMedia: { include: { media: true } } // Fetch later
            },
        });

        // Add media entries via update
        await prisma.post.update({
            where: { id: post.id },
            data: {
                postMedia: {
                    create: (mediaUrls || []).map((url: string, index: number) => ({
                        media: {
                            create: {
                                url,
                                type: (mediaTypes || [])[index] || 'IMAGE',
                                userId
                            }
                        }
                    }))
                }
            } as any
        });

        // Fetch complete with media
        const completePost = await prisma.post.findUnique({
            where: { id: post.id },
            include: {
                simpleData: true,
                user: {
                    include: { profile: true },
                },
                postMedia: { include: { media: true } }
            } as any
        }) as any;

        // B. Create FeedItem (Denormalized)
        const mediaPreviews = (mediaUrls || []).map((url: string, i: number) => ({
            type: (mediaTypes || [])[i] || 'IMAGE',
            url,
            aspect: 1
        }));

        if (completePost) {
            await (prisma as any).feedItem.create({
                data: {
                    userId,
                    postId: completePost.id,
                    authorName: completePost.user.profile?.displayName || 'User',
                    authorAvatarUrl: completePost.user.profile?.avatarUrl,
                    postType: 'SIMPLE',
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
        console.error('Simple post creation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create post' },
            { status: 500 }
        );
    }
}
