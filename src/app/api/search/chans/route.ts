export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q") || "";

    if (!query) {
        return NextResponse.json({ results: [] });
    }

    try {
        // Search Channels
        const channels = await prisma.chan.findMany({
            where: {
                OR: [
                    { channelName: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } }
                ]
            },
            include: {
                post: {
                    select: { userId: true }
                }
            },
            take: 5
        });

        // Search Shows
        const shows = await prisma.show.findMany({
            where: {
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } }
                ],
                isArchived: false
            },
            include: {
                chan: {
                    include: {
                        post: {
                            select: { userId: true }
                        }
                    }
                }
            },
            take: 5
        });

        const results = [
            ...channels.map(c => ({
                ...c,
                type: 'CHAN',
                userId: c.post.userId
            })),
            ...shows.map(s => ({
                ...s,
                type: 'SHOW',
                userId: s.chan.post.userId
            }))
        ];

        return NextResponse.json({ results });
    } catch (error) {
        console.error("Search chans error:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
