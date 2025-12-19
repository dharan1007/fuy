import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function POST(req: NextRequest) {
    try {
        const userId = await requireUserId();
        const body = await req.json();
        const { postId, type } = body;

        if (!postId || !type) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check if reaction exists
        const existingReaction = await prisma.reaction.findUnique({
            where: {
                userId_postId: {
                    userId,
                    postId,
                },
            },
        });

        if (existingReaction) {
            if (existingReaction.type === type) {
                // Toggle off (remove)
                try {
                    await prisma.reaction.delete({
                        where: { id: existingReaction.id },
                    });
                } catch (error: any) {
                    // P2025: Record to delete does not exist.
                    // This is fine, it means it was already deleted by another request.
                    if (error.code !== 'P2025') {
                        throw error;
                    }
                }
            } else {
                // Change type
                // We use update, but if it was deleted in the meantime, this might fail with P2025.
                // If it fails, we should try to create it.
                try {
                    await prisma.reaction.update({
                        where: { id: existingReaction.id },
                        data: { type },
                    });
                } catch (error: any) {
                    if (error.code === 'P2025') {
                        // It was deleted, so we create it
                        try {
                            await prisma.reaction.create({
                                data: { userId, postId, type },
                            });
                            // Note: We skip notification here for simplicity in this edge case resilience
                        } catch (createError: any) {
                            if (createError.code === 'P2002') {
                                // Double race! It exists again. Update it.
                                const retryReaction = await prisma.reaction.findUnique({
                                    where: { userId_postId: { userId, postId } }
                                });
                                if (retryReaction) {
                                    await prisma.reaction.update({
                                        where: { id: retryReaction.id },
                                        data: { type }
                                    });
                                }
                            }
                        }
                    } else {
                        throw error;
                    }
                }
            }
        } else {
            // Create new
            try {
                const newReaction = await prisma.reaction.create({
                    data: {
                        userId,
                        postId,
                        type,
                    },
                });

                // Create notification if not reacting to own post
                const post = await prisma.post.findUnique({
                    where: { id: postId },
                    select: { userId: true }
                });

                if (post && post.userId !== userId) {
                    // Get reactor name
                    const reactor = await prisma.user.findUnique({
                        where: { id: userId },
                        select: { name: true, profile: { select: { displayName: true } } }
                    });
                    const reactorName = reactor?.profile?.displayName || reactor?.name || "Someone";

                    await prisma.notification.create({
                        data: {
                            userId: post.userId,
                            type: "REACTION",
                            message: `${reactorName} reacted with ${type} to your post`,
                            postId: postId,
                        },
                    });
                }
            } catch (error: any) {
                if (error.code === 'P2002') {
                    // Race condition: It was created just now by another request.
                    // We should update it to the requested type to be sure.
                    const existing = await prisma.reaction.findUnique({
                        where: { userId_postId: { userId, postId } }
                    });
                    if (existing) {
                        if (existing.type === type) {
                            // If it's the same type, and we were trying to create, we are good.
                            // But maybe we wanted to toggle?
                            // Since we thought it didn't exist, we intended to "Add".
                            // If it exists now, "Adding" again ensures it's there.
                            // However, if the user clicked fast to Toggle, we might want to delete.
                            // But complying with the "Create" intent is safer for state convergence than guessing toggle.
                        } else {
                            // Update type
                            await prisma.reaction.update({
                                where: { id: existing.id },
                                data: { type }
                            });
                        }
                    }
                } else {
                    throw error;
                }
            }
        }

        // Get updated counts
        const reactions = await prisma.reaction.groupBy({
            by: ["type"],
            where: { postId },
            _count: {
                type: true,
            },
        });

        // Format counts
        const counts = {
            W: 0,
            L: 0,
            CAP: 0,
            FIRE: 0,
        };

        reactions.forEach((r) => {
            if (Object.keys(counts).includes(r.type)) {
                counts[r.type as keyof typeof counts] = r._count.type;
            }
        });

        // Get user's current reaction
        const currentReaction = await prisma.reaction.findUnique({
            where: { userId_postId: { userId, postId } },
            select: { type: true }
        });

        return NextResponse.json({
            success: true,
            counts,
            userReaction: currentReaction?.type || null
        });

    } catch (error: any) {
        console.error("Reaction error:", error);
        return NextResponse.json({ error: "Failed to react" }, { status: 500 });
    }
}
