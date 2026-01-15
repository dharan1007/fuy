import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';

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

        // Emit Pusher event - REMOVED for Supabase Realtime
        // Supabase will automatically broadcast the INSERT via postgres_changes

        return NextResponse.json({ message });
    } catch (error) {
        console.error('Error sending message:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE: Delete all messages in conversation (for message retention)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const conversationId = params.id;

        // Verify user is part of this conversation
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
        });

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        if (conversation.participantA !== user.id && conversation.participantB !== user.id) {
            return NextResponse.json({ error: 'Not authorized to delete messages in this conversation' }, { status: 403 });
        }

        // Parse retention type from query params
        const url = new URL(req.url);
        const retention = url.searchParams.get('retention') || 'immediately';

        let deleteCount = 0;

        if (retention === 'immediately') {
            // Delete all messages
            const result = await prisma.message.deleteMany({
                where: { conversationId },
            });
            deleteCount = result.count;
        } else if (retention === '1day') {
            // Delete messages older than 24 hours
            const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const result = await prisma.message.deleteMany({
                where: {
                    conversationId,
                    createdAt: { lt: cutoff },
                },
            });
            deleteCount = result.count;
        }

        // Update conversation last message if all deleted
        if (retention === 'immediately') {
            await prisma.conversation.update({
                where: { id: conversationId },
                data: {
                    lastMessage: null,
                    lastMessageAt: null,
                },
            });
        }

        return NextResponse.json({ success: true, deletedCount: deleteCount });
    } catch (error) {
        console.error('Error deleting messages:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
