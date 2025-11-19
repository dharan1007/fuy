// src/app/api/suggestions/users/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get suggested users (users the current user doesn't follow and aren't themselves)
    // Prioritize by follower count to show popular users
    const suggestedUsers = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: user.id } },
          {
            // Exclude users that the current user is already following
            friendshipsA: {
              none: {
                friendId: user.id,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        profile: {
          select: {
            displayName: true,
            avatarUrl: true,
            bio: true,
          },
        },
        friendshipsB: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        followersCount: 'desc',
      },
      take: 10,
    });

    // Format response
    const formattedUsers = suggestedUsers.map((u) => ({
      id: u.id,
      name: u.name,
      profile: u.profile,
      followersCount: u.friendshipsB.length,
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error: any) {
    console.error('Error fetching suggested users:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch suggested users' },
      { status: 500 }
    );
  }
}
