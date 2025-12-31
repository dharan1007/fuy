export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function POST(req: NextRequest) {
    try {
        const userId = await requireUserId();
        const { planId, code } = await req.json();

        if (!planId || !code) return NextResponse.json({ error: "Missing data" }, { status: 400 });

        // Find the member with this code in this plan
        const member = await prisma.planMember.findFirst({
            where: {
                planId,
                verificationCode: code,
                status: "ACCEPTED"
            },
            include: { user: true }
        });

        if (!member) {
            return NextResponse.json({ error: "Invalid code or user not accepted" }, { status: 404 });
        }

        // Verify ownership
        const plan = await prisma.plan.findUnique({ where: { id: planId } });
        if (!plan || plan.creatorId !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        if (member.isVerified) {
            return NextResponse.json({ success: true, alreadyVerified: true, user: member.user });
        }

        // Mark verified
        await prisma.planMember.update({
            where: { id: member.id },
            data: { isVerified: true }
        });

        // Notify Member
        await prisma.notification.create({
            data: {
                userId: member.userId,
                type: "HOPIN_VERIFIED",
                message: `You have been verified for ${plan.title}! Have fun!`,
                postId: planId
            }
        });

        return NextResponse.json({ success: true, user: member.user });

    } catch (error) {
        console.error("Verify Error:", error);
        return NextResponse.json({ error: "Verification failed" }, { status: 500 });
    }
}

