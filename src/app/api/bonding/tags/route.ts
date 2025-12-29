import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const body = await request.json();
        const { messageId, profileId, tagType, taggedContent, note } = body;

        if (!messageId || !profileId || !tagType) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const tag = await prisma.messageTag.create({
            data: {
                userId: user.id,
                profileId,
                messageId,
                tagType,
                taggedContent,
                note,
            },
        });

        return NextResponse.json(tag);

    } catch (error) {
        console.error('Error creating message tag:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const tagId = searchParams.get('id');

        if (!tagId) {
            return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 });
        }

        // Verify ownership
        const tag = await prisma.messageTag.findUnique({
            where: { id: tagId },
        });

        if (!tag) {
            return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
        }

        // Get user id to verify
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
        });

        if (tag.userId !== user?.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.messageTag.delete({
            where: { id: tagId },
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error deleting tag:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
