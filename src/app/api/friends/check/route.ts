import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) return NextResponse.json({ status: "NONE" });

        const { searchParams } = new URL(req.url);
        const targetId = searchParams.get("userId");

        if (!targetId) return NextResponse.json({ status: "NONE" });

        if (targetId === user.id) {
            return NextResponse.json({ status: "ME" });
        }

        const friendship = await prisma.friendship.findFirst({
            where: {
                OR: [
                    { userId: user.id, friendId: targetId },
                    { userId: targetId, friendId: user.id }
                ]
            }
        });

        // Map database status to frontend expected status
        // DB: PENDING | ACCEPTED | BLOCKED | GHOSTED
        // Frontend: PENDING | ACCEPTED | NONE | ME
        // If blocked/ghosted, treat as NONE for the action button (or handle explicitly)
        let status = "NONE";
        if (friendship) {
            if (friendship.status === "ACCEPTED") status = "ACCEPTED";
            else if (friendship.status === "PENDING") status = "PENDING";
        }

        return NextResponse.json({ status });
    } catch (e) {
        return NextResponse.json({ status: "NONE" });
    }
}
