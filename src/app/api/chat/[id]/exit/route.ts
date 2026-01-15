import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST: Record user exit from chat and trigger retention cleanup
export async function POST(req: Request, { params }: { params: { id: string } }) {
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
            include: { states: true }
        });

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        if (conversation.participantA !== user.id && conversation.participantB !== user.id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        // Update current user's exit time
        await prisma.conversationState.upsert({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId: user.id
                }
            },
            update: {
                lastExitedAt: new Date()
            },
            create: {
                conversationId,
                userId: user.id,
                lastExitedAt: new Date()
            }
        });

        // Check retention setting
        const retention = (conversation as any).messageRetention || 'immediately';
        let deletedCount = 0;

        if (retention === 'immediately') {
            // Delete all messages that have been read (seen by recipient)
            const result = await prisma.message.deleteMany({
                where: {
                    conversationId,
                    isSaved: false,
                    readAt: { not: null }, // Message has been seen
                },
            });
            deletedCount = result.count;

            // Update conversation last message
            const remainingMessages = await prisma.message.findMany({
                where: { conversationId },
                orderBy: { createdAt: 'desc' },
                take: 1
            });

            if (remainingMessages.length === 0) {
                await prisma.conversation.update({
                    where: { id: conversationId },
                    data: { lastMessage: null, lastMessageAt: null }
                });
            } else {
                await prisma.conversation.update({
                    where: { id: conversationId },
                    data: {
                        lastMessage: remainingMessages[0].content,
                        lastMessageAt: remainingMessages[0].createdAt
                    }
                });
            }
        } else if (retention === '1day') {
            // Delete messages older than 24 hours
            const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const result = await prisma.message.deleteMany({
                where: {
                    conversationId,
                    isSaved: false,
                    createdAt: { lt: cutoff },
                },
            });
            deletedCount = result.count;
        }

        return NextResponse.json({
            success: true,
            deletedCount,
            exitRecorded: true
        });
    } catch (error) {
        console.error('Error recording exit:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
