
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

        const block = await prisma.blockedUser.create({
            data: {
                blockerId,
                blockedId,
                reason
            }
        });

        // Optional: Also mutual disconnect?
        // Remove from followers/following/friendships?
        // Keeping it simple for now as requested.

        return NextResponse.json({ success: true, block });

    } catch (error) {
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
