import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { requireUserId } from '../../../lib/session';

export async function GET() {
  const groups = await prisma.group.findMany({
    include: {
      owner: true,
      members: { include: { user: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  const { name, description } = (await req.json()) as { name?: string; description?: string };
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const group = await prisma.group.create({
    data: {
      name,
      description,
      ownerId: userId,
      members: {
        create: {
          userId,
          role: 'OWNER',
        },
      },
    },
    include: { members: { include: { user: true } } },
  });
  return NextResponse.json(group, { status: 201 });
}
