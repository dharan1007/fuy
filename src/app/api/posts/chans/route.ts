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
                chanData: {
                    create: {
                        channelName,
                        description,
                        coverImageUrl,
                        schedule: schedule ? JSON.stringify(schedule) : null,
                        episodes: JSON.stringify(episodes),
                    },
                },
            },
            include: {
                chanData: true,
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
        console.error('Chan creation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create channel' },
            { status: 500 }
        );
    }
}
