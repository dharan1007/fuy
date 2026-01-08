// src/app/api/suggestions/users/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { extractProfileTags, calculateTagOverlap, logRecoFeedback } from '@/lib/recommendation';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode'); // 'creators' for public only

    // Get current user's profile tags using recommendation brain
    const profileTags = await extractProfileTags(user.id);
    const allMyTags = [
      ...profileTags.values,
      ...profileTags.skills,
      ...profileTags.genres,
      ...profileTags.topics,
      ...profileTags.currentlyInto,
    ];

    // Get user's slash preferences for additional matching
    const slashPrefs = await prisma.slashInteraction.findMany({
      where: { userId: user.id, score: { gt: 0 } },
      orderBy: { score: 'desc' },
      take: 20,
      select: { slashTag: true }
    });
    const topSlashes = slashPrefs.map(s => s.slashTag);

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
          friendshipsB: {
            none: { userId: user.id },
          },
        },
      ],
    };

    // For creators mode, only show public profiles
    if (mode === 'creators') {
      baseWhere.AND.push({ profile: { isPrivate: false } });
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
            skills: true,
            interactionTopics: true,
            city: true,
          },
        },
        friendshipsB: {
          select: { userId: true },
          where: { status: "ACCEPTED" }
        },
        friendshipsA: {
          select: { friendId: true },
          where: { status: "ACCEPTED" }
        },
        // Get posts with slashes for content match
        posts: {
          select: { slashes: { select: { tag: true } } },
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { followersCount: 'desc' },
      take: 50,
    });

    // Score each user using recommendation brain
    const scoredUsers = suggestedUsers.map((u) => {
      // Calculate mutual connections
      const userFollowing = u.friendshipsA.map(f => f.friendId);
      const mutualCount = userFollowing.filter(id => followingIds.includes(id)).length;

      // Get their tags
      const theirTags = [
        ...(u.profile?.currentlyInto || []),
        ...(u.profile?.topGenres || []),
        ...(u.profile?.values || []),
        ...(u.profile?.skills || []),
        ...(u.profile?.interactionTopics || []),
      ];

      // Profile tag overlap score
      const profileScore = calculateTagOverlap(allMyTags, theirTags) * 10;

      // Slash content overlap - check their posts
      const theirSlashes = u.posts.flatMap(p => p.slashes.map(s => s.tag));
      const slashScore = calculateTagOverlap(topSlashes, theirSlashes) * 5;

      // Mutual boost
      const mutualScore = mutualCount * 2;

      // Total recommendation score
      const totalScore = profileScore + slashScore + mutualScore;

      return {
        id: u.id,
        name: u.name,
        profile: u.profile ? {
          displayName: u.profile.displayName,
          avatarUrl: u.profile.avatarUrl,
          bio: u.profile.bio,
          city: u.profile.city,
        } : null,
        followersCount: u.friendshipsB.length,
        mutualCount,
        profileScore: Math.round(profileScore * 100) / 100,
        slashScore: Math.round(slashScore * 100) / 100,
        totalScore: Math.round(totalScore * 100) / 100,
        hasSimilarInterests: profileScore > 0 || slashScore > 0,
        matchReason: profileScore > slashScore
          ? 'Similar interests'
          : slashScore > 0
            ? 'Creates content you like'
            : mutualCount > 0
              ? 'Mutual connections'
              : 'Popular creator',
      };
    });

    // Sort by total recommendation score
    scoredUsers.sort((a, b) => b.totalScore - a.totalScore);

    // Take top results
    const topUsers = scoredUsers.slice(0, 20);

    return NextResponse.json({ users: topUsers });
  } catch (error: any) {
    console.error('Error fetching suggested users:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch suggested users' },
      { status: 500 }
    );
  }
}
