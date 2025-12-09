import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/bonding/facts - Get fact warnings for a profile
export async function GET(request: NextRequest) {
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

        const { searchParams } = new URL(request.url);
        const profileId = searchParams.get("profileId");

        const where: any = { userId: currentUser.id };
        if (profileId) where.profileId = profileId;

        const warnings = await prisma.factWarning.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(warnings);
    } catch (error) {
        console.error("Error fetching fact warnings:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/bonding/facts - Create a new fact warning
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
        const { profileId, keyword, warningText } = body;

        if (!profileId || !keyword || !warningText) {
            return NextResponse.json(
                { error: "profileId, keyword, and warningText are required" },
                { status: 400 }
            );
        }

        const warning = await prisma.factWarning.create({
            data: {
                userId: currentUser.id,
                profileId,
                keyword: keyword.toLowerCase().trim(),
                warningText,
            },
        });

        return NextResponse.json(warning, { status: 201 });
    } catch (error) {
        console.error("Error creating fact warning:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PUT /api/bonding/facts - Update a fact warning
export async function PUT(request: NextRequest) {
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
        const { id, keyword, warningText, isActive } = body;

        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 });
        }

        // Verify ownership
        const existing = await prisma.factWarning.findFirst({
            where: { id, userId: currentUser.id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
        }

        const updated = await prisma.factWarning.update({
            where: { id },
            data: {
                ...(keyword && { keyword: keyword.toLowerCase().trim() }),
                ...(warningText && { warningText }),
                ...(typeof isActive === "boolean" && { isActive }),
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating fact warning:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/bonding/facts?id=xxx - Delete a fact warning
export async function DELETE(request: NextRequest) {
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

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 });
        }

        // Verify ownership
        const existing = await prisma.factWarning.findFirst({
            where: { id, userId: currentUser.id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
        }

        await prisma.factWarning.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting fact warning:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
