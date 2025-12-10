import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "../../../../lib/session";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const techniqueId = searchParams.get("techniqueId");

        if (!techniqueId) {
            return NextResponse.json({ error: "Technique ID required" }, { status: 400 });
        }

        const id = parseInt(techniqueId);

        // Get counts
        const [likes, dislikes, opinions] = await Promise.all([
            prisma.breathingReaction.count({
                where: { techniqueId: id, type: "LIKE" },
            }),
            prisma.breathingReaction.count({
                where: { techniqueId: id, type: "DISLIKE" },
            }),
            prisma.breathingReaction.findMany({
                where: { techniqueId: id, type: "OPINION" },
                select: { content: true, createdAt: true },
                orderBy: { createdAt: "desc" },
            }),
        ]);

        // Check user status if logged in
        let userReaction = null;
        try {
            const userId = await requireUserId();
            const reaction = await prisma.breathingReaction.findFirst({
                where: {
                    userId,
                    techniqueId: id,
                    type: { in: ["LIKE", "DISLIKE"] },
                },
            });
            if (reaction) userReaction = reaction.type;
        } catch (e) {
            // User not logged in, ignore
        }

        return NextResponse.json({
            likes,
            dislikes,
            opinions: opinions.map((o) => o.content).filter(Boolean),
            userReaction,
        });
    } catch (error) {
        console.error("Failed to fetch reactions:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const userId = await requireUserId();
        const body = await req.json();
        const { techniqueId, type, content } = body;

        if (!techniqueId || !type) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const id = parseInt(techniqueId);

        if (type === "OPINION") {
            if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });

            await prisma.breathingReaction.create({
                data: {
                    userId,
                    techniqueId: id,
                    type: "OPINION",
                    content,
                },
            });
        } else if (type === "LIKE" || type === "DISLIKE") {
            // Toggle logic
            const existing = await prisma.breathingReaction.findFirst({
                where: {
                    userId,
                    techniqueId: id,
                    type: { in: ["LIKE", "DISLIKE"] },
                },
            });

            if (existing) {
                if (existing.type === type) {
                    // Remove if same (toggle off)
                    await prisma.breathingReaction.delete({ where: { id: existing.id } });
                } else {
                    // Switch (like -> dislike or vice versa)
                    await prisma.breathingReaction.update({
                        where: { id: existing.id },
                        data: { type },
                    });
                }
            } else {
                // Create new
                await prisma.breathingReaction.create({
                    data: {
                        userId,
                        techniqueId: id,
                        type,
                    },
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Reaction failed:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
