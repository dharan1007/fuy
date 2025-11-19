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

    // Get user's hopin plans (tasks they created or are assigned to)
    const myPlans = await prisma.task.findMany({
      where: {
        OR: [
          { createdById: user.id },
          {
            assignees: {
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
        status: true,
        priority: true,
        dueDate: true,
        createdAt: true,
        createdById: true,
        assignees: {
          where: {
            userId: user.id,
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    // Format response
    const formattedPlans = myPlans.map((plan) => ({
      id: plan.id,
      title: plan.title,
      description: plan.description,
      status: plan.status,
      priority: plan.priority,
      isCreator: plan.createdById === user.id,
      dueDate: plan.dueDate,
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
