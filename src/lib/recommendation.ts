/**
 * FUY Recommendation Brain - Core Scoring Library
 * Unified scoring system for posts, people, events, products
 */

import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Interaction score weights
export const SCORE_WEIGHTS = {
    W: 2.0,
    LIKE: 3.0,
    SHARE: 1.5,
    COMMENT: 1.0,
    SAVE: 1.2,
    RSVP: 1.5,
    PURCHASE: 3.0,
    VIEW: 0.2, // normal impression
    LONG_VIEW: 0.8,
    FULL_WATCH: 2.0,
    PROFILE_VISIT: 4.0,
    FOLLOW: 6.0,
    QUICK_SCROLL: -2.0,
    L: -1.0,
    DISLIKE: -4.0,
    CAP: -3.0,
    HIDE: -2.0,
    NO_SHOW: -0.5,
};

// Profile tag categories
type ProfileTags = {
    values: string[];
    skills: string[];
    genres: string[];
    topics: string[];
    currentlyInto: string[];
    hardNos: string[];
};

/**
 * Extract profile tags from user profile for matching
 */
export async function extractProfileTags(userId: string): Promise<ProfileTags> {
    const profile = await prisma.profile.findUnique({
        where: { userId },
        select: {
            values: true,
            skills: true,
            topGenres: true,
            interactionTopics: true,
            currentlyInto: true,
            hardNos: true,
        }
    });

    if (!profile) {
        return { values: [], skills: [], genres: [], topics: [], currentlyInto: [], hardNos: [] };
    }

    return {
        values: profile.values || [],
        skills: profile.skills || [],
        genres: profile.topGenres || [],
        topics: profile.interactionTopics || [],
        currentlyInto: profile.currentlyInto || [],
        hardNos: profile.hardNos || [],
    };
}

/**
 * Get user's slash preferences based on interactions
 */
export async function getUserSlashPreferences(userId: string): Promise<Record<string, number>> {
    const interactions = await prisma.slashInteraction.findMany({
        where: { userId },
        orderBy: { score: 'desc' },
        take: 50,
    });

    const prefs: Record<string, number> = {};
    for (const i of interactions) {
        prefs[i.slashTag] = i.score;
    }
    return prefs;
}

/**
 * Update slash interaction score based on user action
 */
export async function updateSlashInteraction(
    userId: string,
    slashTags: string[],
    action: keyof typeof SCORE_WEIGHTS
): Promise<void> {
    const scoreChange = SCORE_WEIGHTS[action] || 0;
    const isPositive = scoreChange > 0;
    const isView = action === 'VIEW' || action === 'LONG_VIEW' || action === 'FULL_WATCH';

    for (const tag of slashTags) {
        await prisma.slashInteraction.upsert({
            where: { userId_slashTag: { userId, slashTag: tag } },
            create: {
                userId,
                slashTag: tag,
                score: scoreChange,
                positive: isPositive && !isView ? 1 : 0,
                negative: !isPositive && !isView ? 1 : 0,
                views: isView ? 1 : 0,
                fullWatches: action === 'FULL_WATCH' ? 1 : 0,
                quickScrolls: action === 'QUICK_SCROLL' ? 1 : 0,
            },
            update: {
                score: { increment: scoreChange },
                positive: isPositive && !isView ? { increment: 1 } : undefined,
                negative: !isPositive && !isView ? { increment: 1 } : undefined,
                views: isView ? { increment: 1 } : undefined,
                fullWatches: action === 'FULL_WATCH' ? { increment: 1 } : undefined,
                quickScrolls: action === 'QUICK_SCROLL' ? { increment: 1 } : undefined,
            }
        });
    }
}

/**
 * Log recommendation feedback for learning
 */
export async function logRecoFeedback(
    userId: string,
    contentId: string,
    contentType: 'POST' | 'EVENT' | 'PRODUCT' | 'USER',
    action: string,
    slashes?: string[],
    source?: string
): Promise<void> {
    const score = SCORE_WEIGHTS[action as keyof typeof SCORE_WEIGHTS] || 0;

    await prisma.recoFeedback.create({
        data: {
            userId,
            contentId,
            contentType,
            action,
            score,
            slashes: slashes ? JSON.stringify(slashes) : null,
            source,
        }
    });

    // Also update slash interactions
    if (slashes && slashes.length > 0) {
        await updateSlashInteraction(userId, slashes, action as keyof typeof SCORE_WEIGHTS);
    }
}

/**
 * Calculate content trust score based on user historical metrics
 */
