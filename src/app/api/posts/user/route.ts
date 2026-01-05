import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const cursor = searchParams.get('cursor');

    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    try {
        const limit = 12;
        const posts = await prisma.post.findMany({
            where: {
                userId,
                status: 'PUBLISHED',
                postType: { not: 'CHAN' },
            },
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
            };
        });

        return NextResponse.json({ posts: formattedPosts, nextCursor });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
