
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        // Return default/empty ranks structure to satisfy the frontend contract
        // Frontend expects: { ranks: [{ categoryId, rank, score }] }

        return NextResponse.json({
            ranks: [
                {
                    categoryId: "global",
                    rank: 0,
                    score: 0
                }
            ]
        });
    } catch (error) {
        console.error("Error in rankings/user:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
