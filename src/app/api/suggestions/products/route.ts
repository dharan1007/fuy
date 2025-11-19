// src/app/api/suggestions/products/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get trending products (ordered by most recent or highest rated)
    const suggestedProducts = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        image: true,
        price: true,
        description: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    return NextResponse.json({ products: suggestedProducts });
  } catch (error: any) {
    console.error('Error fetching suggested products:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch suggested products' },
      { status: 500 }
    );
  }
}
