import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { action } = await req.json(); // 'delete' | 'mute' | 'unmute'
        const conversationId = params.id;
        const userId = (session.user as any).id;

        if (!['delete', 'mute', 'unmute'].includes(action)) {
            return new NextResponse('Invalid action', { status: 400 });
        }

        // Find or create state record
        const state = await prisma.conversationState.upsert({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId
                }
            },
            create: {
                conversationId,
                userId,
                isDeleted: action === 'delete',
                isMuted: action === 'mute',
                lastDeletedAt: action === 'delete' ? new Date() : null
            },
            update: {
                isDeleted: action === 'delete' ? true : undefined,
                isMuted: action === 'mute' ? true : action === 'unmute' ? false : undefined,
                lastDeletedAt: action === 'delete' ? new Date() : undefined
            }
        });

        return NextResponse.json({ success: true, state });
    } catch (error) {
        console.error('Failed to update conversation state:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
