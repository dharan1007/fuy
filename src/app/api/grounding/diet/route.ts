
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const plans = await prisma.dietPlan.findMany({
            where: {
                userId: session.user.id,
            },
            include: {
                items: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json(plans);
    } catch (error) {
        console.error("Error fetching diet plans:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, description, items } = body;
        // Expecting items: { foodName, quantity, unit, calories, protein, carbs, fats }[]

        const plan = await prisma.dietPlan.create({
            data: {
                userId: session.user.id,
                name,
                description,
                items: {
                    create: items.map((item: any) => ({
                        foodName: item.foodName,
                        quantity: item.quantity,
                        unit: item.unit,
                        calories: item.calories,
                        protein: item.protein,
                        carbs: item.carbs,
                        fats: item.fats,
                    })),
                },
            },
            include: {
                items: true,
            },
        });

        return NextResponse.json(plan);
    } catch (error) {
        console.error("Error creating diet plan:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
