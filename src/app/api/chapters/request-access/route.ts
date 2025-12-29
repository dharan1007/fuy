import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { targetPostId } = await req.json();

        if (!targetPostId) {
            return NextResponse.json({ error: 'Missing targetPostId' }, { status: 400 });
        }

        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!currentUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check if request already exists
        const existingRequest = await prisma.chapterAccessRequest.findUnique({
            where: {
                requesterId_targetPostId: {
                    requesterId: currentUser.id,
                    targetPostId: targetPostId
                }
            }
        });

        if (existingRequest) {
            return NextResponse.json({ message: 'Request already sent', status: existingRequest.status });
        }

        const newRequest = await prisma.chapterAccessRequest.create({
            data: {
                requesterId: currentUser.id,
                targetPostId: targetPostId,
                status: 'PENDING'
            }
        });

        // TODO: Notify post owner

        return NextResponse.json({ success: true, request: newRequest });

    } catch (error) {
        console.error('Error requesting chapter access:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
