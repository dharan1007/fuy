export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    // Find Chan post where userId matches
    const chanPost = await prisma.post.findFirst({
        where: {
            userId: session.user.id,
            feature: 'CHAN',
        },
        include: {
            chanData: {
                include: {
                    shows: {
                        where: { isArchived: false },
                        include: {
                            episodes: true
                        }
                    }
                }
            },
            _count: {
                select: {
                    likes: true,
                    comments: true,
                    reactions: true
                }
            }
        }
    });

    if (!chanPost || !chanPost.chanData) {
        return NextResponse.json(null); // No channel yet
    }

    const chanData = chanPost.chanData;
    const shows = chanData.shows || [];
    const activeShows = shows.filter((s: any) => !s.isArchived);

    // Calculate Stats
    // Vibes: Total engagement on the channel post
    const vibesCount = (chanPost._count?.likes || 0) +
        (chanPost._count?.comments || 0) +
        (chanPost._count?.reactions || 0);

    // Content Hours: Sum durations of all episodes
    let totalSeconds = 0;
    shows.forEach((show: any) => {
        (show.episodes || []).forEach((ep: any) => {
            totalSeconds += (ep.duration || 0);
        });
    });
    const contentHours = (totalSeconds / 3600).toFixed(1);

    return NextResponse.json({
        ...chanData,
        id: chanData.id,
        postId: chanPost.id,
        stats: {
            vibes: vibesCount,
            activeShows: activeShows.length,
            contentHours: contentHours,
            subscriberCount: chanData.subscriberCount || 0
        }
    });
}
