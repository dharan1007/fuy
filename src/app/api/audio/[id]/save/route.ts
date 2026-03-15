/**
 * Audio Save/Unsave API
 * POST: Save an audio to user's collection
 * DELETE: Unsave an audio from user's collection
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

        const audioAsset = await prisma.audioAsset.findUnique({
            where: { id: params.id },
            select: { id: true, status: true },
        });

        if (!audioAsset || audioAsset.status !== 'ACTIVE') {
            return NextResponse.json({ error: 'Audio not found' }, { status: 404 });
        }

        // Upsert to prevent duplicate save errors
        await prisma.savedAudio.upsert({
            where: {
                userId_audioAssetId: {
                    userId: session.user.id,
                    audioAssetId: params.id,
                },
            },
            update: {}, // Already saved, no-op
            create: {
                userId: session.user.id,
                audioAssetId: params.id,
            },
        });

        return NextResponse.json({ success: true, saved: true });
    } catch (error) {
        console.error('Error saving audio:', error);
        return NextResponse.json({ error: 'Failed to save audio' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await prisma.savedAudio.deleteMany({
            where: {
                userId: session.user.id,
                audioAssetId: params.id,
            },
        });

        return NextResponse.json({ success: true, saved: false });
    } catch (error) {
        console.error('Error unsaving audio:', error);
        return NextResponse.json({ error: 'Failed to unsave audio' }, { status: 500 });
    }
}
