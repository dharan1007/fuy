
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const user = await getSessionUser();
        const userId = user?.id;

        // --- Safety Filtering ---
        let excludedUserIds: string[] = [];
        let hiddenPostIds: string[] = [];

        if (userId) {
            const [blocked, blockedBy, muted, hidden] = await Promise.all([
                prisma.blockedUser.findMany({ where: { blockerId: userId }, select: { blockedId: true } }),
                prisma.blockedUser.findMany({ where: { blockedId: userId }, select: { blockerId: true } }),
                prisma.mutedUser.findMany({ where: { muterId: userId }, select: { mutedUserId: true } }),
                prisma.hiddenPost.findMany({ where: { userId }, select: { postId: true } })
            ]);

            excludedUserIds = [
                ...blocked.map(b => b.blockedId),
                ...blockedBy.map(b => b.blockerId),
                ...muted.map(m => m.mutedUserId)
            ];
            hiddenPostIds = hidden.map(h => h.postId);
        }

        // Fetch public Auds
        const posts = await prisma.post.findMany({
            where: {
                postType: 'AUD',
                visibility: 'PUBLIC',
                ...(excludedUserIds.length > 0 && { userId: { notIn: excludedUserIds } }),
                ...(hiddenPostIds.length > 0 && { id: { notIn: hiddenPostIds } }),
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
                slashes: true,
                _count: {
                    select: { likes: true, comments: true }
                }
            }
        });

        const formattedPosts = posts.map((p: any) => ({
            ...p,
            media: p.postMedia?.map((pm: any) => pm.media) || []
        }));

        return NextResponse.json({ posts: formattedPosts });

    } catch (error) {
        console.error('Error fetching auds:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
