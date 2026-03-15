import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { buildHomeFeed } from "@/lib/recommendation";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    console.log("[API/HomeFeed] Request received:", request.url);
    try {
        const user = await getSessionUser();
        console.log("[API/HomeFeed] Authenticated user:", user?.id);
        const userId = user?.id;

        if (!userId) {
            console.warn("[API/HomeFeed] Unauthorized access attempt.");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        console.log(`[API/HomeFeed] User: ${userId} requested limit: ${limit}`);

        // V2 Engine: Collaborative Filtering + Anti-Fatigue + Discovery Injection
        const { posts, meta } = await buildHomeFeed(userId, limit);

        console.log(`[API/HomeFeed] V2 Engine returned ${posts.length} posts.`,
            `Collaborative: ${meta.collaborativeCount}, Global: ${meta.globalVelocityCount}, Scored: ${meta.totalCandidatesScored}`);

        // Format for client consumption
        const formattedPosts = posts.map((p) => ({
            id: p.postId,
            postType: p.postType,
            content: p.content,
            createdAt: p.createdAt,
            user: {
                id: p.authorId,
                name: p.authorName,
                trustScore: p.authorTrust,
                profile: {
                    displayName: p.authorName,
                    avatarUrl: p.authorAvatar,
                },
            },
            media: [], // Media is fetched separately by the mobile client per-post
            slashTags: p.slashTags,
            score: p.finalScore,
            source: p.source,
        }));

        return NextResponse.json({
            posts: formattedPosts,
            meta,
        }, {
            headers: { 'Cache-Control': 'private, no-cache' }
        });

    } catch (error: any) {
        console.error("Error in home feed API:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
