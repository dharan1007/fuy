import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function POST(req: NextRequest) {
    try {
        const userId = await requireUserId();
        const body = await req.json();
        const { postId, mediaUrl, mediaType = "VIDEO" } = body;

        if (!postId || !mediaUrl) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check for existing bubble by this user on this post
        const existingBubble = await prisma.reactionBubble.findFirst({
            where: {
                postId,
                userId
            }
        });

        if (existingBubble) {
            // Update existing bubble to be the "latest"
            await prisma.reactionBubble.update({
                where: { id: existingBubble.id },
                data: {
                    mediaUrl,
                    mediaType,
                    createdAt: new Date() // Bump to top
                }
            });

            // Clean up any other duplicates just in case (self-healing)
            if (Math.random() < 0.1) { // 10% chance to run cleanup to avoid perf hit every time
                await prisma.reactionBubble.deleteMany({
                    where: {
                        postId,
                        userId,
                        id: { not: existingBubble.id }
                    }
                });
            }
        } else {
            // Create new bubble
            await prisma.reactionBubble.create({
                data: {
                    userId,
                    postId,
                    mediaUrl,
                    mediaType,
                },
            });
        }

        // Fetch latest 3 (or all, limit in UI? UI handles slicing) 
        // User said "display the latest 3 reaction bubles by different users"
        // Since we enforce 1 per user now, we can just fetch latest 3.
        const bubbles = await prisma.reactionBubble.findMany({
            where: { postId },
            orderBy: { createdAt: "desc" }, // Latest first
            // take: 50, // Let's fetch more to allow "view all" in modal, or remove limit. 
            // If the list is huge, we might need pagination, but for now fetch all to support the modal list.
            include: {
                user: {
                    select: {
                        id: true,
                        profile: { select: { avatarUrl: true, displayName: true } }
                    }
                }
            }
        });

        const totalBubbles = await prisma.reactionBubble.count({
            where: { postId }
        });

        return NextResponse.json({ success: true, bubbles, totalBubbles });

    } catch (error: any) {
        console.error("Bubble upload error:", error);
        return NextResponse.json({ error: "Failed to add bubble" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const userId = await requireUserId();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        console.log(`[Bubble DELETE] Request received. User: ${userId}, BubbleID: ${id}`);

        if (!id) {
            console.log("[Bubble DELETE] Missing ID");
            return NextResponse.json({ error: "Missing bubble ID" }, { status: 400 });
        }

        const bubble = await prisma.reactionBubble.findUnique({
            where: { id }
        });

        console.log(`[Bubble DELETE] findUnique result:`, bubble);

        if (!bubble) {
            console.log("[Bubble DELETE] Bubble not found in DB");
            return NextResponse.json({ error: "Bubble not found" }, { status: 404 });
        }

        if (bubble.userId !== userId) {
            console.log(`[Bubble DELETE] Unauthorized. Owner: ${bubble.userId}, Requestor: ${userId}`);
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await prisma.reactionBubble.delete({
            where: { id }
        });

        console.log("[Bubble DELETE] Successfully deleted");
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Bubble delete error:", error);
        return NextResponse.json({ error: "Failed to delete bubble" }, { status: 500 });
    }
}
