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
                messageTags: {
                    select: { tagType: true }
                }
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

// DELETE: Delete messages based on retention policy (excludes saved messages)
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
            include: {
                states: true
            }
        });

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        if (conversation.participantA !== user.id && conversation.participantB !== user.id) {
            return NextResponse.json({ error: 'Not authorized to delete messages in this conversation' }, { status: 403 });
        }

        // Get retention setting from conversation (or query param override)
        const url = new URL(req.url);
        const retentionParam = url.searchParams.get('retention');
        const retention = retentionParam || (conversation as any).messageRetention || 'immediately';

        let deleteCount = 0;

        if (retention === 'immediately') {
            // For immediate: delete all messages that have been read by the recipient
            // A message is "seen by both" when senderId != current user AND readAt is set
            // OR senderId == current user (sender always "sees" their own message)
            // So we delete messages where readAt is NOT null (meaning recipient has seen it)
            const result = await prisma.message.deleteMany({
                where: {
                    conversationId,
                    isSaved: false,
                    readAt: { not: null }, // Message has been seen by recipient
                },
            });
            deleteCount = result.count;
        } else if (retention === '1day') {
            // Delete messages older than 24 hours from when they were sent
            const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const result = await prisma.message.deleteMany({
                where: {
                    conversationId,
                    isSaved: false,
                    createdAt: { lt: cutoff },
                },
            });
            deleteCount = result.count;
        }

        // Update conversation last message if needed
        const remainingMessages = await prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'desc' },
            take: 1
        });

        if (remainingMessages.length === 0) {
            await prisma.conversation.update({
                where: { id: conversationId },
                data: {
                    lastMessage: null,
                    lastMessageAt: null,
                },
            });
        } else {
            await prisma.conversation.update({
                where: { id: conversationId },
                data: {
                    lastMessage: remainingMessages[0].content,
                    lastMessageAt: remainingMessages[0].createdAt,
                },
            });
        }

        return NextResponse.json({ success: true, deletedCount: deleteCount });
    } catch (error) {
        console.error('Error deleting messages:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PATCH: Save/unsave a specific message
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const { messageId, isSaved } = await req.json();
        if (!messageId || typeof isSaved !== 'boolean') {
            return NextResponse.json({ error: 'messageId and isSaved required' }, { status: 400 });
        }

        const conversationId = params.id;

        // Verify user is part of this conversation
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
        });

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        if (conversation.participantA !== user.id && conversation.participantB !== user.id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        // Verify message belongs to this conversation
        const message = await prisma.message.findFirst({
            where: {
                id: messageId,
                conversationId
            }
        });

        if (!message) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 });
        }

        // Update the message's isSaved status
        const updated = await prisma.message.update({
            where: { id: messageId },
            data: { isSaved }
        });

        return NextResponse.json({ success: true, message: updated });
    } catch (error) {
        console.error('Error saving message:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

