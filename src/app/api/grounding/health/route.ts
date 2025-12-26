
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const [conditions, profile] = await Promise.all([
            prisma.healthCondition.findMany({
                where: { userId: session.user.id },
                orderBy: { date: "desc" },
            }),
            prisma.profile.findUnique({
                where: { userId: session.user.id },
                select: { height: true, weight: true, dob: true, gender: true }
            })
        ]);

        return NextResponse.json({ conditions, profile });
    } catch (error) {
        console.error("Error fetching health conditions:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await req.json();
        const { type, name, date, notes, resolved } = body;

        const condition = await prisma.healthCondition.create({
            data: {
                userId: session.user.id,
                type,
                name,
                date: new Date(date),
                notes,
                resolved: resolved || false,
            },
        });

        return NextResponse.json(condition);
    } catch (error) {
        console.error("Error saving health condition:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await req.json();
        const { id, resolved } = body;

        const condition = await prisma.healthCondition.update({
            where: {
                id,
                userId: session.user.id, // Ensure ownership
            },
            data: {
                resolved,
            },
        });

        return NextResponse.json(condition);
    } catch (error) {
        console.error("Error updating health condition:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return new NextResponse("Missing id", { status: 400 });
        }

        await prisma.healthCondition.delete({
            where: {
                id,
                userId: session.user.id,
            },
        });

        return new NextResponse("Deleted", { status: 200 });
    } catch (error) {
        console.error("Error deleting health condition:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
