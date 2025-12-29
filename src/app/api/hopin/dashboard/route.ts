export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
    try {
        const userId = await requireUserId();

        // Plans I created
        const createdPlans = await prisma.plan.findMany({
            where: { creatorId: userId },
            include: {
                _count: {
                    select: { members: true }
                },
                members: {
                    where: { status: { in: ["INTERESTED", "ACCEPTED", "VERIFIED"] } },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                profile: { select: { displayName: true, avatarUrl: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        // Plans I joined (or requested)
        const joinedPlans = await prisma.plan.findMany({
            where: {
                members: {
                    some: {
                        userId: userId,
                        status: { not: "REJECTED" }
                    }
                }
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        profile: { select: { displayName: true, avatarUrl: true } }
                    }
                },
                members: {
                    where: { userId: userId }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json({
            created: createdPlans,
            joined: joinedPlans
        });

    } catch (error) {
        console.error("Dashboard Fetch Error:", error);
        return NextResponse.json({ error: "Failed to fetch dashboard" }, { status: 500 });
    }
}
