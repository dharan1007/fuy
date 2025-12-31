export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "../../../../lib/session";

export async function GET(req: Request) {
    try {
        const userId = await requireUserId();

        // Get all partners (sent or received)
        const partners = await prisma.gymPartner.findMany({
            where: {
                OR: [{ userId }, { partnerId: userId }],
            },
            include: {
                user: { select: { id: true, name: true, profile: { select: { avatarUrl: true } } } },
                partner: { select: { id: true, name: true, profile: { select: { avatarUrl: true } } } },
            },
        });

        const formatted = partners.map(p => {
            const isSender = p.userId === userId;
            const otherUser = isSender ? p.partner : p.user;
            return {
                id: p.id,
                partnerId: otherUser.id,
                name: otherUser.name,
                avatar: otherUser.profile?.avatarUrl,
                status: p.status,
                isSender, // To know if we can accept/reject (only receiver can)
            };
        });

        return NextResponse.json({ partners: formatted });
    } catch (error) {
        console.error("Failed to fetch gym partners:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const userId = await requireUserId();
        const body = await req.json();
        const { action, partnerId, requestId } = body;

        if (action === "REQUEST") {
            if (!partnerId) return NextResponse.json({ error: "Partner ID required" }, { status: 400 });

            // Check existing
            const existing = await prisma.gymPartner.findFirst({
                where: {
                    OR: [
                        { userId, partnerId },
                        { userId: partnerId, partnerId: userId },
                    ],
                },
            });

            if (existing) {
                return NextResponse.json({ error: "Request already exists" }, { status: 400 });
            }

            await prisma.gymPartner.create({
                data: {
                    userId,
                    partnerId,
                    status: "PENDING",
                },
            });

            return NextResponse.json({ success: true });
        }

        if (action === "ACCEPT" || action === "REJECT") {
            if (!requestId) return NextResponse.json({ error: "Request ID required" }, { status: 400 });

            const request = await prisma.gymPartner.findUnique({
                where: { id: requestId },
            });

            if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
            if (request.partnerId !== userId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

            if (action === "ACCEPT") {
                await prisma.gymPartner.update({
                    where: { id: requestId },
                    data: { status: "ACCEPTED" },
                });
            } else {
                await prisma.gymPartner.update({
                    where: { id: requestId },
                    data: { status: "REJECTED" },
                });
            }

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Gym partner action failed:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

