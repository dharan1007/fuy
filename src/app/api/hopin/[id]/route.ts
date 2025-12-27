import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { z } from "zod";

const updatePlanSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    locationLink: z.string().optional(),
    isLocationLocked: z.boolean().optional(),
    date: z.string().optional(), // ISO string
    maxSize: z.number().int().positive().optional(),
    slashes: z.array(z.string()).optional(),
    mediaUrls: z.array(z.string()).optional(),
    status: z.enum(["OPEN", "FULL", "COMPLETED", "CANCELLED"]).optional(),
});

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const userId = await requireUserId();
        const planId = params.id;

        const plan = await prisma.plan.findUnique({
            where: { id: planId },
            select: { creatorId: true }
        });

        if (!plan) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        if (plan.creatorId !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await prisma.plan.delete({
            where: { id: planId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete Plan Error:", error);
        return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const userId = await requireUserId();
        const planId = params.id;
        const body = await req.json();

        const validated = updatePlanSchema.parse(body);

        const plan = await prisma.plan.findUnique({
            where: { id: planId },
            select: { creatorId: true }
        });

        if (!plan) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        if (plan.creatorId !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const date = validated.date ? new Date(validated.date) : undefined;
        const slashes = validated.slashes ? JSON.stringify(validated.slashes) : undefined;
        const mediaUrls = validated.mediaUrls ? JSON.stringify(validated.mediaUrls) : undefined;

        const updatedPlan = await prisma.plan.update({
            where: { id: planId },
            data: {
                ...validated,
                date,
                slashes,
                mediaUrls
            } as any
        });

        return NextResponse.json({ success: true, plan: updatedPlan });
    } catch (error) {
        console.error("Update Plan Error:", error);
        return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
    }
}
