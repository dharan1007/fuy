// src/app/api/reco/events/route.ts
// Event recommendations using recommendation brain

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import {
    extractProfileTags,
    getUserSlashPreferences,
    calculateTagOverlap
} from "@/lib/recommendation";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = Math.min(Number(searchParams.get("limit")) || 10, 30);
        const lat = parseFloat(searchParams.get("lat") || "0");
        const lng = parseFloat(searchParams.get("lng") || "0");

        const user = await getSessionUser();
        const userId = user?.id;

        // Get upcoming plans/events
        const plans = await prisma.plan.findMany({
            where: {
                status: 'OPEN',
                date: { gte: new Date() },
                OR: [
                    { visibility: 'PUBLIC' },
                    ...(userId ? [{ visibility: 'FOLLOWERS' }] : [])
                ]
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        profile: { select: { displayName: true, avatarUrl: true } }
                    }
                },
                members: {
                    where: { status: 'ACCEPTED' },
                    select: { userId: true }
                },
                _count: { select: { members: true } }
            },
            orderBy: { date: 'asc' },
            take: 50
        });

        if (!userId) {
            // Return by date and popularity for non-logged users
            const sorted = plans
                .sort((a, b) => b._count.members - a._count.members)
                .slice(0, limit);

            return NextResponse.json({ events: formatEvents(sorted, {}) });
        }

        // Get user preferences
        const [profileTags, slashPrefs] = await Promise.all([
            extractProfileTags(userId),
            getUserSlashPreferences(userId)
        ]);

        const userTags = [
            ...profileTags.values,
            ...profileTags.currentlyInto,
            ...profileTags.topics,
        ];

        // Get user's friends
        const friendships = await prisma.friendship.findMany({
            where: {
                OR: [{ userId, status: 'ACCEPTED' }, { friendId: userId, status: 'ACCEPTED' }]
            },
            select: { userId: true, friendId: true }
        });
        const friendIds = new Set(friendships.flatMap(f => [f.userId, f.friendId]));
        friendIds.delete(userId);

        // Get user's profile for location and vibe time
        const profile = await prisma.profile.findUnique({
            where: { userId },
            select: { city: true, bestVibeTime: true }
        });

        // Score each event
        const scored = plans.map(plan => {
            let score = 0;

            // Parse slashes from plan
            const planSlashes: string[] = plan.slashes ? JSON.parse(plan.slashes) : [];

            // Slash preference match
            for (const tag of planSlashes) {
                score += slashPrefs[tag] || 0;
            }

            // Tag overlap
            score += calculateTagOverlap(userTags, planSlashes) * 5;

            // Friend attending boost
            const attendingFriends = plan.members.filter(m => friendIds.has(m.userId)).length;
            score += attendingFriends * 3;

            // Creator is friend
            if (friendIds.has(plan.creatorId)) {
                score += 4;
            }

            // Location proximity (if coordinates provided)
            if (lat && lng && plan.latitude && plan.longitude) {
                const distance = calculateDistance(lat, lng, plan.latitude, plan.longitude);
                // Boost nearby events (within 50km = +5, decays with distance)
                score += Math.max(0, 5 - (distance / 10));
            }

            // Time preference match
            if (profile?.bestVibeTime && plan.date) {
                const planHour = new Date(plan.date).getHours();
                const vibeMatch = matchVibeTime(profile.bestVibeTime, planHour);
                score += vibeMatch * 2;
            }

            // Popularity boost
            score += Math.log10((plan._count.members || 0) + 1);

            return { plan, score, attendingFriends };
        });

        // Sort by score
        scored.sort((a, b) => b.score - a.score);

        // Build context
        const context: Record<string, any> = {};
        for (const { plan, score, attendingFriends } of scored) {
            const reasons: string[] = [];
            if (attendingFriends > 0) reasons.push(`${attendingFriends} friend(s) attending`);
            if (friendIds.has(plan.creatorId)) reasons.push('Created by a friend');
            const planSlashes = plan.slashes ? JSON.parse(plan.slashes) : [];
            if (planSlashes.some((s: string) => slashPrefs[s] > 0)) reasons.push('Matches your interests');
            if (reasons.length === 0) reasons.push('Popular event');

            context[plan.id] = { score: Math.round(score * 10) / 10, reasons };
        }

        return NextResponse.json({
            events: formatEvents(scored.slice(0, limit).map(s => s.plan), context)
        });

    } catch (error: any) {
        console.error("Reco Events Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

function formatEvents(plans: any[], context: Record<string, any>) {
    return plans.map(plan => {
        let mediaUrls: string[] = [];
        try {
            mediaUrls = plan.mediaUrls ? JSON.parse(plan.mediaUrls) : [];
        } catch { }

        return {
            id: plan.id,
            title: plan.title,
            description: plan.description,
            date: plan.date,
            location: plan.location,
            locationLink: plan.locationLink,
            type: plan.type,
            visibility: plan.visibility,
            status: plan.status,
            maxSize: plan.maxSize,
            memberCount: plan._count?.members || 0,
            creator: plan.creator,
            mediaUrls,
            slashes: plan.slashes ? JSON.parse(plan.slashes) : [],
            recoScore: context[plan.id]?.score,
            recoReasons: context[plan.id]?.reasons,
        };
    });
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    // Haversine formula for distance in km
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function matchVibeTime(vibeTime: string, hour: number): number {
    const morning = hour >= 6 && hour < 12;
    const afternoon = hour >= 12 && hour < 17;
    const evening = hour >= 17 && hour < 21;
    const night = hour >= 21 || hour < 6;

    const vibe = vibeTime.toLowerCase();
    if (vibe.includes('morning') && morning) return 1;
    if (vibe.includes('afternoon') && afternoon) return 1;
    if (vibe.includes('evening') && evening) return 1;
    if (vibe.includes('night') && night) return 1;
    return 0;
}
