export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function POST(req: NextRequest) {
    try {
        const userId = await requireUserId();
        const body = await req.json();
        const { postId, reason, details } = body;

        if (!postId || !reason) {
            return NextResponse.json(
                { error: "Post ID and reason are required" },
                { status: 400 }
            );
        }

        // Check if post exists
        const post = await prisma.post.findUnique({
            where: { id: postId },
        });

        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        // Check availability of previous report by same user
        const existingReport = await prisma.report.findFirst({
            where: {
                postId,
                reporterId: userId,
            }
        });

        if (existingReport) {
            return NextResponse.json({ message: "You have already reported this post." });
        }

        // Create report
        const report = await prisma.report.create({
            data: {
                postId,
                reporterId: userId,
                reason,
                details,
                status: "PENDING",
            },
        });

        // Notify admins (Optional: In a real app, this might go to a Slack channel or Admin DB queue)
        // For now, we rely on the Admin Dashboard to fetch these.

        return NextResponse.json({ success: true, report });
    } catch (error: any) {
        console.error("Report post error:", error);
        if (error?.message === "UNAUTHENTICATED") {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }
        return NextResponse.json(
            { error: "Failed to report post" },
            { status: 500 }
        );
    }
}

