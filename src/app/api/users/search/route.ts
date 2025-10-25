// src/app/api/users/search/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
    }

    // Search users by name or email
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: userId } }, // Exclude current user
          {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        profile: {
          select: {
            displayName: true,
            avatarUrl: true,
            bio: true,
          },
        },
        // Get friendship status with current user
        friendshipsA: {
          where: {
            OR: [
              { friendId: userId },
              { userId: userId },
            ],
          },
          select: {
            id: true,
            status: true,
            userId: true,
            friendId: true,
          },
        },
        friendshipsB: {
          where: {
            OR: [
              { friendId: userId },
              { userId: userId },
            ],
          },
          select: {
            id: true,
            status: true,
            userId: true,
            friendId: true,
          },
        },
      },
      take: 20,
    });

    // Format results with friendship status
    const results = users.map((user) => {
      const allFriendships = [...user.friendshipsA, ...user.friendshipsB];
      const friendship = allFriendships[0]; // There should be at most one

      let friendshipStatus = "NONE";
      let friendshipId = null;
      let isPending = false;
      let isSentByMe = false;

      if (friendship) {
        friendshipId = friendship.id;
        friendshipStatus = friendship.status;
        if (friendship.status === "PENDING") {
          isPending = true;
          isSentByMe = friendship.userId === userId;
        }
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        displayName: user.profile?.displayName,
        avatarUrl: user.profile?.avatarUrl,
        bio: user.profile?.bio,
        friendshipStatus,
        friendshipId,
        isPending,
        isSentByMe,
      };
    });

    return NextResponse.json({ users: results });
  } catch (error: any) {
    console.error("Search users error:", error);
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
