import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/essenz/[essenzId]/diary
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

    const entries = await prisma.essenzDiaryEntry.findMany({
      where: {
        node: {
          essenzId: params.essenzId,
          nodeType: "diary",
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ entries });
  } catch (error) {
    logger.error("[Diary GET]", error);
    return NextResponse.json({ error: "Failed to fetch diary entries" }, { status: 500 });
  }
}

// POST /api/essenz/[essenzId]/diary
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

    const { title, content, voiceNotes, mood, tags } = await req.json();

    if (!content && !voiceNotes) {
      return NextResponse.json({ error: "Content or voiceNotes is required" }, { status: 400 });
    }

    // Get or create diary node
    let diaryNode = await prisma.essenzNode.findFirst({
      where: { essenzId: params.essenzId, nodeType: "diary" },
    });

    if (!diaryNode) {
      diaryNode = await prisma.essenzNode.create({
        data: {
          essenzId: params.essenzId,
          nodeType: "diary",
          title: "My Diary",
          description: "Digital diary with voice and text",
          position: JSON.stringify({ x: 80, y: 55 }),
        },
      });
    }

    const entry = await prisma.essenzDiaryEntry.create({
      data: {
        nodeId: diaryNode.id,
        title: title || undefined,
        content,
        voiceNotes: voiceNotes || undefined,
        mood: mood || undefined,
        tags: tags ? JSON.stringify(tags) : undefined,
      },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    logger.error("[Diary POST]", error);
    return NextResponse.json({ error: "Failed to create diary entry" }, { status: 500 });
  }
}
