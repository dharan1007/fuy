export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { extractProfileTags, calculateTagOverlap, getUserSlashPreferences } from '@/lib/recommendation';

export async function GET() {
  try {
    const session = await auth();
    let userId: string | null = null;
    let interests: string[] = [];
    let slashPrefs: Record<string, number> = {};

    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { profile: true },
      });

      if (user) {
        userId = user.id;
        interests = user.profile?.shoppingInterests || [];

        // Get profile tags for matching
        const profileTags = await extractProfileTags(user.id);
        interests = [
          ...interests,
          ...profileTags.currentlyInto,
          ...profileTags.genres,
        ];

        // Get slash preferences
        slashPrefs = await getUserSlashPreferences(user.id);
      }
    }

    // Get candidate products
    const products = await prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        images: true,
        price: true,
        description: true,
        tags: true,
        category: true,
        isTrending: true,
      },
      orderBy: [
        { isTrending: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 50,
    });

    // Score products using recommendation brain
    const scoredProducts = products.map((p) => {
      let score = 0;
      const productTags: string[] = Array.isArray(p.tags) ? p.tags : [];

      // Interest overlap
      if (interests.length > 0) {
        score += calculateTagOverlap(interests, productTags) * 10;
      }

      // Slash preference matching
      for (const tag of productTags) {
        if (slashPrefs[tag]) {
          score += slashPrefs[tag];
        }
      }

      // Trending boost
      if (p.isTrending) {
        score += 3;
      }

      // Parse image
      let image = null;
      try {
        if (p.images) {
          const parsed = JSON.parse(p.images);
          image = Array.isArray(parsed) ? parsed[0]?.url || parsed[0] : parsed;
        }
      } catch (e) { /* ignore */ }

      return {
        id: p.id,
        name: p.name,
        image,
        price: p.price,
        description: p.description,
        category: p.category,
        score: Math.round(score * 100) / 100,
        isTrending: p.isTrending,
        matchReason: score > 5
          ? 'Matches your interests'
          : p.isTrending
            ? 'Trending now'
            : 'Popular item',
      };
    });

    // Sort by score
    scoredProducts.sort((a, b) => b.score - a.score);

    // Return top products
    const topProducts = scoredProducts.slice(0, 15);

    return NextResponse.json({ products: topProducts });
  } catch (error: any) {
    console.error('Error fetching suggested products:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch suggested products' },
      { status: 500 }
    );
  }
}
