import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { messageId, tagType } = await req.json();

        if (!messageId || !tagType) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Insert tag
        await prisma.messageTag.create({
            data: {
                messageId,
                userId: user.id,
                tagType,
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error adding tag:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
