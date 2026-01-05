export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getServerSession, authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q")?.toLowerCase() || "";

        if (!query || query.length < 2) {
            return NextResponse.json({ events: [], places: [] });
        }

        // Search events in database
        const events = await prisma.plan.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { visibility: "PUBLIC" },
                            { creatorId: session.user.id },
                            { members: { some: { userId: session.user.id } } }
                        ]
                    },
                    {
                        OR: [
                            { title: { contains: query, mode: 'insensitive' } },
                            { description: { contains: query, mode: 'insensitive' } },
                            { location: { contains: query, mode: 'insensitive' } },
                            { slashes: { contains: query, mode: 'insensitive' } }
                        ]
                    }
                ]
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        profile: { select: { avatarUrl: true } }
                    }
                },
                _count: { select: { members: true } }
            },
            take: 10,
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json({
            events,
            places: [] // Places are fetched client-side via Overpass
        });
    } catch (error) {
        console.error("Error searching events:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
