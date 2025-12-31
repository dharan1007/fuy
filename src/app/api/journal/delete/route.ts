export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function POST(req: Request) {
    try {
        const userId = await requireUserId();
        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 });
        }

        await prisma.journalEntry.deleteMany({
            where: {
                id,
                userId, // Ensure ownership
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting journal entry:", error);
        return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 });
    }
}

