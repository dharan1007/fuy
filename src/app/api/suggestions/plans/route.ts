// src/app/api/suggestions/plans/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get suggested plans/features (top rated or most viewed plans)
    const suggestedPlans = await prisma.hopinProgram.findMany({
      select: {
        id: true,
        title: true,
        description: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    return NextResponse.json({ plans: suggestedPlans });
  } catch (error: any) {
    console.error('Error fetching suggested plans:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch suggested plans' },
      { status: 500 }
    );
  }
}
