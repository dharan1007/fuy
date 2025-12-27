import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET: Search users to add as gym partner
// POST: Send a gym partner request
export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

        const { targetUserId } = await req.json();

        // Check if already partners or pending
        const existing = await prisma.gymPartner.findFirst({
            where: {
                OR: [
                    { userId: session.user.id, partnerId: targetUserId },
                    { userId: targetUserId, partnerId: session.user.id }
                ]
            }
        });

        if (existing) {
            return NextResponse.json({ error: "Request already exists or already partners" }, { status: 400 });
        }

        const request = await prisma.gymPartner.create({
            data: {
                userId: session.user.id,
                partnerId: targetUserId,
                status: "PENDING"
            }
        });

        // Send notification
        await prisma.notification.create({
            data: {
                userId: targetUserId,
                type: "GYM_PARTNER_REQUEST",
                message: `${session.user.name || 'someone'} wants to be your gym partner!`,
                read: false
            }
        });

        return NextResponse.json(request);

    } catch (error) {
        console.error("Gym Pal Request Error:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// GET: List gym partners and pending requests
export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

        const partners = await prisma.gymPartner.findMany({
            where: {
                OR: [
                    { userId: session.user.id },
                    { partnerId: session.user.id }
                ]
            },
            include: {
                user: { select: { id: true, name: true, profile: { select: { avatarUrl: true } } } },
                partner: { select: { id: true, name: true, profile: { select: { avatarUrl: true } } } }
            },
            orderBy: { updatedAt: 'desc' }
        });

        // Normalize data for frontend
        const normalized = partners.map(p => {
            const isSender = p.userId === session.user.id;
            // If I am sender, friend is partner. If I am receiver, friend is user (sender).
            const friend = isSender ? p.partner : p.user;

            return {
                id: p.id,
                status: p.status,
                isSender, // Useful for showing "Sent" vs "Accept/Reject" buttons
                friend: {
                    id: friend.id,
                    name: friend.name || "Unknown",
                    avatarUrl: friend.profile?.avatarUrl
                }
            };
        });

        return NextResponse.json(normalized);

    } catch (error) {
        console.error("Gym Pal List Error:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
