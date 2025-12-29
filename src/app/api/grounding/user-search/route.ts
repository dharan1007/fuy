export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// User Search for Gym Pals
export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q");

        if (!query || query.length < 2) return NextResponse.json([]);

        // Search by username (name) or exact profileCode
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { profileCode: { equals: query, mode: 'insensitive' } }
                ],
                NOT: { id: session.user.id } // Exclude self
            },
            take: 10,
            select: {
                id: true,
                name: true,
                profileCode: true,
                profile: {
                    select: {
                        avatarUrl: true,
                        city: true,
                        isOpenToWorkout: true
                    }
                }
            }
        });

        return NextResponse.json(users);

    } catch (error) {
        console.error("Search Error:", error);
        return new NextResponse("Error", { status: 500 });
    }
}
