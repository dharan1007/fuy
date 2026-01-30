/**
 * Trending Audio API - Get trending audio assets
 * GET: Fetch trending audio based on recent usage velocity
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const period = searchParams.get('period') || 'week'; // day | week | month

        // Calculate date range based on period
        const now = new Date();
        let startDate: Date;

        switch (period) {
            case 'day':
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case 'week':
            default:
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
        }

        // Get audio assets with recent usage counts
        const recentUsages = await prisma.audioUsage.groupBy({
            by: ['audioAssetId'],
            where: {
                createdAt: {
                    gte: startDate,
                },
            },
            _count: {
                audioAssetId: true,
            },
            orderBy: {
                _count: {
                    audioAssetId: 'desc',
                },
            },
            take: limit,
        });

        if (recentUsages.length === 0) {
            // Fall back to most popular overall
            const popularAudio = await prisma.audioAsset.findMany({
                where: {
                    status: 'ACTIVE',
                    isReusable: true,
                },
                orderBy: {
                    usageCount: 'desc',
                },
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
            });

            return NextResponse.json({
                trending: popularAudio.map((asset) => ({
                    ...asset,
                    audioUrl: asset.url,
                    waveformData: asset.waveformData ? JSON.parse(asset.waveformData) : null,
                    recentUsageCount: 0,
                    trendScore: asset.usageCount,
                })),
                period,
                fallback: true,
            });
        }

        // Get full audio asset details
        const audioAssetIds = recentUsages.map((u) => u.audioAssetId);
        const audioAssets = await prisma.audioAsset.findMany({
            where: {
                id: { in: audioAssetIds },
                status: 'ACTIVE',
                isReusable: true,
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

        // Combine with usage counts and calculate trend score
        const trending = audioAssets.map((asset) => {
            const usage = recentUsages.find((u) => u.audioAssetId === asset.id);
            const recentUsageCount = usage?._count.audioAssetId || 0;

            // Trend score: recent usage weighted more + total usage as base
            const trendScore = recentUsageCount * 10 + asset.usageCount;

            return {
                ...asset,
                audioUrl: asset.url,
                waveformData: asset.waveformData ? JSON.parse(asset.waveformData) : null,
                recentUsageCount,
                trendScore,
            };
        });

        // Sort by trend score
        trending.sort((a, b) => b.trendScore - a.trendScore);

        return NextResponse.json({
            trending,
            period,
            fallback: false,
        });
    } catch (error) {
        console.error('Error fetching trending audio:', error);
        return NextResponse.json(
            { error: 'Failed to fetch trending audio' },
            { status: 500 }
        );
    }
}
