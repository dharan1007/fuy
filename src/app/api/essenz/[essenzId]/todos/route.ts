import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/essenz/[essenzId]/todos
export async function GET(req: Request, { params }: { params: { essenzId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const essenz = await prisma.essenz.findUnique({
      where: { id: params.essenzId },
    });

    if (!essenz || essenz.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const todos = await prisma.essenzTodo.findMany({
      where: {
        node: {
          essenzId: params.essenzId,
          nodeType: "todo",
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ todos });
  } catch (error) {
    logger.error("[Todos GET]", error);
    return NextResponse.json({ error: "Failed to fetch todos" }, { status: 500 });
  }
}

// POST /api/essenz/[essenzId]/todos
export async function POST(req: Request, { params }: { params: { essenzId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const essenz = await prisma.essenz.findUnique({
      where: { id: params.essenzId },
    });

    if (!essenz || essenz.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { title, dueDate, duration, notes } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Get or create todo node
    let todoNode = await prisma.essenzNode.findFirst({
      where: { essenzId: params.essenzId, nodeType: "todo" },
    });

    if (!todoNode) {
      todoNode = await prisma.essenzNode.create({
        data: {
          essenzId: params.essenzId,
          nodeType: "todo",
          title: "Today's Tasks",
          description: "Daily todo list",
          position: JSON.stringify({ x: 50, y: 55 }),
        },
      });
    }

    const todo = await prisma.essenzTodo.create({
      data: {
        nodeId: todoNode.id,
        title,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        duration: duration || undefined,
        notes: notes || undefined,
      },
    });

    return NextResponse.json({ todo }, { status: 201 });
  } catch (error) {
    logger.error("[Todos POST]", error);
    return NextResponse.json({ error: "Failed to create todo" }, { status: 500 });
  }
}
