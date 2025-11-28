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
                audData: {
                    create: {
                        audioUrl,
                        duration: duration || 0,
                        waveformData: waveformData ? JSON.stringify(waveformData) : null,
                        coverImageUrl,
                        artist,
                        title,
                        genre,
                    },
                },
            },
            include: {
                audData: true,
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
        console.error('Aud creation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create audio post' },
            { status: 500 }
        );
    }
}
