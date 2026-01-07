
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
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
                media: true,
                slashes: true,
                bubbles: {
                    include: {
                        user: {
                            include: {
                                profile: true
                            }
                        }
                    }
                },
                // Specialized types
                lillData: {
                    include: {
                        slashes: true,
                        media: true
                    }
                },
                audData: {
                    include: {
                        slashes: true
                    }
                },
                fillData: {
                    include: {
                        slashes: true
                    }
                },
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

        // Process post for frontend (similar to feed logic)
        const processedPost = {
            ...post,
            media: post.media.map(m => ({
                ...m,
                // Ensure URLs are accessible
                url: m.url.startsWith('http') ? m.url : `/uploads/${m.url}`
            })),
            // Add user-specific fields
            userReaction: userId ? post.reactions.find(r => r.userId === userId)?.type : null,
            totalBubbles: post.bubbles.length,
            topBubbles: post.bubbles.slice(0, 3)
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
