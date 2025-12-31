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
                        videoUrl,
                        thumbnailUrl,
                        duration: duration || 0,
                        chapters: chapters ? JSON.stringify(chapters) : null,
                        subtitlesUrl,
                        quality,
                    },
                },
            },
            include: {
                fillData: true,
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
        console.error('Fill creation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create fill' },
            { status: 500 }
        );
    }
}

