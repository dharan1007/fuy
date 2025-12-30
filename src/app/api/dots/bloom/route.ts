
import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Get User's configured slashes
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { bloomSlashes: true }
        });

        const userSlashes = user?.bloomSlashes || [];

        // STRICT FILTERING: If no slashes, return empty (or prompting state handled by frontend)
        if (userSlashes.length === 0) {
            return NextResponse.json({ posts: [], hasSlashes: false });
        }

        // 2. Query Posts
        // Fetch posts (LILL, FILL, AUD, STANDARD?) that match the slashes
        // User mentioned "lills or fills or auds".
        const posts = await prisma.post.findMany({
            where: {
                // Filter by type
                postType: { in: ['LILL', 'FILL', 'AUD'] },
                // Filter by visibility (Public or Follower check skipped for now for broad bloom? Assuming public bloom)
                visibility: 'PUBLIC',
                // Filter by Tags
                slashes: {
                    some: {
                        tag: { in: userSlashes }
                    }
                }
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
                slashes: true, // Return tags to show them
                _count: {
                    select: { likes: true, comments: true }
                }
            }
        });

        return NextResponse.json({ posts, hasSlashes: true });

    } catch (error) {
        console.error('Error fetching bloom feed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
