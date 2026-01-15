
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const blockSchema = z.object({
    userId: z.string(),
});

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

        const user = session.user as { id: string; name?: string | null; email?: string | null; image?: string | null };
        const body = await req.json();
        const { userId } = blockSchema.parse(body);

        if (userId === user.id) {
            return new NextResponse("Cannot block yourself", { status: 400 });
        }

        // Create BlockedUser entry
        await prisma.blockedUser.create({
            data: {
                blockerId: user.id,
                blockedId: userId,
            },
        });

        // Also ensure friendship is broken
        // Delete any friendship record
        await prisma.friendship.deleteMany({
            where: {
                OR: [
                    { userId: user.id, friendId: userId },
                    { userId: userId, friendId: user.id }
                ]
            }
        });

        // Also remove any follows (Subscription)
        await prisma.subscription.deleteMany({
            where: {
                OR: [
                    { subscriberId: user.id, subscribedToId: userId },
                    { subscriberId: userId, subscribedToId: user.id }
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
