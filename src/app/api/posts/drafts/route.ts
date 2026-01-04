import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const userId = await requireUserId();

        const drafts = await prisma.post.findMany({
            where: {
                userId,
                status: "DRAFT",
            },
            orderBy: { createdAt: "desc" },
            include: {
                postMedia: { include: { media: true } },
                // Include type-specific data for preview
                pullUpDownData: {
                    include: { options: true }
                },
                chapterData: true,
                xrayData: true,
                lillData: true,
                fillData: true,
                audData: true,
                chanData: true,
                simpleData: true,
            },
        });

        const formattedDrafts = drafts.map((d: any) => ({
            ...d,
            media: d.postMedia?.map((pm: any) => pm.media) || []
        }));

        return NextResponse.json(formattedDrafts);
    } catch (error) {
        console.error("Error fetching drafts:", error);
        return NextResponse.json({ error: "Failed to fetch drafts" }, { status: 500 });
    }
}
