export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { cleanupExpiredStories } from "@/lib/cron";


export async function GET(req: NextRequest) {
    // Lazy cleanup of expired stories
    await cleanupExpiredStories();

    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Get IDs of users the current user follows
    const following = await prisma.subscription.findMany({
        where: { subscriberId: user.id },
        select: { subscribedToId: true },
    });

    const followingIds = following.map((f) => f.subscribedToId);

    // 2. Fetch ACTIVE stories from these users + current user
    // Active = expiresAt is in the future
    const stories = await prisma.post.findMany({
        where: {
            postType: "STORY",
            // @ts-ignore
            expiresAt: { gt: new Date() },
            userId: { in: [...followingIds, user.id] },
            OR: [
                { visibility: "PUBLIC" },
                { visibility: "FRIENDS" }, // TODO: Add friend check logic closer to query or filter in memory
                { visibility: "SPECIFIC" }, // TODO: Handle specific logic
                // For MVP: Simplification - if I follow them, I see their stories unless private logic prevents it.
                // Assuming SUBSCRIPTION implies access for now for "following".
            ]
        },
        include: {
            user: {
                select: {
                    id: true,
                    profile: { select: { displayName: true, avatarUrl: true } }
                }
            },
            // @ts-ignore
            storyData: true,
            media: true,
            reactions: true, // For seeing who liked/reacted
        },
        orderBy: { createdAt: 'asc' } // Oldest first (chronological story view)
    });

    // 3. Group by User
    const groupedStories = stories.reduce((acc: any, story: any) => {
        const uId = story.userId;
        if (!acc[uId]) {
            acc[uId] = {
                user: story.user,
                stories: [],
                hasUnseen: false, // Client will determine this based on local storage or lastViewedAt
                latestCreatedAt: story.createdAt
            };
        }
        acc[uId].stories.push(story);
        // Update latest timestamp for sorting the rail
        if (new Date(story.createdAt) > new Date(acc[uId].latestCreatedAt)) {
            acc[uId].latestCreatedAt = story.createdAt;
        }
        return acc;
    }, {});

    // Convert to array and sort: Current user first, then others by latest update
    const railData = Object.values(groupedStories).sort((a: any, b: any) => {
        if (a.user.id === user.id) return -1;
        if (b.user.id === user.id) return 1;
        return new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime();
    });

    return NextResponse.json(railData);
}

export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { mediaUrl, mediaType, duration, visibility } = body;

        if (!mediaUrl) {
            return NextResponse.json({ error: "Media URL is required" }, { status: 400 });
        }

        // Calculate expiration
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (duration || 24));

        // Create the Story Post
        const post = await prisma.post.create({
            data: {
                userId: user.id,
                postType: "STORY",
                content: "Story", // Default content for stories
                visibility: visibility || "PUBLIC",
                expiresAt,
                media: {
                    create: {
                        type: mediaType || "IMAGE",
                        url: mediaUrl,
                        userId: user.id
                    }
                }
                // Note: If Story model exists, we can add storyData here, but standard Post is sufficient for basic stories
            }
        });

        return NextResponse.json(post);
    } catch (error) {
        console.error("Error creating story:", error);
        return NextResponse.json({ error: "Failed to create story" }, { status: 500 });
    }
}
