
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import WatchClient from "@/components/Watch/WatchClient";
import { SpaceBackground } from "@/components/SpaceBackground";
import Link from "next/link";

export default async function WatchPage({ params }: { params: { id: string } }) {
    const episodeId = params.id;
    const user = await getSessionUser();

    // 1. Fetch Episode with full chain
    const episode = await prisma.episode.findUnique({
        where: { id: episodeId },
        include: {
            show: {
                include: {
                    chan: {
                        include: {
                            post: {
                                include: {
                                    user: {
                                        include: {
                                            profile: true
                                        }
                                    },
                                    reactionBubbles: {
                                        include: {
                                            user: {
                                                include: {
                                                    profile: true
                                                }
                                            }
                                        },
                                        orderBy: { createdAt: 'desc' },
                                        take: 20
                                    }
                                }
                            }
                        }
                    },
                    episodes: {
                        orderBy: { episodeNumber: 'asc' }
                    }
                }
            }
        }
    }) as any;

    if (!episode) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white">
                <SpaceBackground />
                <h1 className="text-4xl font-black mb-4">Frequency Lost</h1>
                <p className="text-white/40 mb-8 text-lg font-mono">This episode doesn't exist or has been archived.</p>
                <Link
                    href="/explore"
                    className="px-8 py-3 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-all"
                >
                    Return to Explore
                </Link>
            </div>
        );
    }

    const show = episode.show;
    const channel = show.chan;
    const episodes = show.episodes;
    const post = channel.post;

    // 2. Fetch Reaction Counts for the channel post
    const reactions = await prisma.reaction.findMany({
        where: { postId: post.id }
    });

    const reactionCounts = {
        W: reactions.filter(r => r.type === 'W').length,
        L: reactions.filter(r => r.type === 'L').length,
        CAP: reactions.filter(r => r.type === 'CAP').length,
        FIRE: reactions.filter(r => r.type === 'FIRE').length,
    };

    // 3. User specific state
    let isSubscribed = false;
    let isLiked = false;
    let initialReaction: any = null;
    if (user?.id) {
        const sub = await prisma.subscription.findUnique({
            where: {
                subscriberId_subscribedToId: {
                    subscriberId: user.id,
                    subscribedToId: post.userId
                }
            }
        });
        isSubscribed = !!sub;

        const like = await prisma.postLike.findUnique({
            where: {
                userId_postId: {
                    userId: user.id,
                    postId: post.id
                }
            }
        });
        isLiked = !!like;

        const reaction = await prisma.reaction.findUnique({
            where: {
                userId_postId: {
                    userId: user.id,
                    postId: post.id
                }
            }
        });
        initialReaction = reaction?.type || null;
    }

    // 4. Similar Channels
    const similarChannels = await prisma.chan.findMany({
        where: {
            NOT: { id: channel.id },
            isLive: true
        },
        take: 10,
        include: {
            post: {
                include: {
                    user: {
                        include: {
                            profile: true
                        }
                    }
                }
            }
        }
    }) as any;

    // Prepare initial post data for Client
    const initialPost = {
        ...post,
        reactionsCount: reactionCounts,
        bubbles: post.reactionBubbles.map((b: any) => ({
            id: b.id,
            mediaUrl: b.mediaUrl,
            mediaType: b.mediaType,
            user: b.user
        })),
        bubblesCount: post.reactionBubbles.length
    };

    return (
        <WatchClient
            episode={episode}
            show={show}
            channel={channel}
            episodes={episodes}
            similarChannels={similarChannels}
            initialPost={initialPost}
            initialIsSubscribed={isSubscribed}
            initialIsLiked={isLiked}
            initialReaction={initialReaction}
            currentUser={user}
        />
    );
}
