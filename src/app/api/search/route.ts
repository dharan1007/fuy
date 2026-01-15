import { getSessionUser } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// Type definitions
interface SearchUser {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  followers: number;
  isFollowing: boolean;
  friendshipId?: string;
  friendshipStatus?: "PENDING" | "ACCEPTED";
}

// Mock data for search results
const MOCK_POSTS = [
  {
    id: "post_1",
    author: "Sarah Johnson",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
    content: "Just finished an amazing yoga session!",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=300&h=300",
    timestamp: "2 hours ago",
    likes: 245,
  },
  {
    id: "post_2",
    author: "Mike Chen",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mike",
    content: "Working on a new design system",
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=300&h=300",
    timestamp: "4 hours ago",
    likes: 189,
  },
  {
    id: "post_3",
    author: "Emma Davis",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma",
    content: "Morning meditation completed",
    timestamp: "6 hours ago",
    likes: 432,
  },
];

const MOCK_TEMPLATES = [
  {
    id: "template_1",
    title: "Morning Routine Template",
    description: "Start your day with this structured routine",
    category: "lifestyle",
    usesCount: 234,
    thumbnail: "🌅",
  },
  {
    id: "template_2",
    title: "Productivity Planner",
    description: "Organize your tasks and goals effectively",
    category: "productivity",
    usesCount: 567,
    thumbnail: "📊",
  },
  {
    id: "template_3",
    title: "Wellness Tracker",
    description: "Monitor your health and fitness goals",
    category: "health",
    usesCount: 432,
    thumbnail: "💪",
  },
];

const MOCK_PLACES = [
  {
    id: "place_1",
    name: "Serenity Yoga Studio",
    address: "123 Main St, Downtown",
    category: "wellness",
    rating: 4.8,
    reviews: 245,
    image: "🧘",
  },
  {
    id: "place_2",
    name: "Green Leaf Cafe",
    address: "456 Oak Ave, Midtown",
    category: "cafe",
    rating: 4.6,
    reviews: 189,
    image: "☕",
  },
  {
    id: "place_3",
    name: "Creative Hub CoWorking",
    address: "789 Tech Blvd, Tech Park",
    category: "coworking",
    rating: 4.9,
    reviews: 342,
    image: "💻",
  },
];

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const query = (searchParams.get("q") || "").toLowerCase();
    const type = searchParams.get("type") || "all"; // all, posts, users, templates, places

    if (!query) {
      return NextResponse.json({
        posts: [],
        users: [],
        templates: [],
        places: [],
        query: "",
        userEmail: user.email,
      });
    }

    // Fetch real posts from database
    let posts: any[] = [];
    if (type === "all" || type === "posts") {
      const dbPosts = await prisma.post.findMany({
        where: {
          content: { contains: query, mode: "insensitive" },
          status: "PUBLISHED",
          user: {
            profile: { isPrivate: false } // Only show public posts for now
          }
        },
        include: {
          user: {
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
          },
          postMedia: {
            take: 1,
            include: { media: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      posts = dbPosts.map(p => ({
        id: p.id,
        author: p.user?.profile?.displayName || p.user?.name || "Unknown",
        avatar: p.user?.profile?.avatarUrl,
        content: p.content,
        image: p.postMedia?.[0]?.media?.url, // Valid even if undefined
        timestamp: p.createdAt.toISOString(),
        likes: 0 // We can fetch counts if needed but keeping it simple for search summary
      }));
    }

    // Fetch real users from database
    let users: SearchUser[] = [];
    if (type === "all" || type === "users") {
      const dbUsers = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { profileCode: { contains: query, mode: "insensitive" } },
            { profile: { bio: { contains: query, mode: "insensitive" } } },
          ],
        },
        include: { profile: true },
        take: 10,
      });

      // Fetch subscriptions (follows) for current user with these search results
      const subscriptions = user.id ? await prisma.subscription.findMany({
        where: {
          subscriberId: user.id,
          subscribedToId: { in: dbUsers.map(u => u.id) }
        },
      }) : [];

      const followingSet = new Set(subscriptions.map(s => s.subscribedToId));

      users = dbUsers.map((dbUser) => {
        const isFollowing = followingSet.has(dbUser.id);

        return {
          id: dbUser.id,
          name: dbUser.name || "Anonymous",
          handle: dbUser.profileCode ? `#${dbUser.profileCode}` : `@${(dbUser.name || dbUser.email).toLowerCase().replace(/\s+/g, "")}`,
          avatar: dbUser.profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${dbUser.id}`,
          bio: dbUser.profile?.bio || "No bio yet",
          followers: dbUser.followersCount || 0,
          isFollowing: isFollowing,
          friendshipId: undefined,
          friendshipStatus: isFollowing ? "ACCEPTED" : undefined,
        };
      });
    }

    // Filter templates
    const templates =
      type === "all" || type === "templates"
        ? MOCK_TEMPLATES.filter(
          (template) =>
            template.title.toLowerCase().includes(query) ||
            template.description.toLowerCase().includes(query) ||
            template.category.toLowerCase().includes(query)
        )
        : [];

    // Filter places
    const places =
      type === "all" || type === "places"
        ? MOCK_PLACES.filter(
          (place) =>
            place.name.toLowerCase().includes(query) ||
            place.address.toLowerCase().includes(query) ||
            place.category.toLowerCase().includes(query)
        )
        : [];

    return NextResponse.json({
      posts,
      users,
      templates,
      places,
      query,
      totalResults: posts.length + users.length + templates.length + places.length,
      userEmail: user.email,
    });
  } catch (error) {
    console.error("Error performing search:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}
