import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();
    let interests: string[] = [];

    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { profile: true },
      });
      interests = user?.profile?.shoppingInterests || [];
    }

    // Build filter based on interests
    const where: any = {};
    if (interests.length > 0) {
      // Simple string match for tags since it's stored as JSON string
      where.OR = interests.map(tag => ({
        tags: { contains: tag.replace('/', '') } // Removing slash for looser matching if stored without, but usually stored as is.
        // Actually, let's keep it strict or try both.
      }));
      // Or just match any
      where.tags = { contains: interests[0] }; // Prisma doesn't support array contains on string easily for multiple ORs in this way without multiple OR clauses.

      // Better approach: Fetch recent, then sort by relevance in JS, or use multiple ORs
      where.OR = interests.map(i => ({ tags: { contains: i } }));
    }

    // Get products, prioritized by interests if any, otherwise trending/recent
    const suggestedProducts = await prisma.product.findMany({
      where: interests.length > 0 ? {
        OR: [
          ...interests.map(tag => ({ tags: { contains: tag } })),
          { isTrending: true } // Fallback to trending
        ]
      } : { isTrending: true }, // Default if no interests

      select: {
        id: true,
        name: true,
        images: true,
        price: true,
        description: true,
        tags: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20, // Fetch more to filter
    });

    // Client side filtering/sorting could be better but this is a start.
    // If no results from interests, fetch generic recent
    let finalProducts = suggestedProducts;
    if (finalProducts.length === 0) {
      finalProducts = await prisma.product.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, name: true, images: true, price: true, description: true }
      });
    }

    // Format response to match component expectations
    const formattedProducts = finalProducts.map((p) => {
      let image = null;
      try {
        if (p.images) {
          const parsed = JSON.parse(p.images);
          image = Array.isArray(parsed) ? parsed[0] : parsed;
        }
      } catch (e) { console.error(e) }

      return {
        id: p.id,
        name: p.name,
        image: image,
        price: p.price,
        description: p.description,
      };
    }).slice(0, 10);

    return NextResponse.json({ products: formattedProducts });
  } catch (error: any) {
    console.error('Error fetching suggested products:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch suggested products' },
      { status: 500 }
    );
  }
}
