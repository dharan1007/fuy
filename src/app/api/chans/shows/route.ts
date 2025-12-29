
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    // 1. Get the user's Chan ID
    const chanPost = await prisma.post.findFirst({
        where: { userId: session.user.id, feature: 'CHAN' },
        include: { chanData: true }
    });

    if (!chanPost || !chanPost.chanData) {
        return new NextResponse("Channel not found", { status: 404 });
    }

    const body = await req.json();
    const { title, description, coverUrl, schedule, credits } = body;

    try {
        const show = await (prisma as any).show.create({
            data: {
                chanId: chanPost.chanData.id,
                title,
                description,
                coverUrl,
                schedule,
                credits,
            }
        });
        return NextResponse.json(show);
    } catch (error) {
        console.error(error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    // Check for bulk delete body
    let idsToDelete: string[] = [];
    if (id) {
        idsToDelete = [id];
    } else {
        try {
            const body = await req.json();
            if (body.ids && Array.isArray(body.ids)) {
                idsToDelete = body.ids;
            }
        } catch (e) {
            // No body or invalid json
        }
    }

    if (idsToDelete.length === 0) return new NextResponse("Missing IDs", { status: 400 });

    try {
        // Verify ownership for ALL shows
        const shows = await (prisma as any).show.findMany({
            where: { id: { in: idsToDelete } },
            include: { chan: { include: { post: true } } }
        });

        // Ensure all belong to user
        const unauthorized = shows.some((s: any) => s.chan.post.userId !== session.user.id);
        if (unauthorized) return new NextResponse("Forbidden", { status: 403 });

        // Delete (Cascade handles episodes)
        await (prisma as any).show.deleteMany({
            where: { id: { in: idsToDelete } }
        });

        return NextResponse.json({ success: true, count: idsToDelete.length });
    } catch (error) {
        console.error(error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return new NextResponse("Unauthorized", { status: 401 });

    try {
        const body = await req.json();
        const { ids, action } = body; // action: 'ARCHIVE' | 'RESTORE'

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return new NextResponse("Missing IDs", { status: 400 });
        }

        // Verify ownership
        const shows = await (prisma as any).show.findMany({
            where: { id: { in: ids } },
            include: { chan: { include: { post: true } } }
        });

        const unauthorized = shows.some((s: any) => s.chan.post.userId !== session.user.id);
        if (unauthorized) return new NextResponse("Forbidden", { status: 403 });

        const isArchived = action === 'ARCHIVE';

        await (prisma as any).show.updateMany({
            where: { id: { in: ids } },
            data: { isArchived }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
