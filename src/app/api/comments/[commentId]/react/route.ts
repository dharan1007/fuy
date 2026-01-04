
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";

export async function POST(
    req: NextRequest,
    { params }: { params: { commentId: string } }
) {
    const session = await getServerSession();
    const userId = session?.user?.id;

    if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { commentId } = params;
    const body = await req.json();
    const { type } = body; // "W", "L", "CAP", "FIRE"

    if (!type) {
        // Toggle off if type is missing? Or dedicated delete?
        // Let's assume sending type toggles it or updates it.
        // Actually typical pattern is if same type exists, remove it. If different, update it.
        return new NextResponse("Missing type", { status: 400 });
    }

    const existingReaction = await prisma.commentReaction.findUnique({
        where: {
            userId_commentId: {
                userId,
                commentId
            }
        }
    });

    if (existingReaction) {
        if (existingReaction.type === type) {
            // Remove reaction (toggle off)
            await prisma.commentReaction.delete({
                where: { id: existingReaction.id }
            });
            return NextResponse.json({ status: "removed" });
        } else {
            // Update reaction
            const updated = await prisma.commentReaction.update({
                where: { id: existingReaction.id },
                data: { type }
            });
            return NextResponse.json(updated);
        }
    } else {
        // Create new reaction
        const newReaction = await prisma.commentReaction.create({
            data: {
                userId,
                commentId,
                type
            }
        });
        return NextResponse.json(newReaction);
    }
}
