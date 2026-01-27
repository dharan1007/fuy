import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET: Fetch suggested users for sharing
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query')?.toLowerCase();
    const currentUserId = (session!.user as any).id;

    try {
        let results = [];

        if (query) {
            // simple search by name/handle
            results = await prisma.user.findMany({
                where: {
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { profile: { displayName: { contains: query, mode: 'insensitive' } } }
                    ],
                    NOT: { id: currentUserId }
                },
                take: 20,
                select: {
                    id: true,
                    name: true,
                    profile: {
                        select: {
                            displayName: true,
                            avatarUrl: true
                        }
                    }
                }
            });
        } else {
            // Recent conversations first
            const recentConvos = await prisma.conversation.findMany({
                where: {
                    OR: [
                        { participantA: currentUserId },
                        { participantB: currentUserId }
                    ]
                },
                orderBy: { lastMessageAt: 'desc' },
                take: 20,
                include: {
                    userA: {
                        select: {
                            id: true,
                            name: true,
                            profile: { select: { displayName: true, avatarUrl: true } }
                        }
                    },
                    userB: {
                        select: {
                            id: true,
                            name: true,
                            profile: { select: { displayName: true, avatarUrl: true } }
                        }
                    }
                }
            });

            // Map conversations to the OTHER user
            const recentUsers = recentConvos.map(c => {
                if (c.participantA === currentUserId) return c.userB;
                return c.userA;
            }).filter(u => u !== null);

            // Also fetch some followings if recent list is short
            let followingUsers: any[] = [];
            if (recentUsers.length < 10) {
                const followings = await prisma.friendship.findMany({
                    where: { userId: currentUserId },
                    take: 20,
                    include: {
                        friend: {
                            select: {
                                id: true,
                                name: true,
                                profile: { select: { displayName: true, avatarUrl: true } }
                            }
                        }
                    }
                });
                followingUsers = followings.map(f => f.friend);
            }

            // Combine and deduplicate
            const combined = [...recentUsers, ...followingUsers];
            const uniqueMap = new Map();
            combined.forEach((u: any) => {
                if (u && !uniqueMap.has(u.id)) {
                    uniqueMap.set(u.id, u);
                }
            });
            results = Array.from(uniqueMap.values());
        }

        // Format for frontend
        const users = results.map((u: any) => ({
            id: u.id,
            name: u.name,
            displayName: u.profile?.displayName,
            avatarUrl: u.profile?.avatarUrl
        }));

        return NextResponse.json(users);
    } catch (error) {
        console.error("Suggestions fetch error:", error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
