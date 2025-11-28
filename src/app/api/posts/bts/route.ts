// src/app/api/posts/bts/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/session';

export async function POST(req: NextRequest) {
    try {
        const userId = await requireUserId();
        const body = await req.json();

        const {
            content,
            visibility = 'PUBLIC',
            feature = 'OTHER',
            credits, // array of {name, role, link}
            tools, // array of {name, category, link}
            mindmapData, // JSON structure
            links, // array of {title, url, description}
            resources, // array
        } = body;

        const post = await prisma.post.create({
            data: {
                userId,
                postType: 'BTS',
                feature,
                content: content || 'Behind the scenes',
                visibility,
                btsData: {
                    create: {
                        credits: credits ? JSON.stringify(credits) : null,
                        tools: tools ? JSON.stringify(tools) : null,
                        mindmapData: mindmapData ? JSON.stringify(mindmapData) : null,
                        links: links ? JSON.stringify(links) : null,
                        resources: resources ? JSON.stringify(resources) : null,
                    },
                },
            },
            include: {
                btsData: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        profile: { select: { displayName: true, avatarUrl: true } },
                    },
                },
            },
        });

        return NextResponse.json(post);
    } catch (error: any) {
        console.error('BTS creation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create BTS post' },
            { status: 500 }
        );
    }
}
