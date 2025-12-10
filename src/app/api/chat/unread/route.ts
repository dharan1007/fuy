import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const unreadCount = await prisma.message.count({
            where: {
                // Message is in a conversation where user is a participant
                conversation: {
                    OR: [
                        { participantA: session.user.id },
                        { participantB: session.user.id },
                    ],
                },
                // Message was not sent by the user
                senderId: {
                    not: session.user.id,
                },
                // Message is not read
                readAt: null,
            },
        });

        return NextResponse.json({ count: unreadCount });
    } catch (error) {
        console.error('Error fetching unread messages count:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
