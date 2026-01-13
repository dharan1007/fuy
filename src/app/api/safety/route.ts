
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const userId = await requireUserId();

        const [blocked, blockedBy, ghosted, hidden] = await Promise.all([
            // Who I blocked
            prisma.blockedUser.findMany({
                where: { blockerId: userId },
                include: {
                    blocked: { // Changed from user
                        select: {
                            id: true,
                            name: true,
                            profile: { select: { displayName: true, avatarUrl: true } }
                        }
                    }
                }
            }),
            // Who blocked me
            prisma.blockedUser.findMany({
                where: { blockedId: userId },
                select: { blockerId: true }
            }),
            // Who I ghosted (muted)
            prisma.mutedUser.findMany({
                where: { muterId: userId },
                include: {
                    mutedUser: { // Changed from user
                        select: {
                            id: true,
                            name: true,
                            profile: { select: { displayName: true, avatarUrl: true } }
                        }
                    }
                }
            }),
            // Posts I hidden
            prisma.hiddenPost.findMany({
                where: { userId },
                include: {
                    post: {
                        select: {
                            id: true,
                            content: true,
                            postMedia: {
                                take: 1,
                                include: { media: { select: { url: true, type: true } } }
                            }
                        }
                    }
                }
            })
        ]);

        return NextResponse.json({
            blocked: blocked.map(b => ({
                id: b.id,
                targetId: b.blockedId,
                name: b.blocked.name, // Changed from b.user.name
                displayName: b.blocked.profile?.displayName || b.blocked.name, // Changed from b.user...
                avatarUrl: b.blocked.profile?.avatarUrl // Changed from b.user...
            })),
            blockedBy: blockedBy.map(b => b.blockerId),
            ghosted: ghosted.map(g => ({
                id: g.id,
                targetId: g.mutedUserId,
                name: g.mutedUser.name, // Changed from g.user.name
                displayName: g.mutedUser.profile?.displayName || g.mutedUser.name, // Changed from g.user...
                avatarUrl: g.mutedUser.profile?.avatarUrl // Changed from g.user...
            })),
            hidden: hidden.map(h => ({
                id: h.id,
                postId: h.postId,
                content: h.post?.content,
                mediaUrl: h.post?.postMedia?.[0]?.media?.url
            }))
        });

    } catch (error) {
        console.error("Safety API Error:", error);
        return NextResponse.json({ error: "Failed to fetch safety data" }, { status: 500 });
    }
}

// Handle Unblock/Unghost/Unhide actions
export async function POST(req: Request) {
    try {
        const userId = await requireUserId();
        const { action, id, type } = await req.json(); // id is the RECORD ID (BlockedUser.id), not targetUserId

        if (action === 'DELETE') {
            if (type === 'BLOCKED') {
                await prisma.blockedUser.deleteMany({ where: { id, blockerId: userId } });
            } else if (type === 'GHOSTED') {
                await prisma.mutedUser.deleteMany({ where: { id, muterId: userId } });
            } else if (type === 'HIDDEN') {
                await prisma.hiddenPost.deleteMany({ where: { id, userId } });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Safety Action Error:", error);
        return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
    }
}
