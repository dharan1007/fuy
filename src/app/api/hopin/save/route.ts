export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function POST(req: Request) {
    try {
        const userId = await requireUserId();
        const body = await req.json();
        const { markers, insights, sideAtEnd, note, tags } = body;

        // Save full session as a Post with feature="CALM"
        // We store the structured data in `content` as a JSON string
        const post = await prisma.post.create({
            data: {
                userId,
                feature: "CALM",
                content: JSON.stringify({ markers, insights, sideAtEnd, note, tags }),
                visibility: "PRIVATE", // Stress maps are private by default
                joyScore: 0,
                connectionScore: 0,
                creativityScore: 0,
            },
        });

        // Also save the average intensity as a Metric for easier analytics
        if (insights?.avgIntensity) {
            await prisma.metric.create({
                data: {
                    userId,
                    type: "stress_avg_intensity",
                    category: "CALM",
                    value: insights.avgIntensity,
                },
            });
        }

        return NextResponse.json({ success: true, id: post.id });
    } catch (error) {
        console.error("Error saving hopin session:", error);
        return NextResponse.json({ error: "Failed to save session" }, { status: 500 });
    }
}

