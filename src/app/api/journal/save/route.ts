export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function POST(req: Request) {
    try {
        const userId = await requireUserId();
        const body = await req.json();
        const { id, content, blocks, mood, tags, sensations } = body;

        let entry;
        if (id) {
            // Update existing
            entry = await prisma.journalEntry.update({
                where: { id },
                data: {
                    content,
                    blocks: blocks ? JSON.stringify(blocks) : undefined,
                    mood,
                    tags: tags ? JSON.stringify(tags) : undefined,
                    sensations: sensations ? JSON.stringify(sensations) : undefined,
                },
            });
        } else {
            // Create new
            entry = await prisma.journalEntry.create({
                data: {
                    userId,
                    content: content || "",
                    blocks: blocks ? JSON.stringify(blocks) : undefined,
                    mood,
                    tags: tags ? JSON.stringify(tags) : undefined,
                    sensations: sensations ? JSON.stringify(sensations) : undefined,
                },
            });
        }

        return NextResponse.json({ success: true, entry });
    } catch (error) {
        console.error("Error saving journal entry:", error);
        return NextResponse.json({ error: "Failed to save entry" }, { status: 500 });
    }
}

