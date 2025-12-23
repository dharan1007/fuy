import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET(req: Request) {
    try {
        const u = await getSessionUser();
        if (!u?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type") || "LIKES"; // LIKES, DISLIKES, CAPS, HISTORY, TAGS
        const filter = searchParams.get("filter") || "ALL"; // Post Type filter
        const sort = searchParams.get("sort") || "DESC"; // Date sort

        let data = [];

        const orderBy = { createdAt: sort === "ASC" ? "asc" : "desc" } as const;

        if (type === "LIKES" || type === "CAPS" || type === "DISLIKES") {
            // Fetch from Reactions
            // Assuming type mapping: LIKES -> 'W', DISLIKES -> 'L', CAPS -> 'CAP'
            const reactionType = type === "LIKES" ? "W" : type === "DISLIKES" ? "L" : "CAP";

            data = await prisma.reaction.findMany({
                where: {
                    userId: u.id,
                    type: reactionType,
                    post: filter !== "ALL" ? { postType: filter } : undefined
                },
                include: {
                    post: {
                        select: {
                            id: true,
                            content: true,
                            media: true,
                            user: { select: { name: true, profile: { select: { avatarUrl: true } } } },
                            postType: true,
                            createdAt: true
                        }
                    }
                },
                orderBy
            });
        } else if (type === "HISTORY") {
            // Fetch from ViewHistory
            data = await prisma.viewHistory.findMany({
                where: {
                    userId: u.id,
                    post: filter !== "ALL" ? { postType: filter } : undefined
                },
                include: {
                    post: {
                        select: {
                            id: true,
                            content: true,
                            media: true,
                            user: { select: { name: true, profile: { select: { avatarUrl: true } } } },
                            postType: true,
                            createdAt: true
                        }
                    }
                },
                orderBy: { viewedAt: sort === "ASC" ? "asc" : "desc" }
            });
        } else if (type === "TAGS") {
            // Fetch from PostTag
            data = await prisma.postTag.findMany({
                where: {
                    userId: u.id,
                    post: filter !== "ALL" ? { postType: filter } : undefined
                },
                include: {
                    post: {
                        select: {
                            id: true,
                            content: true,
                            media: true,
                            user: { select: { name: true, profile: { select: { avatarUrl: true } } } },
                            postType: true,
                            createdAt: true
                        }
                    }
                },
                orderBy
            });
        }

        return NextResponse.json({ data });
    } catch (e: any) {
        console.error("Activity API Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
