// src/app/api/rankings/user/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's rankings across different categories
    // This assumes you have a UserRanking model that tracks rankings
    // Adjust based on your actual schema
    const userRankings = await prisma.userRanking.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        category: true,
        rank: true,
        points: true,
        percentile: true,
      },
      orderBy: {
        rank: 'asc',
      },
      take: 5,
    });

    // If no rankings exist, return default rankings
    if (userRankings.length === 0) {
      return NextResponse.json({
        ranks: [
          {
            id: '1',
            category: 'Community Engagement',
            rank: 0,
            points: 0,
            percentile: 0,
          },
          {
            id: '2',
            category: 'Content Creation',
            rank: 0,
            points: 0,
            percentile: 0,
          },
          {
            id: '3',
            category: 'Social Influence',
            rank: 0,
            points: 0,
            percentile: 0,
          },
        ],
      });
    }

    return NextResponse.json({ ranks: userRankings });
  } catch (error: any) {
    console.error('Error fetching user rankings:', error);

    // Return default rankings if there's an error
    return NextResponse.json({
      ranks: [
        {
          id: '1',
          category: 'Community Engagement',
          rank: 0,
          points: 0,
          percentile: 0,
        },
        {
          id: '2',
          category: 'Content Creation',
          rank: 0,
          points: 0,
          percentile: 0,
        },
        {
          id: '3',
          category: 'Social Influence',
          rank: 0,
          points: 0,
          percentile: 0,
        },
      ],
    });
  }
}
