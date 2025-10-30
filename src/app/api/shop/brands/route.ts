import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status") || "ACTIVE";

    const where: any = { status };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const brands = await prisma.brand.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { products: true } },
      },
      take: 20,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ brands });
  } catch (error: any) {
    console.error("Get brands error:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // TODO: Add auth check
    const body = await req.json();
    const { name, slug, description, logoUrl, bannerUrl, ownerId } = body;

    if (!name || !ownerId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const brand = await prisma.brand.create({
      data: {
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
        description,
        logoUrl,
        bannerUrl,
        ownerId,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    // Create analytics record
    await prisma.brandAnalytics.create({
      data: {
        brandId: brand.id,
      },
    });

    return NextResponse.json({ brand }, { status: 201 });
  } catch (error: any) {
    console.error("Create brand error:", error);
    return NextResponse.json(
      { error: "Failed to create brand" },
      { status: 500 }
    );
  }
}
