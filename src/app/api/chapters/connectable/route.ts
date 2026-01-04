export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';

    // User can connect to:
    // 1. Their own posts
    // 2. Public posts (where chapterAccessPolicy is PUBLIC or default)
    // 3. Private posts where they have an ACCEPTED ChapterAccessRequest

    try {
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!currentUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const connectablePosts = await prisma.post.findMany({
            where: {
                AND: [
                    // Exclude unsupported types (Puds, Channels as per requirement)
                    { postType: { notIn: ['PULLUPDOWN', 'CHAN'] } },
                    {
                        OR: [
                            // 1. Own posts
                            { userId: currentUser.id },
                            // 2. Public posts (Assuming PUBLIC is accessible)
                            // "one user can make the chapter access public or privae"
                            // If chapterAccessPolicy is PUBLIC, anyone can connect.
                            { chapterAccessPolicy: 'PUBLIC' },
                            // 3. Posts with accepted access request
                            {
                                chapterAccessRequests: {
                                    some: {
                                        requesterId: currentUser.id,
                                        status: 'ACCEPTED'
                                    }
                                }
                            }
                        ]
                    },
                    // Search filter
                    query ? {
                        OR: [
                            { content: { contains: query, mode: 'insensitive' } },
                            { user: { name: { contains: query, mode: 'insensitive' } } },
                            { user: { profile: { displayName: { contains: query, mode: 'insensitive' } } } }
                        ]
                    } : {}
                ]
            },
            select: {
                id: true,
                content: true,
                postType: true,
                createdAt: true,
                chapterAccessPolicy: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        profile: { select: { avatarUrl: true, displayName: true } }
                    }
                },
                // Include media to show thumbnail
                postMedia: { take: 1, include: { media: true } },
                lillData: { select: { thumbnailUrl: true } },
                fillData: { select: { thumbnailUrl: true } },
            },
            take: 20,
            orderBy: { createdAt: 'desc' }
        });

        // Format for frontend
        const formatted = connectablePosts.map(post => {
            let mediaUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800'; // Default

            if (post.lillData?.thumbnailUrl) mediaUrl = post.lillData.thumbnailUrl;
            else if (post.fillData?.thumbnailUrl) mediaUrl = post.fillData.thumbnailUrl;
            else if (post.postMedia?.[0]?.media?.url) {
                mediaUrl = post.postMedia[0].media.url;
            }

            return {
                id: post.id,
                content: post.content,
                type: post.postType,
                author: post.user.profile?.displayName || post.user.name,
                authorAvatar: post.user.profile?.avatarUrl,
                mediaUrl,
                createdAt: post.createdAt,
                isOwner: post.user.id === currentUser.id
            };
        });

        return NextResponse.json(formatted);

    } catch (error) {
        console.error('Error fetching connectable posts:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
