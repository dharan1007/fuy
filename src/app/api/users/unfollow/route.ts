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

        if (!targetUserId) {
            return NextResponse.json({ error: "Invalid user" }, { status: 400 });
        }

        // Delete subscription transaction
        await prisma.$transaction([
            prisma.subscription.deleteMany({
                where: {
                    subscriberId: session.user.id,
                    subscribedToId: targetUserId,
                },
            }),
            prisma.user.update({
                where: { id: session.user.id },
                data: { followingCount: { decrement: 1 } },
            }),
            prisma.user.update({
                where: { id: targetUserId },
                data: { followersCount: { decrement: 1 } },
            }),
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error unfollowing user:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
