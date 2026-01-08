// src/app/api/reco/feedback/route.ts
// Log user interactions for recommendation learning

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { logRecoFeedback, SCORE_WEIGHTS } from "@/lib/recommendation";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { contentId, contentType, action, source } = body;

        if (!contentId || !contentType || !action) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get slashes for this content
        let slashes: string[] = [];

        if (contentType === 'POST') {
            const post = await prisma.post.findUnique({
                where: { id: contentId },
                select: { slashes: { select: { tag: true } } }
            });
            slashes = post?.slashes.map(s => s.tag) || [];
        } else if (contentType === 'EVENT') {
            const plan = await prisma.plan.findUnique({
                where: { id: contentId },
                select: { slashes: true }
            });
            slashes = plan?.slashes ? JSON.parse(plan.slashes) : [];
        } else if (contentType === 'PRODUCT') {
            const product = await prisma.product.findUnique({
                where: { id: contentId },
                select: { tags: true }
            });
            slashes = Array.isArray(product?.tags) ? product.tags : [];
        }

        // Log the feedback
        await logRecoFeedback(
            user.id,
            contentId,
            contentType,
            action,
            slashes,
            source
        );

        // Update content embedding stats
        if (['W', 'L', 'CAP'].includes(action)) {
            await prisma.contentEmbedding.upsert({
                where: { contentId },
                create: {
                    contentId,
                    contentType,
                    slashes: JSON.stringify(slashes),
                    wCount: action === 'W' ? 1 : 0,
                    lCount: action === 'L' ? 1 : 0,
                    capCount: action === 'CAP' ? 1 : 0,
                    viewCount: 0,
                    shareCount: 0,
                },
                update: {
                    wCount: action === 'W' ? { increment: 1 } : undefined,
                    lCount: action === 'L' ? { increment: 1 } : undefined,
                    capCount: action === 'CAP' ? { increment: 1 } : undefined,
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Reco feedback error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// GET endpoint to check user's interaction history
export async function GET(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type") || "slashes";

        if (type === "slashes") {
            // Get user's top slash preferences
            const slashes = await prisma.slashInteraction.findMany({
                where: { userId: user.id },
                orderBy: { score: 'desc' },
                take: 30,
                select: { slashTag: true, score: true, positive: true, negative: true }
            });
            return NextResponse.json({ slashes });
        }

        if (type === "recent") {
            // Get recent feedback
            const recent = await prisma.recoFeedback.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: 'desc' },
                take: 20,
                select: { contentId: true, contentType: true, action: true, createdAt: true }
            });
            return NextResponse.json({ recent });
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    } catch (error: any) {
        console.error("Reco feedback GET error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
