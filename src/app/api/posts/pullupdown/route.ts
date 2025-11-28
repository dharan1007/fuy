// src/app/api/posts/pullupdown/route.ts
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
            question,
            optionA,
            optionB,
            expiresAt,
        } = body;

        if (!question || !optionA || !optionB) {
            return NextResponse.json(
                { error: 'Question and both options are required' },
                { status: 400 }
            );
        }

        const post = await prisma.post.create({
            data: {
                userId,
                postType: 'PULLUPDOWN',
                feature,
                content: content || question,
                visibility,
                pullUpDownData: {
                    create: {
                        question,
                        optionA,
                        optionB,
                        expiresAt: expiresAt ? new Date(expiresAt) : null,
                    },
                },
            },
            include: {
                pullUpDownData: {
                    include: {
                        votes: true,
                    },
                },
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
        console.error('PullUpDown creation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create poll' },
            { status: 500 }
        );
    }
}

// Vote on a poll
export async function PATCH(req: NextRequest) {
    try {
        const userId = await requireUserId();
        const body = await req.json();
        const { pullUpDownId, vote } = body;

        if (!pullUpDownId || !vote || !['A', 'B'].includes(vote)) {
            return NextResponse.json(
                { error: 'Invalid vote data' },
                { status: 400 }
            );
        }

        // Check if user already voted
        const existingVote = await prisma.pullUpDownVote.findUnique({
            where: {
                pullUpDownId_userId: {
                    pullUpDownId,
                    userId,
                },
            },
        });

        if (existingVote) {
            return NextResponse.json(
                { error: 'You have already voted' },
                { status: 400 }
            );
        }

        // Create vote and update counts
        const [newVote, updatedPoll] = await prisma.$transaction([
            prisma.pullUpDownVote.create({
                data: {
                    pullUpDownId,
                    userId,
                    vote,
                },
            }),
            prisma.pullUpDown.update({
                where: { id: pullUpDownId },
                data: {
                    ...(vote === 'A'
                        ? { optionACount: { increment: 1 } }
                        : { optionBCount: { increment: 1 } }),
                },
                include: {
                    votes: true,
                },
            }),
        ]);

        return NextResponse.json(updatedPoll);
    } catch (error: any) {
        console.error('Vote error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to vote' },
            { status: 500 }
        );
    }
}
