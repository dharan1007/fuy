// src/app/api/mobile/feed/route.ts
// Mobile-optimized feed endpoint - NO rate limiting for read operations
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
        const postType = searchParams.get('type');

        const where: any = { visibility: 'PUBLIC' };
        if (postType && postType !== 'mix') {
            const typeMap: Record<string, string> = {
                lills: 'LILL',
                fills: 'FILL',
                auds: 'AUD',
                channels: 'CHAN',
                chapters: 'CHAPTER',
                xrays: 'XRAY',
                pupds: 'PULLUPDOWN',
            };
            if (typeMap[postType]) {
                where.postType = typeMap[postType];
            }
        }

        const posts = await prisma.post.findMany({
            where,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        profile: { select: { avatarUrl: true, displayName: true } },
                    },
                },
                postMedia: { include: { media: true } },
                _count: {
                    select: { likes: true, comments: true },
                },
            },
        });

        const formattedPosts = posts.map((p: any) => ({
            id: p.id,
            content: p.content,
            postType: p.postType,
            createdAt: p.createdAt,
            likes: p._count?.likes || 0,
            comments: p._count?.comments || 0,
            user: {
                id: p.user?.id,
                name: p.user?.name,
                profile: p.user?.profile,
            },
            media: p.postMedia?.map((pm: any) => ({
                url: pm.media?.url,
                type: pm.media?.type,
            })) || [],
        }));

        return NextResponse.json({ posts: formattedPosts });
    } catch (error: any) {
        console.error('Mobile feed error:', error);
        return NextResponse.json({ error: error.message, posts: [] }, { status: 500 });
    }
}
