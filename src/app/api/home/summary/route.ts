
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireUserId } from "@/lib/session";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const userId = await requireUserId();

        const [userData, unreadNotifCount, unreadChatCount, hopinPlans, todos, suggestedUsers, suggestedPlans] = await Promise.all([
            // 1. Profile Data
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    email: true,
                    name: true,
                    profile: true,
                    _count: {
                        select: {
                            posts: { where: { postType: { not: 'CHAN' } } }
                        }
                    }
                },
            }),
            // 2. Unread Notifications
            prisma.notification.count({
                where: { userId, read: false }
            }),
            // 3. Unread Messages
            prisma.message.count({
                where: {
                    conversation: { OR: [{ participantA: userId }, { participantB: userId }] },
                    senderId: { not: userId },
                    readAt: null,
                },
            }),
            // 5. Hopin Plans
            prisma.task.findMany({
                where: {
                    OR: [{ createdById: userId }, { assignees: { some: { userId } } }],
                },
                select: { id: true, title: true, description: true, status: true, priority: true, dueDate: true, createdById: true },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
            // 6. Todos
            prisma.todo.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 10
            }),
            // 7. Suggested Users
            prisma.user.findMany({
                where: {
                    AND: [{ id: { not: userId } }, { friendshipsA: { none: { friendId: userId } } }],
                },
                select: {
                    id: true,
                    name: true,
                    profile: { select: { displayName: true, avatarUrl: true, bio: true } },
                    friendshipsB: { select: { id: true } },
                },
                orderBy: { followersCount: 'desc' },
                take: 5,
            }),
            // 8. Suggested Plans
            prisma.task.findMany({
                where: { status: { in: ['TODO', 'IN_PROGRESS'] } },
                select: { id: true, title: true, description: true, status: true, priority: true },
                orderBy: { createdAt: 'desc' },
                take: 5,
            })
        ]);

        // Extra stats fetches for the sidebar - use User model counts (updated by follow API)
        const userStats = await prisma.user.findUnique({
            where: { id: userId },
            select: { followersCount: true, followingCount: true }
        });

        return NextResponse.json({
            profile: {
                ...userData,
                stats: {
                    friends: 0, // Friends system removed
                    posts: userData?._count?.posts || 0,
                    followers: userStats?.followersCount || 0,
                    following: userStats?.followingCount || 0
                }
            },
            unreadCount: unreadNotifCount,
            unreadMessageCount: unreadChatCount,
            ranks: [{ categoryId: "global", rank: 0, score: 0 }],
            hopinPlans: hopinPlans.map(p => ({ ...p, isCreator: p.createdById === userId })),
            todos,
            suggestedUsers: suggestedUsers.map(u => ({ id: u.id, name: u.name, profile: u.profile, followersCount: u.friendshipsB.length })),
            suggestedPlans
        });

    } catch (error: any) {
        console.error("Error in home summary API:", error);
        if (error?.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
