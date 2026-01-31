import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const cursor = searchParams.get('cursor');
    const type = searchParams.get('type'); // Filter by postType

    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    try {
        const limit = 12;

        let where: any = {
            userId,
            status: 'PUBLISHED',
        };

        if (type && type !== 'ALL') {
            // Basic mapping from frontend tabs to DB 'postType'
            // 'ALL', 'FILLS', 'LILLS', 'SIMPLE', 'AUDIO', 'CHANNELS'
            if (type === 'FILLS') where.postType = 'FILL';
            else if (type === 'LILLS') where.postType = 'LILL';
            else if (type === 'AUDIO') where.postType = 'AUD';
            else if (type === 'CHANNELS') where.postType = 'CHAN';
            else if (type === 'SIMPLE') where.postType = { in: ['STANDARD', 'TEXT', 'SIMPLE'] };
        } else {
            // Default behavior: exclude CHAN unless asked
            where.postType = { not: 'CHAN' };
        }

        const posts = await prisma.post.findMany({
            where,
            take: limit + 1, // Fetch one extra to get next cursor
            cursor: cursor ? { id: cursor } : undefined,
            skip: cursor ? 1 : 0,
            orderBy: { createdAt: 'desc' },
            include: {
                postMedia: { include: { media: true } },
                user: {
                    select: {
                        id: true,
                        name: true,
                        profile: { select: { displayName: true, avatarUrl: true } }
                    }
                },
                _count: {
                    select: { likes: true, comments: true }
                }
            }
        });

        let nextCursor: string | undefined = undefined;
        if (posts.length > limit) {
            const nextItem = posts.pop();
            nextCursor = nextItem!.id;
        }

        // Transform (similar to ProfilePage transformation)
        const formattedPosts = posts.map((p: any) => {
            const media = p.postMedia?.map((pm: any) => pm.media) || [];
            return {
                ...p,
                media,
                createdAt: p.createdAt.toISOString(),
                likes: p._count?.likes || 0,
                comments: p._count?.comments || 0,
                // Synthesize Data for Cards
                lillData: p.postType === 'LILL' ? {
                    id: p.id,
                    videoUrl: media[0]?.url || '',
                    thumbnailUrl: media[0]?.thumbnailUrl || null,
                    duration: 0
                } : undefined,

                fillData: p.postType === 'FILL' ? {
                    id: p.id,
                    videoUrl: media[0]?.url || '',
                    thumbnailUrl: media[0]?.thumbnailUrl || null,
                    duration: 0
                } : undefined,

                audData: p.postType === 'AUD' ? {
                    id: p.id,
                    audioUrl: media[0]?.url || '',
                    title: "Audio",
                    artist: "Artist",
                    coverImageUrl: media[0]?.url,
                    duration: 0
                } : undefined,

                xrayData: p.postType === 'XRAY' ? {
                    id: p.id,
                    topLayerUrl: media.find((m: any) => m.variant === 'xray-top')?.url || media[0]?.url || '',
                    topLayerType: media.find((m: any) => m.variant === 'xray-top')?.type || 'IMAGE',
                    bottomLayerUrl: media.find((m: any) => m.variant === 'xray-bottom')?.url || media[1]?.url || '',
                    bottomLayerType: media.find((m: any) => m.variant === 'xray-bottom')?.type || 'IMAGE',
                } : undefined,
            };
        });

        return NextResponse.json({ posts: formattedPosts, nextCursor });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
