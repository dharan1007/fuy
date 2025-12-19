
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
                simpleData: {
                    create: {
                        mediaUrls: JSON.stringify(mediaUrls),
                        mediaTypes: JSON.stringify(mediaTypes),
                    },
                },
            },
            include: {
                simpleData: true,
                user: {
                    select: {
                        id: true,
                        profile: { select: { displayName: true, avatarUrl: true } },
                    },
                },
            },
        });

        return NextResponse.json(post);
    } catch (error: any) {
        console.error('Simple post creation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create post' },
            { status: 500 }
        );
    }
}
