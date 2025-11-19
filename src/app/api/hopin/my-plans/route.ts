// src/app/api/hopin/my-plans/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's hopin plans (programs they've enrolled in or created)
    const myPlans = await prisma.hopinProgram.findMany({
      where: {
        OR: [
          { creatorId: user.id },
          {
            participants: {
              some: {
                userId: user.id,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        creatorId: true,
        status: true,
        createdAt: true,
        participants: {
          where: {
            userId: user.id,
          },
          select: {
            status: true,
            progress: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    // Format response to include user's participation status
    const formattedPlans = myPlans.map((plan) => ({
      id: plan.id,
      title: plan.title,
      description: plan.description,
      status: plan.status,
      isCreator: plan.creatorId === user.id,
      participationStatus: plan.participants[0]?.status || null,
      progress: plan.participants[0]?.progress || 0,
    }));

    return NextResponse.json({ plans: formattedPlans });
  } catch (error: any) {
    console.error('Error fetching hopin plans:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch hopin plans' },
      { status: 500 }
    );
  }
}
