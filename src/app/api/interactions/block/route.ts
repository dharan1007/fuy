
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const blockSchema = z.object({
    userId: z.string(),
});

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

        const body = await req.json();
        const { userId } = blockSchema.parse(body);

        if (userId === session.user.id) {
            return new NextResponse("Cannot block yourself", { status: 400 });
        }

        // Create BlockedUser entry
        await prisma.blockedUser.create({
            data: {
                blockerId: session.user.id,
                blockedId: userId,
            },
        });

        // Also ensure friendship is broken
        // Delete any friendship record
        await prisma.friendship.deleteMany({
            where: {
                OR: [
                    { userId: session.user.id, friendId: userId },
                    { userId: userId, friendId: session.user.id }
                ]
            }
        });

        // Also remove any follows (Subscription)
        await prisma.subscription.deleteMany({
            where: {
                OR: [
                    { subscriberId: session.user.id, subscribedToId: userId },
                    { subscriberId: userId, subscribedToId: session.user.id }
                ]
            }
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        // If unique constraint failed, already blocked
        if ((e as any).code === 'P2002') {
            return NextResponse.json({ success: true });
        }
        console.error("Block error:", e);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
