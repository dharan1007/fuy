export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET(req: Request) {
    try {
        const userId = await requireUserId();

        const mutedUsers = await prisma.mutedUser.findMany({
            where: { muterId: userId },
            include: {
                mutedUser: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profile: {
                            select: {
                                displayName: true,
                                avatarUrl: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ mutedUsers });
    } catch (error) {
        console.error("Get muted users error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST: Mute a user
export async function POST(req: Request) {
    try {
        const userId = await requireUserId();
        const { targetUserId, types } = await req.json();

        if (!targetUserId) {
            return NextResponse.json({ error: "Target User ID required" }, { status: 400 });
        }

        // Default to strict JSON format for types array
        const mutedTypes = types && Array.isArray(types) ? JSON.stringify(types) : JSON.stringify(["ALL"]);

        await (prisma as any).mutedUser.upsert({
            where: {
                muterId_mutedUserId: {
                    muterId: userId,
                    mutedUserId: targetUserId
                }
            },
            create: {
                muterId: userId,
                mutedUserId: targetUserId,
                mutedTypes
            },
            update: {
                mutedTypes
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Mute user error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// DELETE: Unmute a user
export async function DELETE(req: Request) {
    try {
        const userId = await requireUserId();
        const { searchParams } = new URL(req.url);
        const targetUserId = searchParams.get("targetUserId");

        if (!targetUserId) {
            return NextResponse.json({ error: "Target User ID required" }, { status: 400 });
        }

        await (prisma as any).mutedUser.deleteMany({
            where: {
                muterId: userId,
                mutedUserId: targetUserId
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Unmute user error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

