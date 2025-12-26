
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET(req: Request) {
    try {
        const userId = await requireUserId();

        // Fetch hidden posts with some minimal info to display
        const hiddenPosts = await prisma.hiddenPost.findMany({
            where: { userId },
            include: {
                post: {
                    select: {
                        id: true,
                        content: true,
                        createdAt: true,
                        user: {
                            select: {
                                name: true,
                                profile: { select: { displayName: true } }
                            }
                        },
                        media: {
                            take: 1,
                            select: { url: true, type: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ hiddenPosts });
    } catch (error) {
        console.error("Get hidden posts error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const userId = await requireUserId();
        const { postId } = await req.json();

        if (!postId) {
            return NextResponse.json({ error: "Post ID required" }, { status: 400 });
        }

        await (prisma as any).hiddenPost.create({
            data: {
                userId,
                postId,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        // Ignore unique constraint violation (already hidden)
        if ((error as any).code === 'P2002') {
            return NextResponse.json({ success: true });
        }
        console.error("Hide post error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const userId = await requireUserId();
        const { searchParams } = new URL(req.url);
        const postId = searchParams.get("postId");

        if (!postId) {
            return NextResponse.json({ error: "Post ID required" }, { status: 400 });
        }

        await (prisma as any).hiddenPost.deleteMany({
            where: {
                userId,
                postId,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Unhide post error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
