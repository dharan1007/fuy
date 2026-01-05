export const dynamic = 'force-dynamic';
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

    // 1b. Get Friends 
    const friends = await prisma.friendship.findMany({
        where: {
            OR: [
                { userId: user.id, status: 'ACCEPTED' },
                { friendId: user.id, status: 'ACCEPTED' }
            ]
        },
        select: { userId: true, friendId: true }
    });

    const followingIds = following.map((f) => f.subscribedToId);
    const friendIds = friends.map(f => f.userId === user.id ? f.friendId : f.userId);
    const visibleUserIds = Array.from(new Set([...followingIds, ...friendIds, user.id]));

    // 2. Fetch ACTIVE stories from these users + current user
    // Active = expiresAt is in the future
    const stories = await prisma.post.findMany({
        where: {
            postType: "STORY",
            // @ts-ignore
            expiresAt: { gt: new Date() },
            userId: { in: visibleUserIds },
            OR: [
                { visibility: "PUBLIC" },
                { visibility: "FRIENDS" },
                { visibility: "SPECIFIC" },
            ]
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    profile: { select: { displayName: true, avatarUrl: true } }
                }
            },
            // @ts-ignore
            storyData: true,
            postMedia: {
                include: {
                    media: true
                }
            },
            // reactions: true, // Removed for performance
        },
        orderBy: { createdAt: 'asc' }
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
                postMedia: {
                    create: {
                        media: {
                            create: {
                                type: mediaType || "IMAGE",
                                url: mediaUrl,
                                userId: user.id
                            }
                        }
                    }
                }
                // Note: If Story model exists, we can add storyData here, but standard Post is sufficient for basic stories
            },
            include: {
                user: { include: { profile: true } },
                postMedia: { include: { media: true } }
            }
        });

        // B. Create FeedItem (Denormalized) for fast-reads
        const mediaPreviews = [{
            type: mediaType || "IMAGE",
            url: mediaUrl,
            aspect: 1
        }];

        await prisma.feedItem.create({
            data: {
                userId: user.id,
                postId: post.id,
                authorName: post.user.profile?.displayName || 'User',
                authorAvatarUrl: post.user.profile?.avatarUrl,
                postType: "STORY",
                feature: "OTHER",
                contentSnippet: "Story",
                mediaPreviews: JSON.stringify(mediaPreviews),
                createdAt: post.createdAt,
                likeCount: 0,
                commentCount: 0,
                shareCount: 0
            }
        });

        return NextResponse.json(post);
    } catch (error) {
        console.error("Error creating story:", error);
        return NextResponse.json({ error: "Failed to create story" }, { status: 500 });
    }
}

