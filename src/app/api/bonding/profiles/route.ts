import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/bonding/profiles - Get all users the current user has chatted with or follows
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get current user
        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });

        if (!currentUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Get all conversations the user is part of
        const conversations = await prisma.conversation.findMany({
            where: {
                OR: [
                    { participantA: currentUser.id },
                    { participantB: currentUser.id },
                ],
            },
            include: {
                userA: {
                    select: {
                        id: true,
                        name: true,
                        profile: {
                            select: {
                                displayName: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },
                userB: {
                    select: {
                        id: true,
                        name: true,
                        profile: {
                            select: {
                                displayName: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },
            },
            orderBy: { lastMessageAt: "desc" },
        });

        // Extract unique profiles (the other person in each conversation)
        const profiles = conversations.map((conv) => {
            const isParticipantA = conv.participantA === currentUser.id;
            const partner = isParticipantA ? conv.userB : conv.userA;
            return {
                id: partner.id,
                name: partner.profile?.displayName || partner.name || "Unknown",
                avatar: partner.profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${partner.id}`,
                lastMessageAt: conv.lastMessageAt,
            };
        });

        // Remove duplicates (in case of multiple conversations)
        const uniqueProfiles = profiles.filter(
            (profile, index, self) => index === self.findIndex((p) => p.id === profile.id)
        );

        return NextResponse.json(uniqueProfiles);
    } catch (error) {
        console.error("Error fetching bonding profiles:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
