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

        // Debug log
        if (post && post.postType === 'XRAY') {
            console.log('[API] Fetched XRAY Post:', {
                id: post.id,
                xrayData: post.xrayData,
                mediaCount: post.postMedia.length,
                mediaVariants: post.postMedia.map(pm => pm.media.variant)
            });
        }

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
            topBubbles: post.reactionBubbles.slice(0, 3),

            // Synthesize xrayData if missing for XRAY posts
            xrayData: post.postType === 'XRAY' ? (post.xrayData || {
                id: post.id,
                topLayerUrl: post.postMedia.find((pm: any) => pm.media.variant === 'xray-top')?.media.url || post.postMedia[0]?.media.url || '',
                topLayerType: post.postMedia.find((pm: any) => pm.media.variant === 'xray-top')?.media.type || 'IMAGE',
                bottomLayerUrl: post.postMedia.find((pm: any) => pm.media.variant === 'xray-bottom')?.media.url || post.postMedia[1]?.media.url || '',
                bottomLayerType: post.postMedia.find((pm: any) => pm.media.variant === 'xray-bottom')?.media.type || 'IMAGE',
            }) : undefined
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
