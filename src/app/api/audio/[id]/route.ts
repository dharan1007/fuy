/**
 * Audio Detail API - Get single audio asset
 * GET: Fetch audio asset details with metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
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
                        id: true,
                        tempoSignature: true,
                        keySignature: true,
                        version: true,
                    },
                },
                _count: {
                    select: {
                        usages: true,
                        reports: true,
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

        // Get first fingerprint's musical info
        const musicalInfo = audioAsset.fingerprints.length > 0
            ? {
                tempo: audioAsset.fingerprints[0].tempoSignature,
                key: audioAsset.fingerprints[0].keySignature,
            }
            : null;

        return NextResponse.json({
            audioAsset: {
                id: audioAsset.id,
                title: audioAsset.title,
                attributionText: audioAsset.attributionText,
                duration: audioAsset.duration,
                genre: audioAsset.genre,
                audioUrl: audioAsset.url,
                waveformData: audioAsset.waveformData
                    ? JSON.parse(audioAsset.waveformData)
                    : null,
                coverImageUrl: audioAsset.coverImageUrl,
                usageCount: audioAsset.usageCount,
                isReusable: audioAsset.isReusable,
                isOriginal: audioAsset.isOriginal,
                createdAt: audioAsset.createdAt,
                originalCreator: audioAsset.originalCreator,
                musicalInfo,
                _count: audioAsset._count,
            },
        });
    } catch (error) {
        console.error('Error fetching audio asset:', error);
        return NextResponse.json(
            { error: 'Failed to fetch audio asset' },
            { status: 500 }
        );
    }
}
