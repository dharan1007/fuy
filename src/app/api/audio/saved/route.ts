/**
 * Saved Audios API
 * GET: List user's saved audios with pagination and search
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const search = searchParams.get('search') || '';
        const skip = (page - 1) * limit;

        const where: any = {
            userId: session.user.id,
            audioAsset: {
                status: 'ACTIVE',
            }
        };

        // If search is provided, filter by audio title or attribution text
        if (search) {
            where.audioAsset = {
                ...where.audioAsset,
                OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { attributionText: { contains: search, mode: 'insensitive' } },
                    { genre: { contains: search, mode: 'insensitive' } },
                ],
            };
        }

        const [savedAudios, total] = await Promise.all([
            prisma.savedAudio.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
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
                            _count: {
                                select: { usages: true },
                            },
                        },
                    },
                },
            }),
            prisma.savedAudio.count({ where }),
        ]);

        const audios = savedAudios.map((sa) => {
            const asset = sa.audioAsset;
            const creatorName =
                asset.originalCreator?.profile?.displayName ||
                asset.originalCreator?.name ||
                'Unknown';

            return {
                savedId: sa.id,
                savedAt: sa.createdAt,
                audioAsset: {
                    id: asset.id,
                    title: asset.title || 'Original audio',
                    attributionText: asset.attributionText || `Original audio by @${creatorName}`,
                    duration: asset.duration,
                    genre: asset.genre,
                    audioUrl: asset.url,
                    coverImageUrl: asset.coverImageUrl,
                    isOriginal: asset.isOriginal,
                    usageCount: asset._count.usages,
                    createdAt: asset.createdAt,
                },
                creator: {
                    id: asset.originalCreator.id,
                    name: creatorName,
                    avatarUrl: asset.originalCreator?.profile?.avatarUrl,
                },
            };
        });

        return NextResponse.json({
            audios,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching saved audios:', error);
        return NextResponse.json({ error: 'Failed to fetch saved audios' }, { status: 500 });
    }
}
