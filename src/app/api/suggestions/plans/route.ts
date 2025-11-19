// src/app/api/suggestions/plans/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get suggested plans/features (tasks with status TODO or IN_PROGRESS)
    const suggestedPlans = await prisma.task.findMany({
      where: {
        status: {
          in: ['TODO', 'IN_PROGRESS'],
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
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
