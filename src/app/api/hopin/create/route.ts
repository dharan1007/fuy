import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { z } from "zod";

const createPlanSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    type: z.enum(["SOLO", "COMMUNITY"]),
    location: z.string().optional(),
    locationLink: z.string().optional(),
    isLocationLocked: z.boolean().default(false),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    visibility: z.enum(["PRIVATE", "FOLLOWERS", "PUBLIC"]).default("PRIVATE"),
    date: z.string().optional(), // ISO string
    maxSize: z.number().int().positive().optional(),
    slashes: z.array(z.string()).optional(),
    mediaUrls: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
    try {
        const userId = await requireUserId();
        const body = await req.json();

        const validated = createPlanSchema.parse(body);

        const plan = await prisma.plan.create({
            data: {
                title: validated.title,
                description: validated.description,
                type: validated.type,
                location: validated.location,
                locationLink: validated.locationLink,
                isLocationLocked: validated.isLocationLocked,
                latitude: validated.latitude,
                longitude: validated.longitude,
                visibility: validated.visibility,
                date: validated.date ? new Date(validated.date) : null,
                maxSize: validated.maxSize,
                slashes: validated.slashes ? JSON.stringify(validated.slashes) : null,
                mediaUrls: validated.mediaUrls ? JSON.stringify(validated.mediaUrls) : null,
                creatorId: userId,
                members: {
                    create: {
                        userId: userId,
                        status: "ACCEPTED", // Creator is always accepted
                        // isVerified: true 
                    }
                }
            } as any,
        });

        return NextResponse.json({ success: true, plan });
    } catch (error: any) {
        console.error("Create Plan Error:", error);
        return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
    }
}
