import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/essenz/[essenzId]/watchlist
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

    const items = await prisma.watchlistItem.findMany({
      where: {
        node: {
          essenzId: params.essenzId,
          nodeType: "watchlist",
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[Watchlist GET]", error);
    return NextResponse.json({ error: "Failed to fetch watchlist" }, { status: 500 });
  }
}

// POST /api/essenz/[essenzId]/watchlist
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

    const { type, title, description, status, watchWithUsers, tags } = await req.json();

    if (!title || !type) {
      return NextResponse.json({ error: "Title and type are required" }, { status: 400 });
    }

    // Get or create watchlist node
    let watchlistNode = await prisma.essenzNode.findFirst({
      where: { essenzId: params.essenzId, nodeType: "watchlist" },
    });

    if (!watchlistNode) {
      watchlistNode = await prisma.essenzNode.create({
        data: {
          essenzId: params.essenzId,
          nodeType: "watchlist",
          title: "Watch Together",
          description: "Movies, series, and collaborative viewing",
          position: JSON.stringify({ x: 50, y: 75 }),
        },
      });
    }

    const item = await prisma.watchlistItem.create({
      data: {
        nodeId: watchlistNode.id,
        type,
        title,
        description: description || undefined,
        status: status || "PLANNING",
        watchWithUsers: watchWithUsers ? JSON.stringify(watchWithUsers) : undefined,
        tags: tags ? JSON.stringify(tags) : undefined,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("[Watchlist POST]", error);
    return NextResponse.json({ error: "Failed to add to watchlist" }, { status: 500 });
  }
}
