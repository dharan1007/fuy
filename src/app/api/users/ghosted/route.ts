export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

// GET: Fetch all friendships ghosted by the current user
export async function GET() {
    try {
        const userId = await requireUserId();

        const ghostedFriendships = await prisma.friendship.findMany({
            where: {
                isGhosted: true,
                ghostedBy: userId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profile: {
                            select: {
                                avatarUrl: true,
                                bio: true,
                            }
                        }
                    }
                },
                friend: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profile: {
                            select: {
                                avatarUrl: true,
                                bio: true,
                            }
                        }
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        // Return the ghosted user (the other person, not the current user)
        const ghostedRequests = ghostedFriendships.map((f) => {
            const otherUser = f.userId === userId ? f.friend : f.user;
            return {
                id: f.id,
                user: otherUser,
                updatedAt: f.updatedAt.toISOString(),
            };
        });

        return NextResponse.json({ ghostedRequests });

    } catch (error: any) {
        console.error("Fetch ghosted requests error:", error);
        if (error?.message === "UNAUTHENTICATED") {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }
        return NextResponse.json({ error: "Failed to fetch ghosted requests" }, { status: 500 });
    }
}

// PUT: Remove ghost status from a friendship
export async function PUT(req: Request) {
    try {
        const userId = await requireUserId();
        const { friendshipId } = await req.json();

        if (!friendshipId) {
            return NextResponse.json({ error: "friendshipId is required" }, { status: 400 });
        }

        // Verify the friendship exists and was ghosted by the current user
        const friendship = await prisma.friendship.findFirst({
            where: {
                id: friendshipId,
                isGhosted: true,
                ghostedBy: userId,
            }
        });

        if (!friendship) {
            return NextResponse.json({ error: "Ghosted friendship not found" }, { status: 404 });
        }

        await prisma.friendship.update({
            where: { id: friendshipId },
            data: {
                isGhosted: false,
                ghostedBy: null,
            }
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Remove ghost error:", error);
        if (error?.message === "UNAUTHENTICATED") {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }
        return NextResponse.json({ error: "Failed to remove ghost status" }, { status: 500 });
    }
}
