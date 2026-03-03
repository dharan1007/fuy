import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { logRecoFeedback } from "@/lib/recommendation";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const user = await getSessionUser();
        const userId = user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { contentId, contentType, action, tags } = body;

        if (!contentId || !contentType || !action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Log the mathematical feedback
        await logRecoFeedback(userId, contentId, contentType, action, tags, 'EXPLORE_SERVICE');

        // 2. Increment global Base Metrics if it's a POST
        if (contentType === 'POST') {
            const isImpression = action === 'VIEW' || action === 'FULL_WATCH' || action === 'LONG_VIEW';
            const isCap = action === 'CAP';

            if (isImpression) {
                // We track general impressions to form a baseline for creator trust tracking
                await prisma.post.update({
                    where: { id: contentId },
                    data: { impressions: { increment: 1 } }
                });

                // And add to total creator impressions
                const post = await prisma.post.findUnique({
                    where: { id: contentId },
                    select: { userId: true }
                });

                if (post) {
                    await prisma.user.update({
                        where: { id: post.userId },
                        data: { totalImpressions: { increment: 1 } }
                    });
                }
            }

            if (isCap) {
                // Direct cap metric storage to calculate trust ratios
                const post = await prisma.post.findUnique({
                    where: { id: contentId },
                    select: { userId: true }
                });

                if (post) {
                    await prisma.post.update({
                        where: { id: contentId },
                        data: { cappedCount: { increment: 1 } }
                    });

                    await prisma.user.update({
                        where: { id: post.userId },
                        data: { cappedCount: { increment: 1 } }
                    });
                }
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Error logging reco feedback:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
