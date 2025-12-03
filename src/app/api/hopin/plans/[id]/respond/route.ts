import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
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
        const { action } = await req.json(); // "ACCEPT" or "DECLINE"

        if (!["ACCEPT", "DECLINE"].includes(action)) {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        const member = await prisma.planMember.findUnique({
            where: {
                planId_userId: {
                    planId,
                    userId: session.user.id,
                },
            },
        });

        if (!member) {
            return NextResponse.json({ error: "Invite not found" }, { status: 404 });
        }

        if (member.status !== "PENDING") {
            return NextResponse.json({ error: "Invite already responded to" }, { status: 400 });
        }

        if (action === "ACCEPT") {
            const updated = await prisma.planMember.update({
                where: { id: member.id },
                data: { status: "ACCEPTED" },
            });
            return NextResponse.json(updated);
        } else {
            // If declined, we can delete the record or mark as DECLINED. 
            // Deleting allows re-invite later easily.
            await prisma.planMember.delete({
                where: { id: member.id },
            });
            return NextResponse.json({ message: "Declined" });
        }

    } catch (error) {
        console.error("Error responding to invite:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
