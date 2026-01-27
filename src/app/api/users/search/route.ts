
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession, authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query || query.length < 2) return NextResponse.json([]); // Return empty if query short

  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { profileCode: { contains: query } },
          { profile: { displayName: { contains: query, mode: 'insensitive' } } }
        ],
        NOT: { id: (session.user as any).id } // Exclude self
      },
      take: 10,
      select: {
        id: true,
        name: true,
        profileCode: true,
        profile: {
          select: {
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
