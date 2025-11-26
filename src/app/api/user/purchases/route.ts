import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
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

        // Fetch orders with items and product details
        const orders = await prisma.order.findMany({
            where: {
                userId: user.id,
                status: { not: "CANCELLED" },
            },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // Flatten items for easier consumption if needed, or return orders structure
        // Returning orders structure preserves context (date, total, etc.)
        return NextResponse.json(orders);
    } catch (error) {
        console.error("Error fetching user purchases:", error);
        return NextResponse.json(
            { error: "Failed to fetch purchases" },
            { status: 500 }
        );
    }
}
