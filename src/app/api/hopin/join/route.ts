export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function POST(req: NextRequest) {
    try {
        const userId = await requireUserId();
        const { planId } = await req.json();

        if (!planId) return NextResponse.json({ error: "Missing planId" }, { status: 400 });

        // Check if already a member
        const existing = await prisma.planMember.findUnique({
            where: {
                planId_userId: {
                    planId,
                    userId
                }
            }
        });

        if (existing) {
            return NextResponse.json({ error: "Already requested or joined" }, { status: 400 });
        }

        const plan = await prisma.plan.findUnique({ where: { id: planId } });
        if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

        // Create interest request
        await prisma.planMember.create({
            data: {
                planId,
                userId,
                status: "PENDING"
            }
        });

        // Notify Owner
        await prisma.notification.create({
            data: {
                userId: plan.creatorId,
                type: "HOPIN_INTEREST",
                message: "Someone is interested in your Hopin plan!",
                postId: planId, // Using postId field for planId generic link
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Join Plan Error:", error);
        return NextResponse.json({ error: "Failed to join plan" }, { status: 500 });
    }
}

