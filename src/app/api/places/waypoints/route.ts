import { logger } from "@/lib/logger";
import { getServerSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const routeId = searchParams.get("routeId");

    const where: any = { userId: user.id };
    if (routeId) where.routeId = routeId;

    const waypoints = await prisma.routeWaypoint.findMany({
      where,
      include: {
        photos: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(waypoints);
  } catch (error) {
    logger.error("Failed to fetch waypoints:", error);
    return NextResponse.json(
      { error: "Failed to fetch waypoints" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { routeId, lat, lng, name, description, emoji } = body;

    if (!routeId || lat === undefined || lng === undefined || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const waypoint = await prisma.routeWaypoint.create({
      data: {
        userId: user.id,
        routeId,
        lat,
        lng,
        name,
        description,
        emoji: emoji || "📍",
      },
      include: {
        photos: true,
      },
    });

    return NextResponse.json(waypoint, { status: 201 });
  } catch (error) {
    logger.error("Failed to create waypoint:", error);
    return NextResponse.json(
      { error: "Failed to create waypoint" },
      { status: 500 }
    );
  }
}
