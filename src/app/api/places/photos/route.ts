import { getServerSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

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

    // Get friend IDs
    const friendships = await prisma.friendship.findMany({
      where: {
        AND: {
          OR: [
            { userId: user.id, status: "ACCEPTED" },
            { friendId: user.id, status: "ACCEPTED" },
          ],
        },
      },
    });

    const friendIds = friendships.map((f) =>
      f.userId === user.id ? f.friendId : f.userId
    );

    const { searchParams } = new URL(req.url);
    const reviewId = searchParams.get("reviewId");

    // Get photos that are visible to the current user
    const photos = await prisma.placePhoto.findMany({
      where: {
        ...(reviewId && { reviewId }),
        OR: [
          { userId: user.id }, // Own photos
          { visibility: "PUBLIC" }, // Public photos
          {
            AND: [
              { visibility: "FRIENDS" },
              { userId: { in: friendIds } }, // Friends' photos visible to friends
            ],
          },
        ],
      },
      include: {
        review: {
          select: {
            osmId: true,
            placeName: true,
            category: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(photos);
  } catch (error) {
    logger.error("Failed to fetch photos:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
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
    const { reviewId, url, caption, visibility } = body;

    if (!reviewId || !url) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify the review exists and belongs to the user or is visible
    const review = await prisma.placeReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    // Only the review owner can add photos to their review
    if (review.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const photo = await prisma.placePhoto.create({
      data: {
        reviewId,
        userId: user.id,
        url,
        caption,
        visibility: visibility || "PUBLIC",
      },
      include: {
        review: {
          select: {
            osmId: true,
            placeName: true,
            category: true,
          },
        },
      },
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    logger.error("Failed to create photo:", error);
    return NextResponse.json(
      { error: "Failed to create photo" },
      { status: 500 }
    );
  }
}
