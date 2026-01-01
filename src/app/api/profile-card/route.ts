export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

function generateCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 7; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// GET /api/profile-card?userId=... OR ?code=... OR mine
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");
        const code = searchParams.get("code");

        // Auth optional for public cards, but required for "mine"
        let currentUserId: string | null = null;
        try {
            currentUserId = await requireUserId();
        } catch {
            // Safe to ignore if just viewing public code
        }

        if (!userId && !code && !currentUserId) {
            return NextResponse.json({ error: "User ID or Code required" }, { status: 400 });
        }

        let card;

        if (code) {
            card = await prisma.profileCard.findUnique({
                where: { uniqueCode: code },
                include: { user: { include: { profile: true } } }
            });
        } else if (userId || currentUserId) {
            const targetId = userId || currentUserId;
            card = await prisma.profileCard.findUnique({
                where: { userId: targetId! },
                include: { user: { include: { profile: true } } }
            });

            // If "mine" and doesn't exist, create one
            if (!card && targetId === currentUserId) {
                // Verify user exists to avoid P2003
                const userExists = await prisma.user.findUnique({ where: { id: targetId! } });
                if (!userExists) {
                    return NextResponse.json({ error: "User record not found in database. Please re-login." }, { status: 401 });
                }

                const newCode = generateCode(); // Simplified collision check
                // In prod, check for collision
                const basicInfo = {
                    name: "New User",
                    age: "",
                    location: "",
                    occupation: ""
                };

                card = await prisma.profileCard.create({
                    data: {
                        userId: targetId!,
                        uniqueCode: newCode,
                        content: JSON.stringify({ sections: [], basicInfo }),
                        theme: "default"
                    },
                    include: { user: { include: { profile: true } } }
                });
            }
        }

        if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

        const content = typeof card.content === 'string' ? JSON.parse(card.content) : card.content;

        // Check for tagged channel
        const taggedChannel = await prisma.chan.findFirst({
            where: {
                post: { userId: card.userId },
                showOnProfile: true
            } as any,
            include: {
                post: {
                    select: { id: true }
                },
                shows: {
                    where: { isArchived: false },
                    include: {
                        episodes: { take: 1, orderBy: { createdAt: 'desc' } }
                    },
                    take: 3
                }
            }
        });

        return NextResponse.json({
            userId: card.userId,
            uniqueCode: card.uniqueCode,
            content,
            theme: card.theme,
            user: {
                name: card.user.name,
                profile: card.user.profile
            },
            taggedChannel
        });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message || "Error fetching card" }, { status: 500 });
    }
}

// PUT /api/profile-card
export async function PUT(req: Request) {
    try {
        const userId = await requireUserId();
        const body = await req.json();
        const { content, theme } = body;

        const card = await prisma.profileCard.upsert({
            where: { userId },
            create: {
                userId,
                uniqueCode: generateCode(),
                content: JSON.stringify(content),
                theme: theme || "default"
            },
            update: {
                content: JSON.stringify(content),
                theme: theme || "default"
            }
        });

        return NextResponse.json({ ok: true, card });

    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to update card" }, { status: 500 });
    }
}
