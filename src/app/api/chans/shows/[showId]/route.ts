
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
    request: NextRequest,
    { params }: { params: { showId: string } }
) {
    try {
        const show = await (prisma as any).show.findUnique({
            where: { id: params.showId },
            include: {
                chan: true,
                episodes: {
                    orderBy: {
                        episodeNumber: 'asc'
                    }
                }
            }
        });

        if (!show) {
            return NextResponse.json({ error: 'Show not found' }, { status: 404 });
        }

        return NextResponse.json(show);
    } catch (error) {
        console.error('Error fetching show:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { showId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { title, description, coverImageUrl, schedule, credits } = body;

        // Verify ownership via Channel -> Post
        const show = await (prisma as any).show.findUnique({
            where: { id: params.showId },
            include: { chan: { include: { post: true } } },
        });

        if (!show || show.chan.post.userId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const updatedShow = await (prisma as any).show.update({
            where: { id: params.showId },
            data: {
                title,
                description,
                coverImageUrl,
                schedule,
                credits,
            },
        });

        return NextResponse.json(updatedShow);
    } catch (error) {
        console.error('Error updating show:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { showId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify ownership
        const show = await (prisma as any).show.findUnique({
            where: { id: params.showId },
            include: { chan: { include: { post: true } } },
        });

        if (!show || show.chan.post.userId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await (prisma as any).show.delete({
            where: { id: params.showId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting show:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
