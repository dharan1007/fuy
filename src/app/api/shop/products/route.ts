import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const featured = searchParams.get("featured") === "true";
    const trending = searchParams.get("trending") === "true";
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const brandId = searchParams.get("brandId");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = parseInt(searchParams.get("skip") || "0");

    const where: any = {
      status: "ACTIVE",
    };

    if (featured) where.isFeatured = true;
    if (trending) where.isTrending = true;
    if (category) where.category = category;
    if (brandId) where.brandId = brandId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        brand: { select: { id: true, name: true, slug: true } },
        analyticsLog: true,
      },
      take: limit,
      skip,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.product.count({ where });

    return NextResponse.json({
      products,
      total,
      limit,
      skip,
    });
  } catch (error: any) {
    logger.error("Get products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // TODO: Add auth check for brand owners only
    const body = await req.json();
    const {
      brandId,
      name,
      description,
      price,
      discountPrice,
      stock,
      category,
      images,
      tags,
    } = body;

    if (!brandId || !name || !price) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const slug = name.toLowerCase().replace(/\s+/g, "-");

    const product = await prisma.product.create({
      data: {
        brandId,
        name,
        slug,
        description,
        price,
        discountPrice,
        stock: stock || 0,
        category,
        images: images ? JSON.stringify(images) : null,
        tags: tags ? JSON.stringify(tags) : null,
      },
      include: {
        brand: { select: { id: true, name: true, slug: true } },
      },
    });

    // Create analytics record
    await prisma.productAnalytics.create({
      data: {
        productId: product.id,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error: any) {
    logger.error("Create product error:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
