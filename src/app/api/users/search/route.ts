// src/app/api/users/search/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").toLowerCase();

    if (!query || query.length < 1) {
      return NextResponse.json({ users: [] });
    }

    // Get all users and filter in memory (SQLite compatible)
    const allUsers = await prisma.user.findMany({
      where: {
        id: { not: userId }, // Exclude self
      },
      select: {
        id: true,
        name: true,
        email: true,
        profile: {
          select: {
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Filter by name or email (case-insensitive) in memory
    const users = allUsers.filter(
      (user: typeof allUsers[0]) =>
        (user.name?.toLowerCase().includes(query)) ||
        (user.email?.toLowerCase().includes(query))
    ).slice(0, 20); // Limit to 20 results

    return NextResponse.json({ users });
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
