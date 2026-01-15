import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// PATCH: Update conversation retention settings
export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const { conversationId, messageRetention } = await req.json();

        if (!conversationId || !messageRetention) {
            return NextResponse.json({ error: 'conversationId and messageRetention are required' }, { status: 400 });
        }

        // Validate retention value
        if (!['immediately', '1day'].includes(messageRetention)) {
            return NextResponse.json({ error: 'Invalid messageRetention value. Use "immediately" or "1day"' }, { status: 400 });
        }

        // Verify user is part of this conversation
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
        });

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        if (conversation.participantA !== user.id && conversation.participantB !== user.id) {
            return NextResponse.json({ error: 'Not authorized to modify this conversation' }, { status: 403 });
        }

        // Update the conversation's retention setting (affects both users)
        const updated = await prisma.conversation.update({
            where: { id: conversationId },
            data: { messageRetention }
        });

        // Apply retention policy immediately to existing messages
        if (messageRetention === 'immediately') {
            // For immediate mode, we need both users to have exited the chat
            // This is handled when users actually exit, so we just record the setting
            // No immediate deletion here - it happens on chat exit
        } else if (messageRetention === '1day') {
            // Delete messages older than 24 hours that aren't saved
            const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
            await prisma.message.deleteMany({
                where: {
                    conversationId,
                    isSaved: false,
                    createdAt: { lt: cutoff }
                }
            });
        }

        return NextResponse.json({
            success: true,
            messageRetention: updated.messageRetention
        });
    } catch (error) {
        console.error('Error updating retention settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// GET: Get current retention setting
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const { searchParams } = new URL(req.url);
        const conversationId = searchParams.get('conversationId');

        if (!conversationId) {
            return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
        }

        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: {
                id: true,
                messageRetention: true,
                participantA: true,
                participantB: true
            }
        });

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        if (conversation.participantA !== user.id && conversation.participantB !== user.id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        return NextResponse.json({
            messageRetention: conversation.messageRetention || 'immediately'
        });
    } catch (error) {
        console.error('Error getting retention settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
