export const dynamic = 'force-dynamic';
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

        // We need to handle three cases:
        // 1. No reaction exists -> Create
        // 2. Reaction exists and type is same -> Delete (Toggle Off)
        // 3. Reaction exists and type is different -> Update

        // To handle race conditions (P2025: Record not found during update/delete, P2002: Unique constraint during create),
        // we will use a loop or strictly ordered try-catch blocks.
        // A simple approach is to try to find first.

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
                // TOGGLE OFF: Delete
                try {
                    await prisma.reaction.delete({
                        where: { id: existingReaction.id },
                    });
                } catch (error: any) {
                    // If P2025, it's already deleted. That's fine.
                    if (error.code !== 'P2025') {
                        throw error;
                    }
                }
            } else {
                // UPDATE TYPE
                try {
                    await prisma.reaction.update({
                        where: { id: existingReaction.id },
                        data: { type },
                    });
                } catch (error: any) {
                    if (error.code === 'P2025') {
                        // It was deleted concurrently. So we create it.
                        try {
                            await prisma.reaction.create({
                                data: { userId, postId, type },
                            });
                            // Send notification for creation
                            await sendNotification(userId, postId, type);
                        } catch (createError: any) {
                            if (createError.code === 'P2002') {
                                // Race! It was created again concurrently. Update it.
                                const retry = await prisma.reaction.findUnique({
                                    where: { userId_postId: { userId, postId } }
                                });
                                if (retry) {
                                    await prisma.reaction.update({
                                        where: { id: retry.id },
                                        data: { type }
                                    });
                                }
                            } else {
                                throw createError;
                            }
                        }
                    } else {
                        throw error;
                    }
                }
            }
        } else {
            // CREATE NEW
            try {
                await prisma.reaction.create({
                    data: { userId, postId, type },
                });
                await sendNotification(userId, postId, type);
            } catch (error: any) {
                if (error.code === 'P2002') {
                    // Race: It exists now.
                    const raceExisting = await prisma.reaction.findUnique({
                        where: { userId_postId: { userId, postId } }
                    });

                    if (raceExisting) {
                        if (raceExisting.type === type) {
                            // If user clicked multiple times, maybe they wanted to toggle off?
                            // But usually if we are here, we thought it didn't exist.
                            // To be safe and avoid flip-flopping endlessly on spam clicks, we ensure it matches the requested state.
                            // If it matches, we do nothing (it's already set).
                            // Or we could delete if we strictly follow toggle logic?
                            // Let's assume idempotency for "make it X" is safer for "Create" intent unless front-end explicitly sends "action: toggle".
                            // But standard UI is "click to toggle".
                            // Let's UPDATE to ensure it is the type we want. 

                        } else {
                            // Update to new type
                            try {
                                await prisma.reaction.update({
                                    where: { id: raceExisting.id },
                                    data: { type }
                                });
                            } catch (ign) { /* ignore P2025 here */ }
                        }
                    }
                } else {
                    throw error;
                }
            }
        }

        // Get updated counts (this might be slightly stale if we just wrote, but usually fine)
        const reactions = await prisma.reaction.groupBy({
            by: ["type"],
            where: { postId },
            _count: {
                type: true,
            },
        });

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

        const totalReactions = Object.values(counts).reduce((a, b) => a + b, 0);

        try {
            await prisma.feedItem.updateMany({
                where: { postId },
                data: { likeCount: totalReactions }
            });
        } catch (e) {
            console.error("Failed to update FeedItem likeCount", e);
        }

        // Get current status
        const current = await prisma.reaction.findUnique({
            where: { userId_postId: { userId, postId } },
            select: { type: true }
        });

        return NextResponse.json({
            success: true,
            counts,
            userReaction: current?.type || null
        });

    } catch (error: any) {
        console.error("Reaction error:", error);
        return NextResponse.json({ error: "Failed to react" }, { status: 500 });
    }
}

async function sendNotification(userId: string, postId: string, type: string) {
    try {
        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { userId: true }
        });

        if (post && post.userId !== userId) {
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
    } catch (e) {
        console.error("Failed to send reaction notification", e);
    }
}

