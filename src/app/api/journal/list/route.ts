import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const userId = await requireUserId();
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "50");

        const entries = await prisma.journalEntry.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: limit,
        });

        // Parse JSON fields
        const parsedEntries = entries.map(e => ({
            ...e,
            blocks: e.blocks ? JSON.parse(e.blocks) : [],
            tags: e.tags ? JSON.parse(e.tags) : [],
            sensations: e.sensations ? JSON.parse(e.sensations) : [],
        }));

        return NextResponse.json({ entries: parsedEntries });
    } catch (error) {
        console.error("Error fetching journal entries:", error);
        return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
    }
}
