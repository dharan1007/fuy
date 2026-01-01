
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        // Return default/empty ranks structure or actual ranks if implemented
        // For now, satisfy the frontend contract
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
