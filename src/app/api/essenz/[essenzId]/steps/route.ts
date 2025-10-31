import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/essenz/[essenzId]/steps
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

    const steps = await prisma.stepBreakdown.findMany({
      where: {
        node: {
          essenzId: params.essenzId,
          nodeType: "steps",
        },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ steps });
  } catch (error) {
    console.error("[Steps GET]", error);
    return NextResponse.json({ error: "Failed to fetch steps" }, { status: 500 });
  }
}

// POST /api/essenz/[essenzId]/steps
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

    const { title, duration, difficulty } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Get or create steps node
    let stepsNode = await prisma.essenzNode.findFirst({
      where: { essenzId: params.essenzId, nodeType: "steps" },
    });

    if (!stepsNode) {
      stepsNode = await prisma.essenzNode.create({
        data: {
          essenzId: params.essenzId,
          nodeType: "steps",
          title: "Break It Down",
          description: "Goal decomposition",
          position: JSON.stringify({ x: 50, y: 35 }),
        },
      });
    }

    const maxOrder = await prisma.stepBreakdown.aggregate({
      where: { nodeId: stepsNode.id },
      _max: { order: true },
    });

    const step = await prisma.stepBreakdown.create({
      data: {
        nodeId: stepsNode.id,
        title,
        duration: duration || undefined,
        difficulty: difficulty || "MEDIUM",
        order: (maxOrder._max.order || -1) + 1,
      },
    });

    return NextResponse.json({ step }, { status: 201 });
  } catch (error) {
    console.error("[Steps POST]", error);
    return NextResponse.json({ error: "Failed to create step" }, { status: 500 });
  }
}
