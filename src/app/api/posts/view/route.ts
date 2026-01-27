import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { postId } = await req.json();

        if (!postId) {
            return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
        }

        await prisma.post.update({
            where: { id: postId },
            data: {
                viewCount: {
                    increment: 1
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error incrementing view count:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
