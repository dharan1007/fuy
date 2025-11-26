import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSocket } from '@/lib/socket';

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const conversationId = params.id;
        const { messageIds } = await req.json();

        if (!messageIds || !Array.isArray(messageIds)) {
            return NextResponse.json({ error: 'Invalid message IDs' }, { status: 400 });
        }

        // Update DB
        await prisma.message.updateMany({
            where: {
                id: { in: messageIds },
                conversationId,
                NOT: { senderId: user.id }, // Only mark others' messages as read
            },
            data: {
                readAt: new Date(),
            },
        });

        // Emit socket event
        const io = getSocket();
        if (io) {
            io.to(`conversation:${conversationId}`).emit('message:read', {
                userId: user.id,
                messageIds,
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error marking read:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
