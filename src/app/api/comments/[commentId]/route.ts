
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";

export async function DELETE(
    req: NextRequest,
    { params }: { params: { commentId: string } }
) {
    const session = await getServerSession();
    const userId = session?.user?.id;

    if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { commentId } = params;

    const comment = await prisma.postComment.findUnique({
        where: { id: commentId },
        include: { post: true }
    });

    if (!comment) {
        return new NextResponse("Comment not found", { status: 404 });
    }

    // Allow delete if user is comment author OR post author
    if (comment.userId !== userId && comment.post.userId !== userId) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    await prisma.postComment.delete({
        where: { id: commentId }
    });

    return new NextResponse(null, { status: 204 });
}
