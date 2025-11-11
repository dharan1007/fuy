import { getSessionUser } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

// Mock activity data for ranking calculation
interface UserActivity {
  messaging: number;
  journalling: number;
  hopin: number;
  shopping: number;
  posting: number;
  browsing: number;
  bonding: number;
  breathing: number;
}

interface UserRanking {
  userId: string;
  userName: string;
  overallRank: number;
  overallScore: number;
  categoryRanks: {
    [category: string]: number;
  };
  categoryScores: {
    [category: string]: number;
  };
  friendRank: number;
  globalRank: number;
  lastUpdated: string;
  activities: UserActivity;
  daysStreak: number;
}

// Mock data for user rankings
const USER_RANKINGS: { [key: string]: UserRanking } = {
  user_1: {
    userId: "user_1",
    userName: "Sarah Johnson",
    overallRank: 1,
    overallScore: 8750,
    categoryRanks: {
      messaging: 2,
      journalling: 1,
      hopin: 3,
      shopping: 5,
      posting: 2,
      bonding: 1,
    },
    categoryScores: {
      messaging: 850,
      journalling: 950,
      hopin: 750,
      shopping: 450,
      posting: 820,
      bonding: 1200,
    },
    friendRank: 1,
    globalRank: 5,
    lastUpdated: new Date().toISOString(),
    activities: {
      messaging: 125,
      journalling: 42,
      hopin: 8,
      shopping: 3,
      posting: 15,
      browsing: 340,
      bonding: 28,
      breathing: 12,
    },
    daysStreak: 23,
  },
  user_2: {
    userId: "user_2",
    userName: "Mike Chen",
    overallRank: 2,
    overallScore: 7920,
    categoryRanks: {
      messaging: 1,
      journalling: 4,
      hopin: 1,
      shopping: 3,
      posting: 5,
      bonding: 3,
    },
    categoryScores: {
      messaging: 920,
      journalling: 680,
      hopin: 850,
      shopping: 520,
      posting: 610,
      bonding: 870,
    },
    friendRank: 2,
    globalRank: 8,
    lastUpdated: new Date().toISOString(),
    activities: {
      messaging: 145,
      journalling: 28,
      hopin: 15,
      shopping: 5,
      posting: 10,
      browsing: 280,
      bonding: 32,
      breathing: 8,
    },
    daysStreak: 18,
  },
  user_3: {
    userId: "user_3",
    userName: "Emma Davis",
    overallRank: 3,
    overallScore: 7450,
    categoryRanks: {
      messaging: 3,
      journalling: 2,
      hopin: 2,
      shopping: 1,
      posting: 1,
      bonding: 2,
    },
    categoryScores: {
      messaging: 780,
      journalling: 890,
      hopin: 800,
      shopping: 600,
      posting: 920,
      bonding: 950,
    },
    friendRank: 3,
    globalRank: 12,
    lastUpdated: new Date().toISOString(),
    activities: {
      messaging: 108,
      journalling: 38,
      hopin: 12,
      shopping: 8,
      posting: 22,
      browsing: 310,
      bonding: 25,
      breathing: 16,
    },
    daysStreak: 15,
  },
};

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get query parameters for filtering
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type") || "global"; // global, friends, or category

    let rankings: UserRanking[] = [];

    if (type === "global") {
      // Return global rankings (top 10)
      rankings = Object.values(USER_RANKINGS)
        .sort((a, b) => b.overallScore - a.overallScore)
        .slice(0, 10);
    } else if (type === "friends") {
      // Return friend rankings (mock: top 3)
      rankings = Object.values(USER_RANKINGS)
        .sort((a, b) => b.overallScore - a.overallScore)
        .slice(0, 3);
    } else if (type === "category") {
      // Return category-wise rankings
      const category = searchParams.get("category") || "messaging";
      rankings = Object.values(USER_RANKINGS)
        .sort((a, b) => {
          const aScore = a.categoryScores[category] || 0;
          const bScore = b.categoryScores[category] || 0;
          return bScore - aScore;
        })
        .slice(0, 10);
    }

    return NextResponse.json({
      rankings,
      userEmail: user.email,
      type,
    });
  } catch (error) {
    console.error("Error fetching rankings:", error);
    return NextResponse.json(
      { error: "Failed to fetch rankings" },
      { status: 500 }
    );
  }
}
