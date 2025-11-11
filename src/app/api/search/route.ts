import { getSessionUser } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

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

const MOCK_USERS = [
  {
    id: "user_1",
    name: "Sarah Johnson",
    handle: "@sarahjohnson",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
    bio: "Yoga instructor & wellness coach",
    followers: 1234,
    isFollowing: false,
  },
  {
    id: "user_2",
    name: "Mike Chen",
    handle: "@mikechen",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mike",
    bio: "UI/UX Designer | Design System Enthusiast",
    followers: 2156,
    isFollowing: true,
  },
  {
    id: "user_3",
    name: "Emma Davis",
    handle: "@emmadavis",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma",
    bio: "Meditation & mindfulness expert",
    followers: 987,
    isFollowing: false,
  },
  {
    id: "user_4",
    name: "John Smith",
    handle: "@johnsmith",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=john",
    bio: "Developer & Tech Enthusiast",
    followers: 1567,
    isFollowing: true,
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

    // Filter posts
    const posts =
      type === "all" || type === "posts"
        ? MOCK_POSTS.filter(
            (post) =>
              post.content.toLowerCase().includes(query) ||
              post.author.toLowerCase().includes(query)
          )
        : [];

    // Filter users
    const users =
      type === "all" || type === "users"
        ? MOCK_USERS.filter(
            (user) =>
              user.name.toLowerCase().includes(query) ||
              user.handle.toLowerCase().includes(query) ||
              user.bio.toLowerCase().includes(query)
          )
        : [];

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
