/**
 * Audio Search API - Search for audio assets
 * GET: Search with fingerprint matching for duplicates
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || '';
        const fingerprintHash = searchParams.get('fingerprintHash') || '';
        const tempo = searchParams.get('tempo');
        const key = searchParams.get('key');
        const genre = searchParams.get('genre');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');

        const skip = (page - 1) * limit;

        // If fingerprint hash provided, search for matches
        if (fingerprintHash) {
            const matchingFingerprints = await prisma.audioFingerprint.findMany({
                where: {
                    spectrogramHash: fingerprintHash,
                },
                include: {
                    audioAsset: {
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
                    },
                },
                take: 10,
            });

            const matches = matchingFingerprints
                .filter((fp) => fp.audioAsset.status === 'ACTIVE')
                .map((fp) => ({
                    ...fp.audioAsset,
                    waveformData: fp.audioAsset.waveformData
                        ? JSON.parse(fp.audioAsset.waveformData)
                        : null,
                    matchType: 'exact',
                    matchScore: 1.0,
                }));

            return NextResponse.json({
                matches,
                matchType: 'fingerprint',
                total: matches.length,
            });
        }

        // Text search with optional filters
        const where: any = {
            status: 'ACTIVE',
            isReusable: true,
        };

        if (query) {
            where.OR = [
                { title: { contains: query, mode: 'insensitive' } },
                { attributionText: { contains: query, mode: 'insensitive' } },
                { genre: { contains: query, mode: 'insensitive' } },
            ];
        }

        if (genre) {
            where.genre = { contains: genre, mode: 'insensitive' };
        }

        // Tempo-based search (with tolerance)
        if (tempo) {
            const bpm = parseFloat(tempo);
            const tolerance = 5; // +/- 5 BPM

            const tempoMatches = await prisma.audioFingerprint.findMany({
                where: {
                    tempoSignature: {
                        gte: bpm - tolerance,
                        lte: bpm + tolerance,
                    },
                },
                select: {
                    audioAssetId: true,
                },
                distinct: ['audioAssetId'],
            });

            if (tempoMatches.length > 0) {
                where.id = { in: tempoMatches.map((m) => m.audioAssetId) };
            }
        }

        // Key signature search
        if (key) {
            const keyMatches = await prisma.audioFingerprint.findMany({
                where: {
                    keySignature: { contains: key, mode: 'insensitive' },
                },
                select: {
                    audioAssetId: true,
                },
                distinct: ['audioAssetId'],
            });

            if (keyMatches.length > 0) {
                if (where.id) {
                    // Intersect with tempo matches
                    const tempoIds = where.id.in;
                    where.id = { in: keyMatches.map((m) => m.audioAssetId).filter((id: string) => tempoIds.includes(id)) };
                } else {
                    where.id = { in: keyMatches.map((m) => m.audioAssetId) };
                }
            }
        }

        const [audioAssets, total] = await Promise.all([
            prisma.audioAsset.findMany({
                where,
                orderBy: [{ usageCount: 'desc' }, { createdAt: 'desc' }],
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
                    fingerprints: {
                        select: {
                            tempoSignature: true,
                            keySignature: true,
                        },
                        take: 1,
                    },
                },
            }),
            prisma.audioAsset.count({ where }),
        ]);

        return NextResponse.json({
            results: audioAssets.map((asset) => ({
                ...asset,
                waveformData: asset.waveformData ? JSON.parse(asset.waveformData) : null,
                musicalInfo: asset.fingerprints.length > 0
                    ? {
                        tempo: asset.fingerprints[0].tempoSignature,
                        key: asset.fingerprints[0].keySignature,
                    }
                    : null,
            })),
            matchType: 'search',
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error searching audio:', error);
        return NextResponse.json(
            { error: 'Failed to search audio' },
            { status: 500 }
        );
    }
}

// POST - Search by fingerprint chunks for near-duplicate detection
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { fingerprintChunks, threshold = 0.85 } = body;

        if (!fingerprintChunks || !Array.isArray(fingerprintChunks)) {
            return NextResponse.json(
                { error: 'Fingerprint chunks are required' },
                { status: 400 }
            );
        }

        // Search for matching hashes
        const hashMatches: Record<string, number> = {};

        for (const chunk of fingerprintChunks) {
            const matches = await prisma.audioFingerprint.findMany({
                where: {
                    spectrogramHash: chunk.spectrogramHash,
                },
                select: {
                    audioAssetId: true,
                },
            });

            for (const match of matches) {
                hashMatches[match.audioAssetId] = (hashMatches[match.audioAssetId] || 0) + 1;
            }
        }

        // Calculate similarity scores
        const totalChunks = fingerprintChunks.length;
        const candidates: Array<{ audioAssetId: string; similarity: number }> = [];

        for (const [audioAssetId, matchCount] of Object.entries(hashMatches)) {
            const similarity = matchCount / totalChunks;
            if (similarity >= threshold) {
                candidates.push({ audioAssetId, similarity });
            }
        }

        // Sort by similarity
        candidates.sort((a, b) => b.similarity - a.similarity);

        if (candidates.length === 0) {
            return NextResponse.json({
                matches: [],
                isUnique: true,
            });
        }

        // Get audio asset details for top matches
        const topMatches = await prisma.audioAsset.findMany({
            where: {
                id: { in: candidates.slice(0, 5).map((c) => c.audioAssetId) },
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

        const matchesWithScore = topMatches.map((asset) => {
            const candidate = candidates.find((c) => c.audioAssetId === asset.id);
            return {
                ...asset,
                waveformData: asset.waveformData ? JSON.parse(asset.waveformData) : null,
                similarity: candidate?.similarity || 0,
                matchType: candidate && candidate.similarity >= 0.95 ? 'exact' : 'near',
            };
        });

        return NextResponse.json({
            matches: matchesWithScore,
            isUnique: false,
            bestMatch: matchesWithScore[0] || null,
        });
    } catch (error) {
        console.error('Error searching by fingerprint:', error);
        return NextResponse.json(
            { error: 'Failed to search by fingerprint' },
            { status: 500 }
        );
    }
}
