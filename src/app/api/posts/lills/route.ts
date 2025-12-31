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
                        videoUrl,
                        thumbnailUrl,
                        duration: duration || 0,
                        musicUrl,
                        musicTitle,
                        filters: filters ? JSON.stringify(filters) : null,
                    },
                },
            },
            include: {
                lillData: true,
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
        console.error('Lill creation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create lill' },
            { status: 500 }
        );
    }
}

