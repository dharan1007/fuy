export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// Get Suggested Partners (Open to Workout)
export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

        // Fetch users who have isOpenToWorkout = true
        // and are NOT already partners or pending

        // 1. Get existing partners/pending IDs
        const existing = await prisma.gymPartner.findMany({
            where: {
                OR: [
                    { userId: session.user.id },
                    { partnerId: session.user.id }
                ]
            }
        });

        const excludedIds = existing.map(e => e.userId === session.user.id ? e.partnerId : e.userId);
        excludedIds.push(session.user.id); // Exclude self

        // 2. Find open users
        const suggestions = await prisma.user.findMany({
            where: {
                id: { notIn: excludedIds },
                profile: {
                    isOpenToWorkout: true
                }
            },
            take: 10,
            orderBy: { lastSeen: 'desc' }, // specific order if available, else randomish
            select: {
                id: true,
                name: true,
                profile: {
                    select: {
                        avatarUrl: true,
                        city: true,
                        interactionMode: true // e.g. "Chill", "Hardcore"
                    }
                }
            }
        });

        return NextResponse.json(suggestions);

    } catch (error) {
        console.error("Suggestions Error:", error);
        return new NextResponse("Error", { status: 500 });
    }
}