export function calculateUserTrustScore(cappedCount: number, totalImpressions: number): number {
    // If a user has barely any impressions, default trust
    if (totalImpressions < 100) return 0.5;

    const cappedRatio = cappedCount / totalImpressions;

    // Thresholds: if capped ratio exceeds 5%, trust drops significantly
    if (cappedRatio > 0.05) {
        return Math.max(0.1, 1.0 - (cappedRatio * 10));
    }

    // Otherwise, high trust
    return Math.min(1.0, 0.5 + (0.05 - cappedRatio) * 10);
}

/**
 * Calculate tag overlap score between two sets
 */
export function calculateTagOverlap(tags1: string[], tags2: string[]): number {
    if (tags1.length === 0 || tags2.length === 0) return 0;

    const set1 = new Set(tags1.map(t => t.toLowerCase()));
    const set2 = new Set(tags2.map(t => t.toLowerCase()));

    let overlap = 0;
    for (const tag of set1) {
        if (set2.has(tag)) overlap++;
    }

    // Jaccard similarity
    const union = new Set([...set1, ...set2]).size;
    return union > 0 ? overlap / union : 0;
}

/**
 * Check if content conflicts with user's Hard Nos
 */
export function hasHardNoConflict(contentTags: string[], hardNos: string[]): boolean {
    if (hardNos.length === 0) return false;

    const contentSet = new Set(contentTags.map(t => t.toLowerCase()));
    for (const no of hardNos) {
        if (contentSet.has(no.toLowerCase())) return true;
    }
    return false;
}

/**
 * Calculate post specific engagement rate
 */
export function calculatePostEngagementScore(likes: number, comments: number, views: number): number {
    if (views === 0) return 0.5; // New posts get a baseline

    const engagementRatio = (likes * 1.5 + comments * 2.0) / views;
    return Math.min(1.0, engagementRatio * 5); // Scale up small ratios
}

/**
 * Deterministic PRNG for generating user-session specific randomness
 * ensuring no two users have the exact same feed even with identical interests.
 */
export function getDeterministicRandom(userId: string, postId: string, timeHash: string): number {
    const hash = crypto.createHash('sha256').update(`${userId}-${postId}-${timeHash}`).digest('hex');
    // Convert first 8 chars of hex to a number between 0 and 1
    return parseInt(hash.substring(0, 8), 16) / 0xffffffff;
}

/**
 * Core Mathematical Distribution Engine
 */
export async function calculateDistributionScore(
    userId: string,
    post: { id: string, userId: string, createdAt: Date, viewCount: number, likes: number, comments: number, creatorTrustScore: number },
    contentSlashes: string[],
    slashPrefs: Record<string, number>,
    userTagsForOverlap: string[],
    timeHash: string, // Used to rotate the random injections per session/hour
    explorationMultiplier: number = 1.0
): Promise<number> {

    // 1. Base Interest Alignment (Ledger)
    let interestScore = 0;
    for (const slash of contentSlashes) {
        interestScore += (slashPrefs[slash] || 0);
    }

    // Tag overlap bonus
    const overlapScore = calculateTagOverlap(userTagsForOverlap, contentSlashes);
    interestScore += overlapScore * 5;

    // 2. Creator Trust Score (from historical capped ratio)
    const trustMultiplier = post.creatorTrustScore; // 0.1 to 1.0

    // 3. Post Engagement Context
    const engagementScore = calculatePostEngagementScore(post.likes, post.comments, post.viewCount);

    // 4. Freshness (Time Decay)
    const ageInHours = (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);
    const timeDecay = Math.max(0.1, 1.0 / (1.0 + ageInHours * 0.1)); // Slow decay

    // 5. Uniqueness & Exploration Factor
    // Ensure uniqueness by adding a user-post-time specific deterministic random value
    const uniqueNoise = getDeterministicRandom(userId, post.id, timeHash) * 2.0;

    const explorationBoost = uniqueNoise * explorationMultiplier * (1.0 - trustMultiplier * 0.5); // Boost new/untrusted slightly to test them

    // Final Distribution Calculation
    // (Interest + Engagement) * Trust * Freshness + Exploration

    const finalScore = ((interestScore * 0.6) + (engagementScore * 10 * 0.4)) * trustMultiplier * timeDecay + explorationBoost;

    // Social boost: check if friends liked this (simplified)
    if (post.userId && post.userId !== userId) {
        const friendship = await prisma.friendship.findFirst({
            where: {
                OR: [
                    { userId, friendId: post.userId, status: 'ACCEPTED' },
                    { userId: post.userId, friendId: userId, status: 'ACCEPTED' },
                ]
            }
        });
        if (friendship) {
            return finalScore + 5; // Friend content strong boost
        }
    }

    return finalScore;
}

/**
 * Get recommended content for user's feed
 */
