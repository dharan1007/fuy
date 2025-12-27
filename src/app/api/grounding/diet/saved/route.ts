import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET: Fetch all saved foods for the user
export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

        const savedFoods = await prisma.savedFood.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(savedFoods);
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// POST: Create a new saved food
export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

        const { name, calories, protein, carbs, fats } = await req.json();

        const savedFood = await prisma.savedFood.create({
            data: {
                userId: session.user.id,
                name,
                calories: Number(calories),
                protein: Number(protein),
                carbs: Number(carbs),
                fats: Number(fats)
            }
        });

        return NextResponse.json(savedFood);
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// PUT: Update a saved food
export async function PUT(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

        const { id, name, calories, protein, carbs, fats } = await req.json();

        const savedFood = await prisma.savedFood.update({
            where: { id, userId: session.user.id },
            data: {
                name,
                calories: Number(calories),
                protein: Number(protein),
                carbs: Number(carbs),
                fats: Number(fats)
            }
        });

        return NextResponse.json(savedFood);
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// DELETE: Delete a saved food
export async function DELETE(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return new NextResponse("Missing ID", { status: 400 });

        await prisma.savedFood.delete({
            where: { id, userId: session.user.id }
        });

        return new NextResponse("Deleted", { status: 200 });
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}
