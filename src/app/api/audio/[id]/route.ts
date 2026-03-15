/**
 * Audio Detail API - Get single audio asset
 * GET: Fetch audio asset details with metadata and save status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        const audioAsset = await prisma.audioAsset.findUnique({
            where: { id: params.id },
            include: {
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
                fingerprints: {
                    select: {
                        tempoSignature: true,
                        keySignature: true,
                    },
                    take: 1,
                },
                _count: {
                    select: {
                        usages: true,
                        savedBy: true,
                    },
                },
            },
        });

        if (!audioAsset) {
            return NextResponse.json({ error: 'Audio asset not found' }, { status: 404 });
        }

        if (audioAsset.status !== 'ACTIVE') {
            return NextResponse.json({ error: 'Audio asset is not available' }, { status: 403 });
        }

        // Check if current user has saved this audio
        let isSaved = false;
        if (userId) {
            const saved = await prisma.savedAudio.findUnique({
                where: {
                    userId_audioAssetId: {
                        userId,
                        audioAssetId: params.id,
                    },
                },
            });
            isSaved = !!saved;
        }

        const creatorName =
            audioAsset.originalCreator?.profile?.displayName ||
            audioAsset.originalCreator?.name ||
            'Unknown';

        const musicalInfo = audioAsset.fingerprints.length > 0
            ? {
                tempo: audioAsset.fingerprints[0].tempoSignature,
                key: audioAsset.fingerprints[0].keySignature,
            }
            : null;

        return NextResponse.json({
            audioAsset: {
                id: audioAsset.id,
                title: audioAsset.title || 'Original audio',
                attributionText: audioAsset.attributionText || `Original audio by @${creatorName}`,
                duration: audioAsset.duration,
                genre: audioAsset.genre,
                audioUrl: audioAsset.url,
                waveformData: audioAsset.waveformData
                    ? JSON.parse(audioAsset.waveformData)
                    : null,
                coverImageUrl: audioAsset.coverImageUrl,
                usageCount: audioAsset._count.usages,
                savedCount: audioAsset._count.savedBy,
                isReusable: audioAsset.isReusable,
                isOriginal: audioAsset.isOriginal,
                createdAt: audioAsset.createdAt,
                musicalInfo,
            },
            creator: {
                id: audioAsset.originalCreator.id,
                name: creatorName,
                avatarUrl: audioAsset.originalCreator?.profile?.avatarUrl,
            },
            isSaved,
        });
    } catch (error) {
        console.error('Error fetching audio asset:', error);
        return NextResponse.json({ error: 'Failed to fetch audio asset' }, { status: 500 });
    }
}
