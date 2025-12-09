import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/bonding/check-warning - Check if message content matches any active fact warnings
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const currentUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });

        if (!currentUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await request.json();
        const { profileId, content } = body;

        if (!profileId || !content) {
            return NextResponse.json(
                { error: "profileId and content are required" },
                { status: 400 }
            );
        }

        // Get all active fact warnings for this profile
        const warnings = await prisma.factWarning.findMany({
            where: {
                userId: currentUser.id,
                profileId,
                isActive: true,
            },
        });

        // Check if any keywords match the content (case-insensitive)
        const contentLower = content.toLowerCase();
        const matchedWarnings = warnings.filter((w) =>
            contentLower.includes(w.keyword.toLowerCase())
        );

        if (matchedWarnings.length > 0) {
            return NextResponse.json({
                hasWarning: true,
                warnings: matchedWarnings.map((w) => ({
                    keyword: w.keyword,
                    warningText: w.warningText,
                })),
            });
        }

        return NextResponse.json({ hasWarning: false, warnings: [] });
    } catch (error) {
        console.error("Error checking warnings:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
