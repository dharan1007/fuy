
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // Fetch public Auds
        const posts = await prisma.post.findMany({
            where: {
                postType: 'AUD',
                visibility: 'PUBLIC',
            },
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        profile: { select: { displayName: true, avatarUrl: true } }
                    }
                },
                media: true,
                slashes: true,
                _count: {
                    select: { likes: true, comments: true }
                }
            }
        });

        return NextResponse.json({ posts });

    } catch (error) {
        console.error('Error fetching auds:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
