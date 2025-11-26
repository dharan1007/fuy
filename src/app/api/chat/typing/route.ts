import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { pusherServer } from "@/lib/pusher";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
    try {
        const userId = await requireUserId();
        const body = await req.json();
        const { conversationId, status } = body;

        if (!conversationId || !status) {
            return NextResponse.json(
                { error: "Conversation ID and status are required" },
                { status: 400 }
            );
        }

        const eventName = status === "start" ? "typing:start" : "typing:end";

        await pusherServer.trigger(`conversation-${conversationId}`, eventName, {
            userId,
            conversationId,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error("Typing indicator error:", error);
        return NextResponse.json(
            { error: "Failed to send typing indicator" },
            { status: 500 }
        );
    }
}