export async function getRecommendedPosts(
    userId: string,
    limit: number = 20,
    offset: number = 0
): Promise<string[]> {
    // Get user's top slashes
    const topSlashes = await prisma.slashInteraction.findMany({
        where: { userId, score: { gt: 0 } },
        orderBy: { score: 'desc' },
        take: 20,
        select: { slashTag: true }
    });

    const slashTags = topSlashes.map((s: { slashTag: string }) => s.slashTag);

    // Get candidate posts
    const candidates = await prisma.post.findMany({
        where: {
            OR: [
                { slashes: { some: { tag: { in: slashTags } } } },
                { visibility: 'PUBLIC' },
            ],
            userId: { not: userId },
            moderationStatus: 'CLEAN',
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
            id: true,
            userId: true,
            slashes: { select: { tag: true } },
        }
    });

    const profileTags = await extractProfileTags(userId);

    // Build user tags for overlap
    const userTags = [
        ...profileTags.values,
        ...profileTags.skills,
        ...profileTags.genres,
        ...profileTags.topics,
        ...profileTags.currentlyInto,
    ];

    const timeHash = Math.floor(Date.now() / (1000 * 60 * 60)).toString(); // Rotate uniqueness every hour

    const slashPrefs = await getUserSlashPreferences(userId);

    // Score each candidate
    const scored: { id: string; score: number }[] = [];
    for (const post of candidates as any[]) {
        const postSlashes = post.slashes.map((s: { tag: string }) => s.tag);

        // Ensure properties exist for distribution score model
        const distributionInput = {
            id: post.id,
            userId: post.userId,
            createdAt: post.createdAt || new Date(),
            viewCount: post.viewCount || 0,
            likes: post._count?.likes || 0,
            comments: post._count?.comments || 0,
            creatorTrustScore: post.user?.trustScore ?? 0.5
        };

        const score = await calculateDistributionScore(
            userId,
            distributionInput,
            postSlashes,
            slashPrefs,
            userTags,
            timeHash,
            1.0 // Default exploration for standard reco
        );
        scored.push({ id: post.id, score });
    }

    // Sort by score and return IDs
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(offset, offset + limit).map(s => s.id);
}

/**
 * Get recommended users to follow/connect
 */
export async function getRecommendedUsers(
    userId: string,
    limit: number = 10
): Promise<string[]> {
    // Get current user's profile tags
    const profileTags = await extractProfileTags(userId);
    const allTags = [
        ...profileTags.values,
        ...profileTags.skills,
        ...profileTags.genres,
        ...profileTags.currentlyInto,
    ];

    // Get user's friends to exclude
    const friendships = await prisma.friendship.findMany({
        where: {
            OR: [{ userId }, { friendId: userId }],
            status: 'ACCEPTED'
        },
        select: { userId: true, friendId: true }
    });
    const friendIds = new Set(friendships.flatMap((f: { userId: string; friendId: string }) => [f.userId, f.friendId]));
    friendIds.add(userId);

    // Find users with matching tags
    const candidates = await prisma.profile.findMany({
        where: {
            userId: { notIn: Array.from(friendIds) },
            OR: [
                { values: { hasSome: allTags } },
                { skills: { hasSome: allTags } },
                { topGenres: { hasSome: allTags } },
                { currentlyInto: { hasSome: allTags } },
            ]
        },
        take: 50,
        select: {
            userId: true,
            values: true,
            skills: true,
            topGenres: true,
            currentlyInto: true,
            city: true,
        }
    });

    // Score each candidate
    const scored: { userId: string; score: number }[] = [];
    for (const candidate of candidates) {
        const candidateTags = [
            ...(candidate.values || []),
            ...(candidate.skills || []),
            ...(candidate.topGenres || []),
            ...(candidate.currentlyInto || []),
        ];
        const overlap = calculateTagOverlap(allTags, candidateTags);
        scored.push({ userId: candidate.userId, score: overlap });
    }

    // Sort and return
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.userId);
}

/**
 * Get recommended products for user
 */
export async function getRecommendedProducts(
    userId: string,
    limit: number = 10
): Promise<string[]> {
    // Get user's shopping interests and current interests
    const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { shoppingInterests: true, currentlyInto: true }
    });

    const interests: string[] = [
        ...(profile?.shoppingInterests || []),
        ...(profile?.currentlyInto || []),
    ];

    // Get products - simplified query to avoid type issues
    const products = await prisma.product.findMany({
        where: { status: 'ACTIVE' },
        take: limit * 3,
        select: { id: true, tags: true }
    });

    if (interests.length === 0) {
        // No interests = return first N products
        return products.slice(0, limit).map((p) => p.id);
    }

    // Score by tag overlap
    type ScoredProduct = { id: string; score: number };
    const scored: ScoredProduct[] = products.map((p) => {
        const productTags: string[] = Array.isArray(p.tags) ? p.tags : [];
        return {
            id: p.id,
            score: calculateTagOverlap(interests, productTags)
        };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.id);
}

