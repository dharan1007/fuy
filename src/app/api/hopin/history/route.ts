import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const userId = await requireUserId();
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "20");

        const posts = await prisma.post.findMany({
            where: {
                userId,
                feature: "CALM",
            },
            orderBy: { createdAt: "desc" },
            take: limit,
        });

        // Parse the JSON content back into session objects
        const sessions = posts.map(p => {
            try {
                const data = JSON.parse(p.content);
                return {
                    id: p.id,
                    ts: p.createdAt.getTime(),
                    ...data
                };
            } catch (e) {
                return null;
            }
        }).filter(Boolean);

        return NextResponse.json({ sessions });
    } catch (error) {
        console.error("Error fetching hopin history:", error);
        return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
    }
}
