import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/essenz/[essenzId]/resources
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

    const resources = await prisma.essenzResource.findMany({
      where: {
        node: {
          essenzId: params.essenzId,
          nodeType: "resources",
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ resources });
  } catch (error) {
    console.error("[Resources GET]", error);
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
  }
}

// POST /api/essenz/[essenzId]/resources
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

    const { type, title, url, notes } = await req.json();

    if (!title || !type) {
      return NextResponse.json({ error: "Title and type are required" }, { status: 400 });
    }

    // Get or create resources node
    let resourcesNode = await prisma.essenzNode.findFirst({
      where: { essenzId: params.essenzId, nodeType: "resources" },
    });

    if (!resourcesNode) {
      resourcesNode = await prisma.essenzNode.create({
        data: {
          essenzId: params.essenzId,
          nodeType: "resources",
          title: "Tools & Resources",
          description: "Podcasts, books, courses, and websites",
          position: JSON.stringify({ x: 20, y: 75 }),
        },
      });
    }

    const resource = await prisma.essenzResource.create({
      data: {
        nodeId: resourcesNode.id,
        type,
        title,
        url: url || undefined,
        notes: notes || undefined,
      },
    });

    return NextResponse.json({ resource }, { status: 201 });
  } catch (error) {
    console.error("[Resources POST]", error);
    return NextResponse.json({ error: "Failed to create resource" }, { status: 500 });
  }
}
