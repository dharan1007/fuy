
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET: Fetch today's log (and optionally recent history or plans if needed later)
export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const log = await prisma.nutritionLog.findFirst({
            where: {
                userId: session.user.id,
                date: today,
            },
        });

        return NextResponse.json(log || {
            calories: 0, protein: 0, carbs: 0, fats: 0, meals: { breakfast: [], lunch: [], dinner: [], snacks: [] }
        });
    } catch (error) {
        console.error("Diet API GET Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST: Update today's log
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    try {
        const body = await req.json();
        const { meals, calories, protein, carbs, fats } = body;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existing = await prisma.nutritionLog.findFirst({
            where: { userId: session.user.id, date: today }
        });

        if (existing) {
            const updated = await prisma.nutritionLog.update({
                where: { id: existing.id },
                data: { meals, calories, protein, carbs, fats }
            });
            return NextResponse.json(updated);
        } else {
            const created = await prisma.nutritionLog.create({
                data: {
                    userId: session.user.id,
                    date: today,
                    meals,
                    calories,
                    protein,
                    carbs,
                    fats
                }
            });
            return NextResponse.json(created);
        }
    } catch (error) {
        console.error("Diet API POST Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
