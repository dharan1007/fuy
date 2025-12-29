
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = params;

        if (!id) {
            return new NextResponse('Post ID missing', { status: 400 });
        }

        const post = await prisma.post.findUnique({
            where: { id },
            // @ts-ignore - Prisma types lag
            include: {
                user: {
                    include: {
                        profile: {
                            select: {
                                displayName: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },
                media: true,
                slashes: true,
                likes: session?.user?.id ? { where: { userId: session.user.id } } : false, // Check if liked by current user
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                        shares: true, // Assuming relation or field exists
                    }
                }
            },
        } as any) as any;

        if (!post) {
            return new NextResponse('Post not found', { status: 404 });
        }

        // Increment view count (simple implementation, potentially debounced in real app)
        // We do this asynchronously to not block the response
        // prisma.post.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(console.error);

        // Format for frontend
        const formattedPost = {
            ...post,
            likesCount: post._count.likes,
            commentsCount: post._count.comments,
            sharesCount: post.shareCount || post._count.shares || 0,
            impressions: post.impressions || 0,
            hasLiked: post.likes?.length > 0
        };

        return NextResponse.json(formattedPost);

    } catch (error) {
        console.error('Error fetching post:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
