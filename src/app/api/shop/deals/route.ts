import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "ACTIVE";
    const brandId = searchParams.get("brandId");

    const where: any = {};
    if (status) where.status = status;
    if (brandId) where.brandId = brandId;

    const deals = await prisma.deal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({ deals });
  } catch (error: any) {
    logger.error("Get deals error:", error);
    return NextResponse.json(
      { error: "Failed to fetch deals" },
      { status: 500 }
    );
  }
}
