import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const views = await prisma.productView.findMany({
            where: {
                userId: user.id,
            },
            include: {
                product: true,
            },
            orderBy: {
                viewedAt: "desc",
            },
            take: 50, // Limit to last 50 views
        });

        return NextResponse.json(views);
    } catch (error) {
        console.error("Error fetching user views:", error);
        return NextResponse.json(
            { error: "Failed to fetch views" },
            { status: 500 }
        );
    }
}
