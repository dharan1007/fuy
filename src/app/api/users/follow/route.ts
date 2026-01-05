export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { targetUserId } = await req.json();

        if (!targetUserId || targetUserId === session.user.id) {
            return NextResponse.json({ error: "Invalid user" }, { status: 400 });
        }

        // Check if subscription already exists
        const existing = await prisma.subscription.findUnique({
            where: {
                subscriberId_subscribedToId: {
                    subscriberId: session.user.id,
                    subscribedToId: targetUserId,
                },
            },
        });

        if (existing) {
            return NextResponse.json({ success: true, message: "Already following" });
        }

        // Create subscription transaction
        await prisma.$transaction([
            prisma.subscription.create({
                data: {
                    subscriberId: session.user.id,
                    subscribedToId: targetUserId,
                },
            }),
            prisma.user.update({
                where: { id: session.user.id },
                data: { followingCount: { increment: 1 } },
            }),
            prisma.user.update({
                where: { id: targetUserId },
                data: { followersCount: { increment: 1 } },
            }),
            // Create notification for the target user
            prisma.notification.create({
                data: {
                    userId: targetUserId,
                    type: "FOLLOW",
                    message: `${session.user.name || "Someone"} started following you.`,
                    postId: session.user.id, // Link to profile
                },
            }),
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error following user:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
