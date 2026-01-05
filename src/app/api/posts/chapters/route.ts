export const dynamic = 'force-dynamic';
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
        const body = await req.json();
        const { title, description, content, visibility, mediaUrls, mediaTypes, linkedPostId, status = 'PUBLISHED' } = body;

        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { profile: true }
        });

        if (!currentUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Validate Linked Post Access if provided
        if (linkedPostId) {
            const parentPost = await prisma.post.findUnique({
                where: { id: linkedPostId },
                include: { chapterAccessRequests: true }
            });

            if (!parentPost) {
                return NextResponse.json({ error: 'Linked post not found' }, { status: 404 });
            }

            // Access Check logic
            const isOwner = parentPost.userId === currentUser.id;
            const isPublicAccess = parentPost.chapterAccessPolicy === 'PUBLIC';
            const hasAcceptedRequest = parentPost.chapterAccessRequests.some(
                r => r.requesterId === currentUser.id && r.status === 'ACCEPTED'
            );

            if (!isOwner && !isPublicAccess && !hasAcceptedRequest) {
                return NextResponse.json({ error: 'You do not have permission to connect to this post' }, { status: 403 });
            }
        }

        // Create the Post
        const newPost = await prisma.post.create({
            data: {
                userId: currentUser.id,
                content: content || description || '',
                postType: 'CHAPTER',
                visibility: visibility || 'PUBLIC',
                status,
                // Create the Chapter data
                chapterData: {
                    create: {
                        title: title || 'Untitled Chapter',
                        description: description,
                        linkedPostId: linkedPostId || null,
                    }
                },
                // Add media entries for standard compatibility via postMedia
                postMedia: {
                    create: (mediaUrls || []).map((url: string, index: number) => ({
                        media: {
                            create: {
                                url,
                                type: (mediaTypes || [])[index] || 'IMAGE',
                                userId: currentUser.id
                            }
                        }
                    }))
                }
            },
            include: {
                chapterData: true,
                postMedia: { include: { media: true } }
            }
        });

        // --- 1. Create FeedItem for the Chapter ---
        // Prepare media previews
        const mediaPreviews = (mediaUrls || []).map((url: string, i: number) => ({
            type: (mediaTypes || [])[i] || 'IMAGE',
            url,
            aspect: 1
        }));

        await prisma.feedItem.create({
            data: {
                userId: currentUser.id,
                postId: newPost.id,
                authorName: currentUser.profile?.displayName || currentUser.name || 'User',
                authorAvatarUrl: currentUser.profile?.avatarUrl,
                postType: 'CHAPTER',
                feature: 'OTHER', // Chapters don't strictly have a feature, use OTHER or similar
                contentSnippet: (description || content || title || "").slice(0, 200),
                mediaPreviews: JSON.stringify(mediaPreviews),
                createdAt: newPost.createdAt,
                likeCount: 0,
                commentCount: 0,
                shareCount: 0
            }
        });

        // --- 2. Send Notification to Linked Post Author ---
        if (linkedPostId) {
            const parentPost = await prisma.post.findUnique({
                where: { id: linkedPostId },
                select: { userId: true }
            });

            if (parentPost && parentPost.userId !== currentUser.id) {
                await prisma.notification.create({
                    data: {
                        userId: parentPost.userId,
                        type: "POST_MENTION", // Safe fallback
                        message: `${currentUser.profile?.displayName || currentUser.name} connected a chapter to your post`,
                        postId: newPost.id,
                        read: false,
                    }
                });
            }
        }

        return NextResponse.json({ success: true, post: newPost });

    } catch (error) {
        console.error('Error creating chapter:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
