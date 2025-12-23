
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

// GET /api/friends/relations?type=BLOCKED|GHOSTED
export async function GET(req: Request) {
    try {
        const userId = await requireUserId();
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type");

        if (!type || !["BLOCKED", "GHOSTED"].includes(type)) {
            return NextResponse.json({ error: "Invalid type" }, { status: 400 });
        }

        const relations = await prisma.friendship.findMany({
            where: {
                userId,
                status: type,
            },
            include: {
                friend: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profile: {
                            select: {
                                avatarUrl: true,
                            },
                        },
                    },
                },
            },
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json({ relations });
    } catch (error) {
        console.error("Fetch relations error:", error);
        return NextResponse.json({ error: "Failed to fetch relations" }, { status: 500 });
    }
}

// PUT /api/friends/relations
// Body: { targetUserId: string, action: 'BLOCK' | 'GHOST' | 'UNBLOCK' | 'UNGHOST' }
export async function PUT(req: Request) {
    try {
        const userId = await requireUserId();
        const { targetUserId, action } = await req.json();

        if (!targetUserId || !action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Determine the new status based on action
        let newStatus = "";
        if (action === "BLOCK") newStatus = "BLOCKED";
        else if (action === "GHOST") newStatus = "GHOSTED";
        else if (action === "UNBLOCK" || action === "UNGHOST") newStatus = "ACCEPTED"; // Or null? Usually reverts to nothing or accepted? 
        // Wait, if I block someone I'm not friends with, and then unblock, we shouldn't become friends.
        // If I block a friend, and unblock, we might need to be friends again or reset to nothing.
        // Converting simple logic: "UNBLOCK" -> Delete the friendship record (reset connection).

        if (action === "UNBLOCK" || action === "UNGHOST") {
            // Remove the block/ghost record entirely
            await prisma.friendship.deleteMany({
                where: {
                    userId,
                    friendId: targetUserId,
                    status: { in: ["BLOCKED", "GHOSTED"] } // Only delete if it matches the blocked/ghosted state
                }
            });
            return NextResponse.json({ success: true, message: "Relation removed" });
        }

        // Upsert the friendship status
        // If A blocks B:
        // We create/update record where userId=A, friendId=B, status=BLOCKED.
        await prisma.friendship.upsert({
            where: {
                userId_friendId: {
                    userId,
                    friendId: targetUserId,
                },
            },
            create: {
                userId,
                friendId: targetUserId,
                status: newStatus,
            },
            update: {
                status: newStatus,
            },
        });

        // If Blocking, we should also ensure the reverse relationship (if any) doesn't imply friendship?
        // Usually blocking is 1-way but effectively cuts 2-way communication.
        // For simplicity, we just track that A blocked B.

        return NextResponse.json({ success: true, status: newStatus });

    } catch (error) {
        console.error("Update relation error:", error);
        return NextResponse.json({ error: "Failed to update relation" }, { status: 500 });
    }
}
