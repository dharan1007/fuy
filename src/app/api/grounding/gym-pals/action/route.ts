import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// PUT: Accept or Reject request
// DELETE: Remove partner
export async function PUT(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

        const { requestId, action } = await req.json(); // action: "ACCEPT" | "REJECT"

        const request = await prisma.gymPartner.findUnique({
            where: { id: requestId }
        });

        if (!request) return new NextResponse("Request not found", { status: 404 });

        // Verify user is the recipient
        if (request.partnerId !== session.user.id) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        if (action === "REJECT") {
            await prisma.gymPartner.delete({ where: { id: requestId } });
            return NextResponse.json({ status: "REJECTED" });
        }

        if (action === "ACCEPT") {
            const updated = await prisma.gymPartner.update({
                where: { id: requestId },
                data: { status: "ACCEPTED" }
            });

            // Notify sender
            await prisma.notification.create({
                data: {
                    userId: request.userId,
                    type: "GYM_PARTNER_ACCEPTED",
                    message: `${session.user.name || 'User'} accepted your gym partner request!`,
                    read: false
                }
            });

            return NextResponse.json(updated);
        }

        return new NextResponse("Invalid action", { status: 400 });

    } catch (error) {
        console.error("Gym Pal Action Error:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
