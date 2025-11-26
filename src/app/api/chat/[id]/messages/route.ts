import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher';

// GET: Fetch messages
export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const conversationId = params.id;
        const messages = await prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' },
            include: {
                sender: {
                    select: { id: true, name: true, profile: { select: { avatarUrl: true } } },
                },
            },
        });

        return NextResponse.json({ messages });
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST: Send message
export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { content } = await req.json();
        if (!content) {
            return NextResponse.json({ error: 'Content required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const conversationId = params.id;

        // Save to DB
        const message = await prisma.message.create({
            data: {
                conversationId,
                senderId: user.id,
                content,
            },
            include: {
                sender: {
                    select: { id: true, name: true, profile: { select: { avatarUrl: true } } },
                },
            },
        });

        // Update conversation
        await prisma.conversation.update({
            where: { id: conversationId },
            data: {
                lastMessage: content,
                lastMessageAt: new Date(),
            },
        });

        // Emit Pusher event
        await pusherServer.trigger(`conversation-${conversationId}`, 'message:new', {
            ...message,
            timestamp: message.createdAt.getTime(),
        });

        return NextResponse.json({ message });
    } catch (error) {
        console.error('Error sending message:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
