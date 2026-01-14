
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decodeJwt } from 'jose';

export const dynamic = 'force-dynamic';

async function getUserId(req: Request) {
    // 1. Try NextAuth Session (Web)
    const session = await getServerSession(authOptions);
    if (session?.user?.id) return session.user.id;

    // 2. Try Supabase Token (Mobile)
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            // Decode token to get sub (userId)
            const decoded = decodeJwt(token);
            if (decoded?.sub) return decoded.sub;
        } catch (e) {
            console.error('Mobile auth failed:', e);
        }
    }
    return null;
}

export async function GET(req: Request) {
    try {
        const userId = await getUserId(req);

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // --- 1. Chat Friends (By Time) ---
        // Fetch user's conversation logs
        const chatLogs = await prisma.chatSessionLog.findMany({
            where: { userId },
            include: {
                conversation: {
                    select: {
                        participantA: true,
                        participantB: true
                    }
                }
            }
        });

        // Aggregate duration by "Other User"
        const chatTimeByUser: Record<string, number> = {};
        chatLogs.forEach(log => {
            const otherUser = log.conversation.participantA === userId ? log.conversation.participantB : log.conversation.participantA;
            chatTimeByUser[otherUser] = (chatTimeByUser[otherUser] || 0) + (log.durationMinutes || 0);
        });

        // --- 2. Share Friends (By Count) ---
        const shareLogs = await prisma.postShare.groupBy({
            by: ['toUserId'],
            where: { userId, toUserId: { not: null } },
            _count: { _all: true }
        });

        // --- 3. Hopin Buddies (Plan Overlap) ---
        // Find plans I am a member of
        const myPlans = await prisma.planMember.findMany({
            where: { userId },
            select: { planId: true }
        });
        const myPlanIds = myPlans.map(mp => mp.planId);

        // Find other members of those plans
        const hopinBuddies = await prisma.planMember.groupBy({
            by: ['userId'],
            where: {
                planId: { in: myPlanIds },
                userId: { not: userId }
            },
            _count: { _all: true }
        });


        // --- 4. Canvas Buddies (Journal/Canvas Session Overlap) ---
        const myCanvasSessions = await prisma.featureSessionParticipant.findMany({
            where: {
                userId,
                session: { type: { in: ['JOURNALING', 'CANVAS'] } }
            },
            select: { sessionId: true }
        });
        const myCanvasSessionIds = myCanvasSessions.map(s => s.sessionId);

        const canvasBuddies = await prisma.featureSessionParticipant.groupBy({
            by: ['userId'],
            where: {
                sessionId: { in: myCanvasSessionIds },
                userId: { not: userId }
            },
            _count: { _all: true }
        });


        // --- 5. Wrex Buddies (Workout/Breathing Overlap + Gym Partners) ---
        // A. Session overlap
        const myWrexSessions = await prisma.featureSessionParticipant.findMany({
            where: {
                userId,
                session: { type: { in: ['BREATHING', 'WREX', 'WORKOUT'] } }
            },
            select: { sessionId: true }
        });
        const myWrexSessionIds = myWrexSessions.map(s => s.sessionId);

        const wrexSessionBuddies = await prisma.featureSessionParticipant.groupBy({
            by: ['userId'],
            where: {
                sessionId: { in: myWrexSessionIds },
                userId: { not: userId }
            },
            _count: { _all: true }
        });

        // B. Gym Partners (Direct relation)
        const gymPartners = await prisma.gymPartner.findMany({
            where: {
                OR: [{ userId }, { partnerId: userId }],
                status: 'ACCEPTED'
            }
        });
        // Add 5 points for being a gym partner
        const gymPartnerMap: Record<string, number> = {};
        gymPartners.forEach(gp => {
            const other = gp.userId === userId ? gp.partnerId : gp.userId;
            gymPartnerMap[other] = 5;
        });


        // --- AGGREGATE SCORES ---
        const scores: Record<string, {
            chatTime: number,
            shares: number,
            hopin: number,
            canvas: number,
            wrex: number,
            total: number
        }> = {};

        const ensureUser = (uid: string) => {
            if (!scores[uid]) scores[uid] = { chatTime: 0, shares: 0, hopin: 0, canvas: 0, wrex: 0, total: 0 };
        };

        // Fill Chat
        Object.entries(chatTimeByUser).forEach(([uid, mins]) => {
            ensureUser(uid);
            scores[uid].chatTime = mins;
            scores[uid].total += mins * 0.1; // 10 mins chat = 1 point
        });

        // Fill Shares (shareLogs is array)
        shareLogs.forEach(entry => {
            if (!entry.toUserId) return;
            ensureUser(entry.toUserId);
            scores[entry.toUserId].shares = entry._count._all;
            scores[entry.toUserId].total += entry._count._all * 2; // 1 share = 2 points
        });

        // Fill Hopin
        hopinBuddies.forEach(entry => {
            ensureUser(entry.userId);
            scores[entry.userId].hopin = entry._count._all;
            scores[entry.userId].total += entry._count._all * 5; // 1 plan = 5 points
        });

        // Fill Canvas
        canvasBuddies.forEach(entry => {
            ensureUser(entry.userId);
            scores[entry.userId].canvas = entry._count._all;
            scores[entry.userId].total += entry._count._all * 5;
        });

        // Fill Wrex
        wrexSessionBuddies.forEach(entry => {
            ensureUser(entry.userId);
            scores[entry.userId].wrex = entry._count._all;
            scores[entry.userId].total += entry._count._all * 5;
        });
        Object.entries(gymPartnerMap).forEach(([uid, val]) => {
            ensureUser(uid);
            scores[uid].wrex += val;
            scores[uid].total += val;
        });


        // --- RESOLVE USER DETAILS ---
        const allUserIds = Object.keys(scores);
        const userDetails = await prisma.user.findMany({
            where: { id: { in: allUserIds } },
            select: { id: true, name: true, profile: { select: { displayName: true, avatarUrl: true } } }
        });

        const buddies = userDetails.map(u => ({
            id: u.id,
            name: u.name || u.profile?.displayName || 'User',
            avatarUrl: u.profile?.avatarUrl,
            stats: scores[u.id]
        }));

        // Sort by Total
        const sortedBuddies = [...buddies].sort((a, b) => b.stats.total - a.stats.total).slice(0, 10);
        // Sort specific categories
        const topChatters = [...buddies].sort((a, b) => b.stats.chatTime - a.stats.chatTime).slice(0, 5);
        const topSharers = [...buddies].sort((a, b) => b.stats.shares - a.stats.shares).slice(0, 5);
        const topHopin = [...buddies].sort((a, b) => b.stats.hopin - a.stats.hopin).slice(0, 5);
        const topCanvas = [...buddies].sort((a, b) => b.stats.canvas - a.stats.canvas).slice(0, 5);
        const topWrex = [...buddies].sort((a, b) => b.stats.wrex - a.stats.wrex).slice(0, 5);


        // --- REUSE PREVIOUS GENERAL STATS LOGIC ---
        const profileViews = await prisma.metric.count({ where: { userId, type: 'PROFILE_VIEW' } });

        // Feature Sessions Count (General)
        const featureSessions = await prisma.featureSession.groupBy({
            by: ['type'],
            where: { creatorId: userId },
            _count: { _all: true }
        });

        const taskStats = await prisma.task.groupBy({
            by: ['status'],
            where: { createdById: userId },
            _count: { _all: true }
        });

        const recentPosts = await prisma.post.findMany({
            where: { userId, postType: { not: 'CHAN' } },
            select: { id: true, createdAt: true, feature: true, postType: true },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        const recentTasks = await prisma.task.findMany({
            where: { createdById: userId },
            select: { id: true, createdAt: true, title: true, status: true },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        const postsAnalytics = await prisma.post.findMany({
            where: { userId, visibility: 'PUBLIC', postType: { not: 'CHAN' } },
            select: {
                id: true, content: true, createdAt: true, postType: true,
                _count: { select: { reactions: true, comments: true } },
                reactions: { select: { type: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        const processedPosts = postsAnalytics.map(p => {
            const reactions = p.reactions.reduce((acc, curr) => {
                acc[curr.type] = (acc[curr.type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            return {
                id: p.id,
                snippet: p.content.substring(0, 30),
                createdAt: p.createdAt,
                postType: p.postType,
                views: p._count.reactions * 5 + p._count.comments * 10,
                reactions: p._count.reactions,
                breakdown: {
                    W: reactions['W'] || 0,
                    L: reactions['L'] || 0,
                    CAP: reactions['CAP'] || 0
                }
            };
        });

        // --- RANKING BY TYPE (Lill, Fill, etc.) ---
        const allUserPosts = await prisma.post.findMany({
            where: { userId, postType: { not: 'CHAN' } },
            select: {
                id: true,
                content: true,
                postType: true,
                createdAt: true,
                reactions: { select: { type: true } }
            }
        });

        const totalPostsCount = allUserPosts.length;

        // Group by Type
        const typePerformance: Record<string, { count: number; bestPost: any }> = {};

        allUserPosts.forEach(post => {
            const wCount = post.reactions.filter(r => r.type === 'W').length;

            if (!typePerformance[post.postType]) {
                typePerformance[post.postType] = { count: 0, bestPost: null };
            }

            typePerformance[post.postType].count++;

            // Update best post if current is better
            const currentBest = typePerformance[post.postType].bestPost;
            if (!currentBest || wCount > currentBest.wCount) {
                typePerformance[post.postType].bestPost = {
                    id: post.id,
                    snippet: post.content.substring(0, 30),
                    wCount: wCount,
                    createdAt: post.createdAt
                };
            }
        });

        // Convert to array and sort by most liked best-post (or total count, but user asked for "order of most liked")
        const typeBreakdown = Object.entries(typePerformance).map(([type, data]) => ({
            type,
            count: data.count,
            bestPost: data.bestPost
        })).sort((a, b) => (b.bestPost?.wCount || 0) - (a.bestPost?.wCount || 0));
        const mostLiked = [...processedPosts].sort((a, b) => b.breakdown.W - a.breakdown.W)[0];
        const mostDisliked = [...processedPosts].sort((a, b) => b.breakdown.L - a.breakdown.L)[0];
        const mostCapped = [...processedPosts].sort((a, b) => b.breakdown.CAP - a.breakdown.CAP)[0];

        // --- 6. Channel / Show Analytics ---
        const myShows = await prisma.show.findMany({
            where: {
                chan: { post: { userId } }
            },
            include: {
                episodes: true
            }
        });

        // Mocking views/engagement for shows since we don't have direct metrics on them yet
        const showStats = myShows.map(show => {
            // Simulate view count based on episodes * random factor or age
            const episodeCount = show.episodes.length;
            const mockViews = episodeCount * 1200 + Math.floor(Math.random() * 5000);
            const mockLikes = Math.floor(mockViews * 0.15);

            return {
                id: show.id,
                title: show.title,
                coverUrl: show.coverUrl,
                episodesCount: episodeCount,
                views: mockViews,
                avgDuration: show.episodes.reduce((acc, ep) => acc + (ep.duration || 0), 0) / (episodeCount || 1),
                engagement: {
                    likes: mockLikes,
                    dislikes: Math.floor(mockLikes * 0.05),
                    w: Math.floor(mockLikes * 0.2),
                    l: Math.floor(mockLikes * 0.02)
                }
            };
        });

        const topShows = [...showStats].sort((a, b) => b.views - a.views).slice(0, 3);

        // Aggregate Audience Sentiment (From all posts)
        const totalReactions = processedPosts.reduce((acc, curr) => acc + curr.reactions, 0);
        const sentiment = processedPosts.reduce((acc, curr) => {
            acc.W += curr.breakdown.W;
            acc.L += curr.breakdown.L;
            acc.CAP += curr.breakdown.CAP;
            return acc;
        }, { W: 0, L: 0, CAP: 0 });


        return NextResponse.json({
            profile: { views: profileViews },
            buddies: {
                collabmates: sortedBuddies,
                chat: topChatters,
                shares: topSharers,
                hopin: topHopin,
                canvas: topCanvas,
                wrex: topWrex
            },
            usage: {
                featureSessions
            },
            tasks: {
                stats: taskStats
            },
            history: {
                posts: recentPosts,
                tasks: recentTasks
            },
            content: {
                posts: processedPosts,
                rankings: { mostLiked, mostDisliked, mostCapped },
                totalPosts: totalPostsCount,
                typeBreakdown: typeBreakdown
            },
            channel: {
                topShows,
                audience: {
                    totalReactions,
                    sentiment
                },
                currentViewers: Math.floor(Math.random() * 200) + 50 // Mock current viewers
            }
        });

    } catch (error) {
        console.error("Dashboard Analytics Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
