
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { blockedId, reason } = await req.json();
        const blockerId = session.user.id;

        if (!blockedId || blockedId === blockerId) {
            return NextResponse.json({ error: 'Invalid user to block' }, { status: 400 });
        }

        await prisma.$transaction(async (tx) => {
            // 1. Create blocked record (will throw P2002 if already blocked)
            await tx.blockedUser.create({
                data: {
                    blockerId,
                    blockedId,
                    reason
                }
            });

            // 2. Find and delete subscriptions between both users, decrement counts
            const subsToDelete = await tx.subscription.findMany({
                where: {
                    OR: [
                        { subscriberId: blockerId, subscribedToId: blockedId },
                        { subscriberId: blockedId, subscribedToId: blockerId },
                    ]
                }
            });

            if (subsToDelete.length > 0) {
                await tx.subscription.deleteMany({
                    where: {
                        OR: [
                            { subscriberId: blockerId, subscribedToId: blockedId },
                            { subscriberId: blockedId, subscribedToId: blockerId },
                        ]
                    }
                });

                // Decrement counts for each subscription deleted
                for (const sub of subsToDelete) {
                    await tx.user.update({
                        where: { id: sub.subscriberId },
                        data: { followingCount: { decrement: 1 } }
                    });
                    await tx.user.update({
                        where: { id: sub.subscribedToId },
                        data: { followersCount: { decrement: 1 } }
                    });
                }
            }

            // 3. Delete friendships between both users
            await tx.friendship.deleteMany({
                where: {
                    OR: [
                        { userId: blockerId, friendId: blockedId },
                        { userId: blockedId, friendId: blockerId },
                    ]
                }
            });
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        // If already blocked (unique constraint), treat as success
        if (error?.code === 'P2002') {
            return NextResponse.json({ success: true });
        }
        console.error("Block failed", error);
        return NextResponse.json({ error: 'Failed to block user' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const blockedId = searchParams.get('userId');
        const blockerId = session.user.id;

        if (!blockedId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

        await prisma.blockedUser.deleteMany({
            where: {
                blockerId,
                blockedId
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to unblock' }, { status: 500 });
    }
}
