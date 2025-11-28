// src/app/api/posts/chapters/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/session';

export async function POST(req: NextRequest) {
    try {
        const userId = await requireUserId();
        const body = await req.json();

        const {
            title,
            description,
            content,
            visibility = 'PUBLIC',
            feature = 'OTHER',
            linkedChapterId,
            linkedPostId,
            mediaUrls, // array of URLs
            mediaTypes, // array of types
        } = body;

        if (!mediaUrls || !Array.isArray(mediaUrls) || mediaUrls.length === 0) {
            return NextResponse.json(
                { error: 'At least one media item is required for chapters' },
                { status: 400 }
            );
        }

        // Create post with chapter data
        const post = await prisma.post.create({
            data: {
                userId,
                postType: 'CHAPTER',
                feature,
                content: content || description || '',
                visibility,
                chapterData: {
                    create: {
                        title,
                        description,
                        linkedChapterId,
                        linkedPostId,
                        mediaUrls: JSON.stringify(mediaUrls),
                        mediaTypes: JSON.stringify(mediaTypes || mediaUrls.map(() => 'IMAGE')),
                    },
                },
            },
            include: {
                chapterData: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        profile: { select: { displayName: true, avatarUrl: true } },
                    },
                },
            },
        });

        return NextResponse.json(post);
    } catch (error: any) {
        console.error('Chapter creation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create chapter' },
            { status: 500 }
        );
    }
}
