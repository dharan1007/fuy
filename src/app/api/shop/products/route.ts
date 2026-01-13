import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { moderateContent, getModerationErrorMessage } from "@/lib/content-moderation";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "10");

    const whereClause: any = {};
    if (type) {
      whereClause.type = type;
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        brand: {
          select: { name: true, slug: true },
        },
        // @ts-ignore
        seller: {
          select: {
            name: true,
            profile: {
              select: { avatarUrl: true }
            }
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Content Moderation: Check product name, description, and other text fields
    const combinedText = `${body.name || ''} ${body.description || ''} ${body.title || ''}`;
    const moderationResult = moderateContent(combinedText);
    if (!moderationResult.isClean) {
      return NextResponse.json(
        { error: getModerationErrorMessage(moderationResult) },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: body,
    });
    return NextResponse.json({ product });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
