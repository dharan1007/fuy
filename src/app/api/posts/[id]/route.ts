import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;
        const postId = params.id;

        if (!postId) {
            return NextResponse.json(
                { error: "Post ID is required" },
                { status: 400 }
            );
        }

        const post = await prisma.post.findUnique({
            where: { id: postId },
            include: {
                user: {
                    include: {
                        profile: true,
                    },
                },
                comments: {
                    include: {
                        user: {
                            include: {
                                profile: true,
                            },
                        },
                        reactions: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
                reactions: true,
                postMedia: {
                    include: {
                        media: true
                    }
                },
                slashes: true,
                reactionBubbles: {
                    include: {
                        user: {
                            include: {
                                profile: true
                            }
                        }
                    }
                },
                // Specialized types
                lillData: true,
                audData: true,
                fillData: true,
                xrayData: true,
                chanData: true,
                chapterData: true,
                pullUpDownData: true,
                simpleData: true,
            },
        });

        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        // Process post for frontend
        const processedPost = {
            ...post,
            media: post.postMedia.map((pm: any) => ({
                ...pm.media,
                // Ensure URLs are accessible
                url: pm.media.url.startsWith('http') ? pm.media.url : `/uploads/${pm.media.url}`
            })),
            // Map reactionBubbles to bubbles for frontend if needed, or keep as reactionBubbles
            bubbles: post.reactionBubbles,
            // Add user-specific fields
            userReaction: userId ? post.reactions.find((r: any) => r.userId === userId)?.type : null,
            totalBubbles: post.reactionBubbles.length,
            topBubbles: post.reactionBubbles.slice(0, 3)
        };

        return NextResponse.json(processedPost);
    } catch (error) {
        console.error("Error fetching post:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
