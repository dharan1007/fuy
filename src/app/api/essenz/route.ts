import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/essenz - Get user's essenz goals
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const essenzGoals = await prisma.essenz.findMany({
      where: { userId: session.user.id },
      include: { nodes: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ goals: essenzGoals });
  } catch (error) {
    console.error("[Essenz GET]", error);
    return NextResponse.json({ error: "Failed to fetch essenz goals" }, { status: 500 });
  }
}

// POST /api/essenz - Create new essenz goal
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, goal } = await req.json();

    if (!title || !goal) {
      return NextResponse.json({ error: "Title and goal are required" }, { status: 400 });
    }

    const essenz = await prisma.essenz.create({
      data: {
        userId: session.user.id,
        title,
        goal,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ goal: essenz }, { status: 201 });
  } catch (error) {
    console.error("[Essenz POST]", error);
    return NextResponse.json({ error: "Failed to create essenz goal" }, { status: 500 });
  }
}
