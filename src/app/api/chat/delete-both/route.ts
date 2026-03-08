export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { conversationId } = body;

        if (!conversationId) {
            return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
        }

        // Verify conversation exists and user is a participant
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
        });

        if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const userId = session.user.id;
        if (conversation.participantA !== userId && conversation.participantB !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Hard delete: remove everything in correct FK order
        // 1. Get all message IDs in this conversation
        const messages = await prisma.message.findMany({
            where: { conversationId },
            select: { id: true },
        });
        const messageIds = messages.map(m => m.id);

        if (messageIds.length > 0) {
            // 2. Delete message child records
            await prisma.messageTag.deleteMany({ where: { messageId: { in: messageIds } } });
            await prisma.trigger.deleteMany({ where: { messageId: { in: messageIds } } });
            await prisma.deletedMessage.deleteMany({ where: { messageId: { in: messageIds } } });
        }

        // 3. Delete all messages
        await prisma.message.deleteMany({ where: { conversationId } });

        // 4. Delete conversation state records
        await prisma.conversationState.deleteMany({ where: { conversationId } });

        // 5. Delete the conversation
        await prisma.conversation.delete({ where: { id: conversationId } });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error deleting chat:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
