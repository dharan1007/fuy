import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const userId = await requireUserId();

        const activities = await prisma.bondingActivity.findMany({
            where: {
                userId: userId,
            },
            orderBy: {
                startedAt: 'desc',
            },
            take: 20, // Limit to recent activities
            include: {
                user: {
                    select: {
                        id: true,
                        profile: { select: { displayName: true, avatarUrl: true } }
                    }
                }
            }
        });

        // Enhance activities with partner info if needed, though partnerId is just a string.
        // We can fetch partner profiles if we want to display names.
        const partnerIds = activities.map(a => a.partnerId).filter(Boolean) as string[];
        const partners = await prisma.user.findMany({
            where: { id: { in: partnerIds } },
            select: {
                id: true,
                profile: { select: { displayName: true, avatarUrl: true } }
            }
        });

        const partnerMap = new Map(partners.map(p => [p.id, p]));

        const enrichedActivities = activities.map(activity => ({
            ...activity,
            partner: activity.partnerId ? partnerMap.get(activity.partnerId) : null
        }));

        return NextResponse.json({ activities: enrichedActivities });

    } catch (error: any) {
        logger.error("Fetch bonding activity error:", error);
        return NextResponse.json(
            { error: "Failed to fetch activities" },
            { status: 500 }
        );
    }
}
