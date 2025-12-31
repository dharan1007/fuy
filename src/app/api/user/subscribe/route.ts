export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function POST(req: NextRequest) {
    try {
        const subscriberId = await requireUserId();
        const { targetUserId } = await req.json();

        if (!targetUserId) {
            return NextResponse.json({ error: "Target user ID required" }, { status: 400 });
        }

        if (subscriberId === targetUserId) {
            return NextResponse.json({ error: "Cannot subscribe to yourself" }, { status: 400 });
        }

        // Check if already subscribed
        const existing = await prisma.subscription.findUnique({
            where: {
                subscriberId_subscribedToId: {
                    subscriberId,
                    subscribedToId: targetUserId
                }
            }
        });

        if (existing) {
            // Unsubscribe
            await prisma.$transaction([
                prisma.subscription.delete({
                    where: { id: existing.id }
                }),
                prisma.user.update({
                    where: { id: subscriberId },
                    data: { followingCount: { decrement: 1 } }
                }),
                prisma.user.update({
                    where: { id: targetUserId },
                    data: { followersCount: { decrement: 1 } }
                })
            ]);
            return NextResponse.json({ subscribed: false });
        } else {
            // Subscribe
            await prisma.$transaction([
                prisma.subscription.create({
                    data: {
                        subscriberId,
                        subscribedToId: targetUserId
                    }
                }),
                prisma.user.update({
                    where: { id: subscriberId },
                    data: { followingCount: { increment: 1 } }
                }),
                prisma.user.update({
                    where: { id: targetUserId },
                    data: { followersCount: { increment: 1 } }
                })
            ]);
            return NextResponse.json({ subscribed: true });
        }
    } catch (error) {
        console.error("Subscription error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

