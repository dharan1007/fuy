import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { requestId, action } = await req.json(); // action: ACCEPT or REJECT

        if (!requestId || !action) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Verify ownership of the post related to the request
        const request = await prisma.chapterAccessRequest.findUnique({
            where: { id: requestId },
            include: { targetPost: true }
        });

        if (!request) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        if (request.targetPost.userId !== currentUser.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const updatedRequest = await prisma.chapterAccessRequest.update({
            where: { id: requestId },
            data: { status: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED' }
        });

        // TODO: Notify requester

        return NextResponse.json({ success: true, request: updatedRequest });

    } catch (error) {
        console.error('Error managing chapter request:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
