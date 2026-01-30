/**
 * Audio API - Main Route
 * POST: Upload and create new audio asset
 * GET: List audio assets
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST - Upload new audio and create AudioAsset
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            audioUrl,
            title,
            duration,
            waveformData,
            coverImageUrl,
            genre,
            isReusable = true,
            fingerprintChunks,
            postId, // If creating from a post
        } = body;

        if (!audioUrl || !duration) {
            return NextResponse.json(
                { error: 'Audio URL and duration are required' },
                { status: 400 }
            );
        }

        // Get user details for attribution
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { name: true, profile: { select: { displayName: true } } },
        });

        const displayName = user?.profile?.displayName || user?.name || 'Unknown';
        const attributionText = `Original audio by @${displayName}`;

        // Create the audio asset
        const audioAsset = await prisma.audioAsset.create({
            data: {
                originalCreatorId: session.user.id,
                originalPostId: postId || null,
                title: title || null,
                attributionText,
                duration,
                url: audioUrl,
                waveformData: waveformData ? JSON.stringify(waveformData) : null,
                coverImageUrl: coverImageUrl || null,
                genre: genre || null,
                isReusable,
                isOriginal: true,
                status: 'ACTIVE',
            },
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
            },
        });

        // Create fingerprint records if provided
        if (fingerprintChunks && Array.isArray(fingerprintChunks)) {
            await prisma.audioFingerprint.createMany({
                data: fingerprintChunks.map((chunk: any) => ({
                    audioAssetId: audioAsset.id,
                    spectrogramHash: chunk.spectrogramHash,
                    frequencyPeaks: chunk.frequencyPeaks,
                    chromaFeatures: chunk.chromaFeatures || null,
                    mfccData: chunk.mfccData || null,
                    tempoSignature: chunk.tempoSignature || null,
                    keySignature: chunk.keySignature || null,
                    chunkIndex: chunk.chunkIndex || 0,
                    chunkDuration: chunk.chunkDuration || 5,
                    version: 'v1',
                })),
            });
        }

        return NextResponse.json({
            success: true,
            audioAsset: {
                ...audioAsset,
                waveformData: audioAsset.waveformData
                    ? JSON.parse(audioAsset.waveformData)
                    : null,
            },
        });
    } catch (error) {
        console.error('Error creating audio asset:', error);
        return NextResponse.json(
            { error: 'Failed to create audio asset' },
            { status: 500 }
        );
    }
}

// GET - List audio assets with filters
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const search = searchParams.get('search') || '';
        const genre = searchParams.get('genre') || '';
        const sortBy = searchParams.get('sortBy') || 'recent'; // recent | popular | trending
        const creatorId = searchParams.get('creatorId') || '';

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {
            status: 'ACTIVE',
            isReusable: true,
        };

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { attributionText: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (genre) {
            where.genre = genre;
        }

        if (creatorId) {
            where.originalCreatorId = creatorId;
        }

        // Build orderBy based on sortBy
        let orderBy: any = { createdAt: 'desc' };
        if (sortBy === 'popular') {
            orderBy = { usageCount: 'desc' };
        } else if (sortBy === 'trending') {
            // For trending, we'd ideally look at recent usage velocity
            // For now, use a combination of usage and recency
            orderBy = [{ usageCount: 'desc' }, { createdAt: 'desc' }];
        }

        const [audioAssets, total] = await Promise.all([
            prisma.audioAsset.findMany({
                where,
                orderBy,
                skip,
                take: limit,
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
                },
            }),
            prisma.audioAsset.count({ where }),
        ]);

        return NextResponse.json({
            audioAssets: audioAssets.map((asset) => ({
                ...asset,
                waveformData: asset.waveformData ? JSON.parse(asset.waveformData) : null,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching audio assets:', error);
        return NextResponse.json(
            { error: 'Failed to fetch audio assets' },
            { status: 500 }
        );
    }
}
