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
        const body = await req.json();
        const { title, description, content, visibility, mediaUrls, mediaTypes, linkedPostId, status = 'PUBLISHED' } = body;

        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
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
                        mediaUrls: JSON.stringify(mediaUrls || []),
                        mediaTypes: JSON.stringify(mediaTypes || []),
                        linkedPostId: linkedPostId || null,
                        // If linking to a chapter, logic for linkedChapterId could be inferred, but requirements say connect to "post"
                    }
                },
                // Add media entries for standard compatibility
                media: {
                    create: (mediaUrls || []).map((url: string, index: number) => ({
                        url,
                        type: (mediaTypes || [])[index] || 'IMAGE',
                        userId: currentUser.id
                    }))
                }
            },
            include: {
                chapterData: true
            }
        });

        return NextResponse.json({ success: true, post: newPost });

    } catch (error) {
        console.error('Error creating chapter:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
