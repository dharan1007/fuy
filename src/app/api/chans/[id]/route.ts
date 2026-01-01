export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const chanId = params.id;

        const channel = await prisma.chan.findUnique({
            where: { id: chanId },
            include: {
                post: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                profile: {
                                    select: {
                                        displayName: true,
                                        avatarUrl: true,
                                        bio: true
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
                },
                shows: {
                    where: { isArchived: false },
                    include: {
                        episodes: {
                            orderBy: { episodeNumber: 'asc' }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!channel) {
            return new NextResponse("Channel not found", { status: 404 });
        }

        // Calculate stats
        const vibesCount = (channel.post._count?.likes || 0) +
            (channel.post._count?.comments || 0) +
            (channel.post._count?.reactions || 0);

        let totalSeconds = 0;
        channel.shows.forEach((show: any) => {
            show.episodes.forEach((ep: any) => {
                totalSeconds += (ep.duration || 0);
            });
        });
        const contentHours = (totalSeconds / 3600).toFixed(1);

        return NextResponse.json({
            ...channel,
            stats: {
                vibes: vibesCount,
                activeShows: channel.shows.length,
                contentHours: contentHours,
                subscriberCount: channel.subscriberCount || 0
            }
        });
    } catch (error) {
        console.error("Error fetching channel details:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
