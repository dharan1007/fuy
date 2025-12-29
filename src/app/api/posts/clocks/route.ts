import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cleanupExpiredStories } from '@/lib/cron';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { mediaUrl, mediaType, duration, visibility = 'PUBLIC', status = 'PUBLISHED' } = body;

        if (!mediaUrl) {
            return NextResponse.json({ error: 'Media URL is required' }, { status: 400 });
        }

        // Calculate expiration time based on duration (in hours)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (duration || 24));

        // Create the post with STORY type
        const post = await prisma.post.create({
            data: {
                userId: session.user.id,
                postType: 'STORY',
                content: '',
                visibility,
                status,
                expiresAt,
            },
        });

        // Create the Story data
        await prisma.story.create({
            data: {
                postId: post.id,
                duration: duration || 24,
            },
        });

        // Create media record
        await prisma.media.create({
            data: {
                postId: post.id,
                userId: session.user.id,
                url: mediaUrl,
                type: mediaType || 'IMAGE',
            },
        });

        // Fetch the complete post with relations
        const completePost = await prisma.post.findUnique({
            where: { id: post.id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        profile: { select: { avatarUrl: true } },
                    },
                },
                media: true,
                storyData: true,
            },
        });

        return NextResponse.json({ success: true, post: completePost });
    } catch (error: any) {
        console.error('Create clock/story error:', error);
        return NextResponse.json({ error: error.message || 'Failed to create clock' }, { status: 500 });
    }
}

// GET active stories (clocks) for the stories rail
export async function GET(request: NextRequest) {
    try {
        await cleanupExpiredStories();
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const limit = parseInt(searchParams.get('limit') || '20');

        const now = new Date();

        const where: any = {
            postType: 'STORY',
            visibility: 'PUBLIC',
            expiresAt: { gt: now }, // Only get non-expired stories
        };

        if (userId) {
            where.userId = userId;
        }

        const stories = await prisma.post.findMany({
            where,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        profile: { select: { avatarUrl: true } },
                    },
                },
                media: true,
                storyData: true,
            },
        });

        return NextResponse.json({ stories });
    } catch (error: any) {
        console.error('Get clocks/stories error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
