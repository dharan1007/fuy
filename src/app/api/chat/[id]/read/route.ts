import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
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

        // Emit Supabase Broadcast for read receipts (Server-side broadcast)
        // Or cleaner: Client simply listens to DB changes on Message table (UPDATE readAt)
        // But updates are chatty. Let's rely on DB changes for 'postgres_changes' UPDATE event.

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error marking read:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
