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
            options, // Array of { text, specialDetails, uniqueDetails, taggedUserId }
            expiresAt,
            status = 'PUBLISHED', // PUBLISHED | DRAFT
        } = body;

        // Basic Validation
        if (!question && status === 'PUBLISHED') {
            return NextResponse.json({ error: 'Question is required' }, { status: 400 });
        }

        // Ensure options exist if published, or at least empty array if draft
        const optionsList = Array.isArray(options) ? options : [];

        if (status === 'PUBLISHED' && optionsList.length < 2) {
            return NextResponse.json({ error: 'At least 2 options are required for published polls' }, { status: 400 });
        }

        const post = await prisma.post.create({
            data: {
                userId,
                postType: 'PULLUPDOWN',
                feature,
                content: content || question || 'Untitled Draft',
                visibility,
                status,
                pullUpDownData: {
                    create: {
                        question: question || '',
                        expiresAt: expiresAt ? new Date(expiresAt) : null,
                        options: {
                            create: optionsList.map((opt: any) => ({
                                text: opt.text || '',
                                specialDetails: opt.specialDetails,
                                uniqueDetails: opt.uniqueDetails,
                                taggedUserId: opt.taggedUserId || null,
                                tagStatus: opt.taggedUserId ? 'PENDING' : 'ACCEPTED' // Auto-accept if no user tagged
                            }))
                        }
                    },
                },
            },
            include: {
                pullUpDownData: {
                    include: {
                        options: {
                            include: {
                                taggedUser: { select: { id: true, profile: { select: { displayName: true } } } }
                            }
                        },
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

// Update a draft or post
export async function PUT(req: NextRequest) {
    try {
        const userId = await requireUserId();
        const body = await req.json();

        const {
            id, // Post ID
            content,
            visibility,
            question,
            options,
            status
        } = body;

        if (!id) {
            return NextResponse.json({ error: 'Post ID required' }, { status: 400 });
        }

        // Verify ownership
        const existingPost = await prisma.post.findUnique({
            where: { id },
            include: { pullUpDownData: true }
        });

        if (!existingPost || existingPost.userId !== userId) {
            return NextResponse.json({ error: 'Post not found or unauthorized' }, { status: 404 });
        }

        // Update Post
        const updatedPost = await prisma.post.update({
            where: { id },
            data: {
                content: content || question,
                visibility,
                status,
                pullUpDownData: {
                    update: {
                        question,
                        // Replace options methodology: Delete all, create new
                        options: {
                            deleteMany: {},
                            create: options.map((opt: any) => ({
                                text: opt.text || '',
                                specialDetails: opt.specialDetails,
                                uniqueDetails: opt.uniqueDetails,
                                taggedUserId: opt.taggedUserId || null,
                                tagStatus: opt.taggedUserId ? 'PENDING' : 'ACCEPTED'
                            }))
                        }
                    }
                }
            },
            include: {
                pullUpDownData: {
                    include: {
                        options: true
                    }
                }
            }
        });

        return NextResponse.json(updatedPost);

    } catch (error: any) {
        console.error('PullUpDown update error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update poll' },
            { status: 500 }
        );
    }
}

// Vote on a poll
export async function PATCH(req: NextRequest) {
    try {
        const userId = await requireUserId();
        const body = await req.json();
        const { pullUpDownId, optionId } = body;

        if (!pullUpDownId || !optionId) {
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
            // Optional: Allow changing vote? For now, block.
            return NextResponse.json(
                { error: 'You have already voted' },
                { status: 400 }
            );
        }

        // Verify option belongs to poll
        const option = await prisma.pullUpDownOption.findUnique({
            where: { id: optionId }
        });

        if (!option || option.pullUpDownId !== pullUpDownId) {
            return NextResponse.json({ error: 'Invalid option' }, { status: 400 });
        }

        // Create vote and increment count transaction
        const [newVote, updatedOption] = await prisma.$transaction([
            prisma.pullUpDownVote.create({
                data: {
                    pullUpDownId,
                    userId,
                    optionId,
                },
            }),
            prisma.pullUpDownOption.update({
                where: { id: optionId },
                data: {
                    voteCount: { increment: 1 }
                }
            }),
        ]);

        // Return full updated poll data
        const updatedPoll = await prisma.pullUpDown.findUnique({
            where: { id: pullUpDownId },
            include: {
                options: true,
                votes: {
                    where: { userId }
                }
            }
        });

        return NextResponse.json(updatedPoll);
    } catch (error: any) {
        console.error('Vote error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to vote' },
            { status: 500 }
        );
    }
}
