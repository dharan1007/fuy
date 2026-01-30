/**
 * Audio Use API - Use existing audio in a post
 * POST: Create an AudioUsage record and increment usage count
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            postId,
            startTime = 0,
            endTime = null,
            volume = 1.0,
            trackOrder = 0,
            videoVolume = 1.0,
            isMuted = false,
        } = body;

        if (!postId) {
            return NextResponse.json(
                { error: 'Post ID is required' },
                { status: 400 }
            );
        }

        // Check if audio asset exists and is reusable
        const audioAsset = await prisma.audioAsset.findUnique({
            where: { id: params.id },
            select: {
                id: true,
                status: true,
                isReusable: true,
                title: true,
                attributionText: true,
                duration: true,
                audioUrl: true,
                waveformData: true,
                originalCreator: {
                    select: {
                        id: true,
                        name: true,
                        profile: {
                            select: {
                                displayName: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },
            },
        });

        if (!audioAsset) {
            return NextResponse.json(
                { error: 'Audio asset not found' },
                { status: 404 }
            );
        }

        if (audioAsset.status !== 'ACTIVE') {
            return NextResponse.json(
                { error: 'Audio asset is not available' },
                { status: 403 }
            );
        }

        if (!audioAsset.isReusable) {
            return NextResponse.json(
                { error: 'This audio is not available for reuse' },
                { status: 403 }
            );
        }

        // Check if post exists and belongs to user
        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { id: true, userId: true },
        });

        if (!post) {
            return NextResponse.json(
                { error: 'Post not found' },
                { status: 404 }
            );
        }

        if (post.userId !== session.user.id) {
            return NextResponse.json(
                { error: 'You can only add audio to your own posts' },
                { status: 403 }
            );
        }

        // Create audio usage with upsert (update if track order exists)
        const audioUsage = await prisma.audioUsage.upsert({
            where: {
                postId_trackOrder: {
                    postId,
                    trackOrder,
                },
            },
            create: {
                audioAssetId: params.id,
                postId,
                startTime,
                endTime,
                volume,
                trackOrder,
                videoVolume,
                isMuted,
            },
            update: {
                audioAssetId: params.id,
                startTime,
                endTime,
                volume,
                videoVolume,
                isMuted,
            },
        });

        // Increment usage count
        await prisma.audioAsset.update({
            where: { id: params.id },
            data: { usageCount: { increment: 1 } },
        });

        return NextResponse.json({
            success: true,
            audioUsage,
            audioAsset: {
                id: audioAsset.id,
                title: audioAsset.title,
                attributionText: audioAsset.attributionText,
                duration: audioAsset.duration,
                audioUrl: audioAsset.audioUrl,
                waveformData: audioAsset.waveformData
                    ? JSON.parse(audioAsset.waveformData)
                    : null,
                originalCreator: audioAsset.originalCreator,
            },
        });
    } catch (error) {
        console.error('Error using audio:', error);
        return NextResponse.json(
            { error: 'Failed to use audio' },
            { status: 500 }
        );
    }
}

// DELETE - Remove audio from a post
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const postId = searchParams.get('postId');
        const trackOrder = parseInt(searchParams.get('trackOrder') || '0');

        if (!postId) {
            return NextResponse.json(
                { error: 'Post ID is required' },
                { status: 400 }
            );
        }

        // Check if post belongs to user
        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { userId: true },
        });

        if (!post || post.userId !== session.user.id) {
            return NextResponse.json(
                { error: 'Not authorized' },
                { status: 403 }
            );
        }

        // Delete the audio usage
        await prisma.audioUsage.delete({
            where: {
                postId_trackOrder: {
                    postId,
                    trackOrder,
                },
            },
        });

        // Decrement usage count
        await prisma.audioAsset.update({
            where: { id: params.id },
            data: { usageCount: { decrement: 1 } },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error removing audio:', error);
        return NextResponse.json(
            { error: 'Failed to remove audio' },
            { status: 500 }
        );
    }
}
