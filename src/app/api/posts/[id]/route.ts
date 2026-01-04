
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
                postMedia: { include: { media: true } },
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
            media: post.postMedia?.map((pm: any) => pm.media) || [],
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

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { id } = params;
        if (!id) return new NextResponse('Post ID missing', { status: 400 });

        const post = await prisma.post.findUnique({
            where: { id },
            select: { userId: true }
        });

        if (!post) return new NextResponse('Post not found', { status: 404 });

        if (post.userId !== session.user.id) {
            // Check for admin/mod role if applicable, otherwise forbid
            return new NextResponse('Forbidden', { status: 403 });
        }

        await prisma.post.delete({
            where: { id }
        });

        // Also clean up Feeditems if any
        await prisma.feedItem.deleteMany({
            where: { postId: id }
        });

        return new NextResponse(null, { status: 204 });

    } catch (error) {
        console.error('Error deleting post:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
