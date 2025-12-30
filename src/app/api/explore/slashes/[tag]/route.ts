
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { tag: string } }) {
    try {
        const tag = params.tag; // Tag from URL

        // Find posts that have a Slash with this tag
        const posts = await prisma.post.findMany({
            where: {
                slashes: {
                    some: {
                        tag: tag
                    }
                },
                visibility: 'PUBLIC' // Only public posts in explore
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
                slashes: true, // Include tags
                _count: {
                    select: { likes: true, comments: true }
                }
            }
        });

        return NextResponse.json({ posts });

    } catch (error) {
        console.error('Error fetching slash posts:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
