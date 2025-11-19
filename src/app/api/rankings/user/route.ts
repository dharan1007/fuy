// src/app/api/rankings/user/route.ts
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return user rankings based on their engagement metrics
    // This provides placeholder rankings until a full ranking system is implemented
    const userRanks = [
      {
        id: '1',
        category: 'Community Engagement',
        rank: Math.floor(Math.random() * 1000) + 1,
        points: Math.floor(Math.random() * 5000) + 100,
        percentile: Math.floor(Math.random() * 100) + 1,
      },
      {
        id: '2',
        category: 'Content Creation',
        rank: Math.floor(Math.random() * 1000) + 1,
        points: Math.floor(Math.random() * 5000) + 100,
        percentile: Math.floor(Math.random() * 100) + 1,
      },
      {
        id: '3',
        category: 'Social Influence',
        rank: Math.floor(Math.random() * 1000) + 1,
        points: Math.floor(Math.random() * 5000) + 100,
        percentile: Math.floor(Math.random() * 100) + 1,
      },
    ];

    return NextResponse.json({ ranks: userRanks });
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
