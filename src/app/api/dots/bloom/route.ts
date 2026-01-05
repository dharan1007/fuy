
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

        // 1. Get Filters from Query Params OR Defaults
        const { searchParams } = new URL(request.url);
        const slashesParam = searchParams.get('slashes');
        const userIdsParam = searchParams.get('userIds');
        const postIdsParam = searchParams.get('postIds');

        let targetSlashes: string[] = [];
        let targetUserIds: string[] = [];
        let targetPostIds: string[] = [];

        if (slashesParam || userIdsParam || postIdsParam) {
            // Ad-hoc filtering mode
            if (slashesParam) targetSlashes = slashesParam.split(',').filter(Boolean);
            if (userIdsParam) targetUserIds = userIdsParam.split(',').filter(Boolean);
            if (postIdsParam) targetPostIds = postIdsParam.split(',').filter(Boolean);
        } else {
            // Default: User's saved preference
            const user = await prisma.user.findUnique({
                where: { email: session.user.email },
                select: { bloomSlashes: true }
            });
            targetSlashes = user?.bloomSlashes || [];

            // STRICT FILTERING: If no filters at all in default mode, return empty/prompt
            if (targetSlashes.length === 0) {
                return NextResponse.json({ posts: [], hasSlashes: false });
            }
        }

        // 2. Query Posts
        // Fetch posts (LILL, FILL, AUD, STANDARD?) that match the slashes
        // User mentioned "lills or fills or auds".
        const posts = await prisma.post.findMany({
            where: {
                // Filter by type
                postType: { in: ['LILL', 'FILL', 'AUD'] },
                // Filter by visibility (Public by default for now)
                visibility: 'PUBLIC',
                // Filter by Tags OR Users OR Specific Posts
                OR: [
                    // Match Tags
                    ...(targetSlashes.length > 0 ? [{
                        slashes: {
                            some: {
                                tag: { in: targetSlashes }
                            }
                        }
                    }] : []),
                    // Match Users
                    ...(targetUserIds.length > 0 ? [{
                        userId: { in: targetUserIds }
                    }] : []),
                    // Match Specific Posts
                    ...(targetPostIds.length > 0 ? [{
                        id: { in: targetPostIds }
                    }] : [])
                ]
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
                postMedia: { include: { media: true } },
                slashes: true, // Return tags to show them
                _count: {
                    select: { likes: true, comments: true }
                }
            }
        });

        const formattedPosts = posts.map((p: any) => ({
            ...p,
            media: p.postMedia?.map((pm: any) => pm.media) || []
        }));

        return NextResponse.json({ posts: formattedPosts, hasSlashes: true });

    } catch (error) {
        console.error('Error fetching bloom feed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
