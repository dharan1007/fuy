import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
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
    const category = searchParams.get("category");
    const osmId = searchParams.get("osmId");

    const where: any = { userId: user.id };
    if (category) where.category = category;
    if (osmId) where.osmId = osmId;

    const reviews = await prisma.placeReview.findMany({
      where,
      include: {
        photos: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reviews);
  } catch (error) {
    logger.error("Failed to fetch reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
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
    const { osmId, placeName, category, lat, lng, rating, text, visited } =
      body;

    // Validation
    if (!osmId || !placeName || !category || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Invalid review data" },
        { status: 400 }
      );
    }

    const review = await prisma.placeReview.create({
      data: {
        userId: user.id,
        osmId,
        placeName,
        category,
        lat,
        lng,
        rating,
        text,
        visited: visited ? new Date(visited) : null,
      },
      include: {
        photos: true,
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    logger.error("Failed to create review:", error);
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}
