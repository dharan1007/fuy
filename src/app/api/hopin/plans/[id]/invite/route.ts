import { NextResponse } from "next/server";
import { getServerSession } from '@/lib/auth';
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const planId = params.id;
        const { userId } = await req.json(); // User ID to invite

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        // Check if plan exists and user has permission (owner or member)
        const plan = await prisma.plan.findUnique({
            where: { id: planId },
            include: { members: true },
        });

        if (!plan) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        // Check if inviter is a member
        const isMember = plan.members.some((m) => m.userId === session.user.id);
        if (!isMember) {
            return NextResponse.json({ error: "You must be a member to invite others" }, { status: 403 });
        }

        // Check if user is already a member
        const existingMember = await prisma.planMember.findUnique({
            where: {
                planId_userId: {
                    planId,
                    userId,
                },
            },
        });

        if (existingMember) {
            return NextResponse.json({ error: "User is already a member or invited" }, { status: 400 });
        }

        // Create pending membership
        const member = await prisma.planMember.create({
            data: {
                planId,
                userId,
                status: "PENDING",
            },
        });

        // Create notification for the invited user
        await prisma.notification.create({
            data: {
                userId,
                type: "PLAN_INVITE",
                message: `${session.user.name || "Someone"} invited you to join the plan "${plan.title}"`,
                postId: planId, // Using postId field generically for resource ID
            },
        });

        return NextResponse.json(member);
    } catch (error) {
        console.error("Error inviting user:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
