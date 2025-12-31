export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { planId, userIds } = body;

        if (!planId || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        // Verify plan ownership
        const plan = await prisma.plan.findUnique({
            where: { id: planId },
            include: { members: true }
        });

        if (!plan) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        if (plan.creatorId !== session.user.id) {
            return NextResponse.json({ error: "Only the creator can invite users" }, { status: 403 });
        }

        // Filter out users who are already members
        const existingMemberIds = new Set(plan.members.map(m => m.userId));
        const newInviteIds = userIds.filter((uid: string) => !existingMemberIds.has(uid));

        if (newInviteIds.length === 0) {
            return NextResponse.json({ success: true, message: "All users are already members or invited" });
        }

        // Create invites
        // We use createMany if supported, but PlanMember has default values and relations, so createMany is fine.
        // Wait, SQLite doesn't support createMany but Postgres does. The schema says postgresql.
        await prisma.planMember.createMany({
            data: newInviteIds.map((uid: string) => ({
                planId,
                userId: uid,
                status: "INVITED"
            })),
            skipDuplicates: true
        });

        // Send Notifications
        // We can do this in parallel
        await prisma.notification.createMany({
            data: newInviteIds.map((uid: string) => ({
                userId: uid,
                type: "HOPIN_INVITE",
                message: `${session.user.name || "A user"} invited you to join "${plan.title}"`,
                postId: planId // Using postId field to store planId for navigation? Or should we add planId to Notification? 
                // Checks schema: Notification has postId. We can overload it or add planId. 
                // For now, overloaded usage or just rely on the link in UI.
                // Better: Update Notification schema? No, too risky right now. 
                // We'll store a JSON link in message or rely on client parsing.
                // Actually, let's just use postId for now to store the ID, and the type implies it's a plan.
            }))
        });

        return NextResponse.json({ success: true, invitedCount: newInviteIds.length });

    } catch (error) {
        console.error("Invite Error:", error);
        return NextResponse.json({ error: "Failed to send invites" }, { status: 500 });
    }
}

