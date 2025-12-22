
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const {
        showId,
        title,
        description,
        episodeNumber,
        coverUrl,
        videoUrl,
        duration,
        releaseDate,
        isLive,
        credits
    } = body;

    try {
        // Verify ownership of the show through the channel
        const show = await (prisma as any).show.findUnique({
            where: { id: showId },
            include: { chan: { include: { post: true } } }
        });

        if (!show || show.chan.post.userId !== session.user.id) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const episode = await (prisma as any).episode.create({
            data: {
                showId,
                title,
                description,
                episodeNumber,
                coverUrl,
                videoUrl,
                duration,
                releaseDate: releaseDate ? new Date(releaseDate) : null,
                isLive,
                credits
            }
        });
        return NextResponse.json(episode);
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
    if (!id) return new NextResponse("Missing ID", { status: 400 });

    try {
        // Verify ownership
        const episode = await (prisma as any).episode.findUnique({
            where: { id },
            include: { show: { include: { chan: { include: { post: true } } } } }
        });

        if (!episode || episode.show.chan.post.userId !== session.user.id) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        await (prisma as any).episode.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
