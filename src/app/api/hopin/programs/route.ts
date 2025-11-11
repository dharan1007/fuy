import { getSessionUser } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

// Mock data for Hopin programs
const HOPIN_PROGRAMS = [
  {
    id: "prog_1",
    title: "Morning Yoga Session",
    description: "Start your day with a refreshing yoga session",
    category: "wellness",
    participants: 24,
    friendsInterested: ["Sarah", "Mike"],
    image: "🧘",
    startTime: new Date(Date.now() + 3600000).toISOString(),
    duration: 60,
  },
  {
    id: "prog_2",
    title: "Creative Writing Workshop",
    description: "Explore your creative writing skills with peers",
    category: "creative",
    participants: 18,
    friendsInterested: ["Emma"],
    image: "✍️",
    startTime: new Date(Date.now() + 7200000).toISOString(),
    duration: 90,
  },
  {
    id: "prog_3",
    title: "Tech Discussion Meetup",
    description: "Discuss latest tech trends and innovations",
    category: "technology",
    participants: 32,
    friendsInterested: ["Sarah", "John"],
    image: "💻",
    startTime: new Date(Date.now() + 10800000).toISOString(),
    duration: 75,
  },
  {
    id: "prog_4",
    title: "Book Club Meeting",
    description: "Monthly book club discussion and sharing",
    category: "reading",
    participants: 15,
    friendsInterested: ["Emma", "Mike"],
    image: "📚",
    startTime: new Date(Date.now() + 14400000).toISOString(),
    duration: 60,
  },
  {
    id: "prog_5",
    title: "Fitness Challenge",
    description: "Join our 30-day fitness challenge",
    category: "fitness",
    participants: 42,
    friendsInterested: ["Sarah"],
    image: "💪",
    startTime: new Date(Date.now() + 18000000).toISOString(),
    duration: 45,
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

    // Return public Hopin programs with friend interest data
    return NextResponse.json({
      programs: HOPIN_PROGRAMS,
      userEmail: user.email,
    });
  } catch (error) {
    console.error("Error fetching Hopin programs:", error);
    return NextResponse.json(
      { error: "Failed to fetch programs" },
      { status: 500 }
    );
  }
}
