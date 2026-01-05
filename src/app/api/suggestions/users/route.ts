// src/app/api/suggestions/users/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode'); // 'creators' for public only

    // Get current user's profile for interest matching
    const currentUserProfile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: {
        currentlyInto: true,
        topGenres: true,
        values: true,
        topFoods: true,
        topMovies: true,
      }
    });

    // Get users that the current user follows
    const following = await prisma.friendship.findMany({
      where: { userId: user.id },
      select: { friendId: true }
    });
    const followingIds = following.map(f => f.friendId);

    // Base query for users
    const baseWhere: any = {
      AND: [
        { id: { not: user.id } },
        {
          // Exclude users that the current user is already following
          friendshipsB: {
            none: {
              userId: user.id,
            },
          },
        },
      ],
    };

    // For creators mode, only show public profiles
    if (mode === 'creators') {
      baseWhere.AND.push({
        profile: {
          isPrivate: false
        }
      });
    }

    // Get suggested users
    const suggestedUsers = await prisma.user.findMany({
      where: baseWhere,
      select: {
        id: true,
        name: true,
        profile: {
          select: {
            displayName: true,
            avatarUrl: true,
            bio: true,
            isPrivate: true,
            currentlyInto: true,
            topGenres: true,
            values: true,
          },
        },
        friendshipsB: {
          select: {
            userId: true,
          },
        },
        // Get who this user follows to calculate mutuals
        friendshipsA: {
          select: {
            friendId: true,
          },
        },
      },
      orderBy: {
        followersCount: 'desc',
      },
      take: 30,
    });

    // Calculate similarity scores and mutual counts
    const formattedUsers = suggestedUsers.map((u) => {
      // Calculate mutual connections
      const userFollowing = u.friendshipsA.map(f => f.friendId);
      const mutualCount = userFollowing.filter(id => followingIds.includes(id)).length;

      // Calculate interest similarity
      let similarityScore = 0;
      if (currentUserProfile && u.profile) {
        const myInterests = [
          ...(currentUserProfile.currentlyInto || []),
          ...(currentUserProfile.topGenres || []),
          ...(currentUserProfile.values || []),
        ];
        const theirInterests = [
          ...(u.profile.currentlyInto || []),
          ...(u.profile.topGenres || []),
          ...(u.profile.values || []),
        ];

        myInterests.forEach(interest => {
          if (theirInterests.some(t => t.toLowerCase() === interest.toLowerCase())) {
            similarityScore++;
          }
        });
      }

      return {
        id: u.id,
        name: u.name,
        profile: u.profile ? {
          displayName: u.profile.displayName,
          avatarUrl: u.profile.avatarUrl,
          bio: u.profile.bio,
        } : null,
        followersCount: u.friendshipsB.length,
        mutualCount,
        similarityScore,
        hasSimilarInterests: similarityScore > 0,
      };
    });

    // Sort by: similar interests first, then by mutuals, then by followers
    formattedUsers.sort((a, b) => {
      if (b.similarityScore !== a.similarityScore) return b.similarityScore - a.similarityScore;
      if (b.mutualCount !== a.mutualCount) return b.mutualCount - a.mutualCount;
      return b.followersCount - a.followersCount;
    });

    return NextResponse.json({ users: formattedUsers });
  } catch (error: any) {
    console.error('Error fetching suggested users:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch suggested users' },
      { status: 500 }
    );
  }
}
