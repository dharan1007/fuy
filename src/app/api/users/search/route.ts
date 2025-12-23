import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
    }

    // Search users by name or email
    // Optionally restrict to followers/following if desired, but global search is often useful
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { profile: { displayName: { contains: query, mode: "insensitive" } } },
        ],
        NOT: {
          id: session.user.id, // Exclude self
        },
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
      take: 10,
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
