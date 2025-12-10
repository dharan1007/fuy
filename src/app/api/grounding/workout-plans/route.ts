import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "../../../../lib/session";

export async function GET(req: Request) {
    try {
        const userId = await requireUserId();

        const plans = await prisma.workoutPlan.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });

        // Parse JSON fields
        const formatted = plans.map(p => ({
            ...p,
            exercises: JSON.parse(p.exercises),
            schedule: p.schedule ? JSON.parse(p.schedule) : {},
        }));

        return NextResponse.json({ plans: formatted });
    } catch (error) {
        console.error("Failed to fetch workout plans:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const userId = await requireUserId();
        const body = await req.json();
        const { name, description, frequency, duration, exercises, schedule } = body;

        if (!name || !exercises) {
            return NextResponse.json({ error: "Name and exercises required" }, { status: 400 });
        }

        const plan = await prisma.workoutPlan.create({
            data: {
                userId,
                name,
                description,
                frequency,
                duration,
                exercises: JSON.stringify(exercises),
                schedule: JSON.stringify(schedule || {}),
            },
        });

        return NextResponse.json({ plan });
    } catch (error) {
        console.error("Failed to create workout plan:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
