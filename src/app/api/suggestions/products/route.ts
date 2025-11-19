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
        images: true,
        price: true,
        description: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    // Format response to match component expectations
    const formattedProducts = suggestedProducts.map((p) => ({
      id: p.id,
      name: p.name,
      image: p.images && p.images.length > 0 ? p.images[0] : null,
      price: p.price,
      description: p.description,
    }));

    return NextResponse.json({ products: formattedProducts });
  } catch (error: any) {
    console.error('Error fetching suggested products:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch suggested products' },
      { status: 500 }
    );
  }
}
