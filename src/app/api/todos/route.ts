import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/todos - List todos
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const todos = await prisma.todo.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({ todos });
    } catch (error) {
        console.error("Failed to fetch todos:", error);
        return NextResponse.json({ error: "Failed to fetch todos" }, { status: 500 });
    }
}

// POST /api/todos - Create todo
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { title, priority } = body;

        if (!title) {
            return NextResponse.json({ error: "Title required" }, { status: 400 });
        }

        const todo = await prisma.todo.create({
            data: {
                userId: session.user.id,
                title,
                priority: priority || 'MEDIUM',
                status: 'PENDING'
            }
        });

        return NextResponse.json(todo);
    } catch (error) {
        console.error("Failed to create todo:", error);
        return NextResponse.json({ error: "Failed to create todo" }, { status: 500 });
    }
}

// PUT /api/todos - Update todo (status)
export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { id, status, title } = body;

        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 });
        }

        // Verify ownership
        const existing = await prisma.todo.findUnique({ where: { id } });
        if (!existing || existing.userId !== session.user.id) {
            return NextResponse.json({ error: "Todo not found" }, { status: 404 });
        }

        const todo = await prisma.todo.update({
            where: { id },
            data: {
                status: status !== undefined ? status : existing.status,
                title: title !== undefined ? title : existing.title
            }
        });

        return NextResponse.json(todo);
    } catch (error) {
        console.error("Failed to update todo:", error);
        return NextResponse.json({ error: "Failed to update todo" }, { status: 500 });
    }
}

// DELETE /api/todos - Delete todo
export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 });
        }

        // Verify ownership
        const existing = await prisma.todo.findUnique({ where: { id } });
        if (!existing || existing.userId !== session.user.id) {
            return NextResponse.json({ error: "Todo not found" }, { status: 404 });
        }

        await prisma.todo.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete todo:", error);
        return NextResponse.json({ error: "Failed to delete todo" }, { status: 500 });
    }
}
