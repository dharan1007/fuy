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
    if (totalImpressions < 100) return 0.5;
    const cappedRatio = cappedCount / totalImpressions;
    if (cappedRatio > 0.05) {
        return Math.max(0.1, 1.0 - (cappedRatio * 10));
    }
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
    if (views === 0) return 0.5;
    const engagementRatio = (likes * 1.5 + comments * 2.0) / views;
    return Math.min(1.0, engagementRatio * 5);
}

/**
 * Deterministic PRNG for user-session specific randomness
 */
export function getDeterministicRandom(userId: string, postId: string, timeHash: string): number {
    const hash = crypto.createHash('sha256').update(`${userId}-${postId}-${timeHash}`).digest('hex');
    return parseInt(hash.substring(0, 8), 16) / 0xffffffff;
}

/**
 * Core Mathematical Distribution Engine (V1 - Legacy)
 */
export async function calculateDistributionScore(
    userId: string,
    post: { id: string, userId: string, createdAt: Date, viewCount: number, likes: number, comments: number, creatorTrustScore: number },
    contentSlashes: string[],
    slashPrefs: Record<string, number>,
    userTagsForOverlap: string[],
    timeHash: string,
    explorationMultiplier: number = 1.0
): Promise<number> {

    let interestScore = 0;
    for (const slash of contentSlashes) {
        interestScore += (slashPrefs[slash] || 0);
    }

    const overlapScore = calculateTagOverlap(userTagsForOverlap, contentSlashes);
    interestScore += overlapScore * 5;

    const trustMultiplier = post.creatorTrustScore;
    const engagementScore = calculatePostEngagementScore(post.likes, post.comments, post.viewCount);

    const ageInHours = (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);
    const timeDecay = Math.max(0.1, 1.0 / (1.0 + ageInHours * 0.1));

    const uniqueNoise = getDeterministicRandom(userId, post.id, timeHash) * 2.0;
    const explorationBoost = uniqueNoise * explorationMultiplier * (1.0 - trustMultiplier * 0.5);

    const finalScore = ((interestScore * 0.6) + (engagementScore * 10 * 0.4)) * trustMultiplier * timeDecay + explorationBoost;

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
            return finalScore + 5;
        }
    }

    return finalScore;
}

/**
 * Get recommended content for user's feed (V1 - Legacy)
 */
export async function getRecommendedPosts(
    userId: string,
    limit: number = 20,
    offset: number = 0
): Promise<string[]> {
    const topSlashes = await prisma.slashInteraction.findMany({
        where: { userId, score: { gt: 0 } },
        orderBy: { score: 'desc' },
        take: 20,
        select: { slashTag: true }
    });

    const slashTags = topSlashes.map((s: { slashTag: string }) => s.slashTag);

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
    const userTags = [
        ...profileTags.values,
        ...profileTags.skills,
        ...profileTags.genres,
        ...profileTags.topics,
        ...profileTags.currentlyInto,
    ];

    const timeHash = Math.floor(Date.now() / (1000 * 60 * 60)).toString();
    const slashPrefs = await getUserSlashPreferences(userId);

    const scored: { id: string; score: number }[] = [];
    for (const post of candidates as any[]) {
        const postSlashes = post.slashes.map((s: { tag: string }) => s.tag);
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
            userId, distributionInput, postSlashes, slashPrefs, userTags, timeHash, 1.0
        );
        scored.push({ id: post.id, score });
    }

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
    const profileTags = await extractProfileTags(userId);
    const allTags = [
        ...profileTags.values,
        ...profileTags.skills,
        ...profileTags.genres,
        ...profileTags.currentlyInto,
    ];

    const friendships = await prisma.friendship.findMany({
        where: {
            OR: [{ userId }, { friendId: userId }],
            status: 'ACCEPTED'
        },
        select: { userId: true, friendId: true }
    });
    const friendIds = new Set(friendships.flatMap((f: { userId: string; friendId: string }) => [f.userId, f.friendId]));
    friendIds.add(userId);

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
    const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { shoppingInterests: true, currentlyInto: true }
    });

    const interests: string[] = [
        ...(profile?.shoppingInterests || []),
        ...(profile?.currentlyInto || []),
    ];

    const products = await prisma.product.findMany({
        where: { status: 'ACTIVE' },
        take: limit * 3,
        select: { id: true, tags: true }
    });

    if (interests.length === 0) {
        return products.slice(0, limit).map((p) => p.id);
    }

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


// ============================================================
// V2 DETERMINISTIC RECOMMENDATION ENGINE
// Collaborative Filtering + Anti-Fatigue + Discovery Injection
// ============================================================

import { supabaseAdmin } from '@/lib/supabase-admin';
import type {
    CollaborativeCandidate,
    ScoredCandidate,
    FeedAction,
} from '@/lib/feed-types';

/** Log a FeedInteraction row for the new engine */
export async function logFeedInteraction(
    userId: string,
    postId: string,
    authorId: string,
    action: FeedAction,
    weightScore: number,
    watchDurationMs?: number
): Promise<void> {
    const { error } = await supabaseAdmin
        .from('FeedInteraction')
        .upsert(
            {
                userId,
                postId,
                authorId,
                action,
                weightScore,
                watchDurationMs: watchDurationMs ?? null,
                createdAt: new Date().toISOString(),
            },
            { onConflict: 'userId,postId,action' }
        );

    if (error) {
        console.error('[RecoV2] Failed to log FeedInteraction:', error);
    }
}

/**
 * Call the Supabase RPC for collaborative candidates.
 * Two-hop behavioral match: user's positives -> lookalike users -> their unseen favorites
 */
export async function getCollaborativeCandidates(
    userId: string
): Promise<ScoredCandidate[]> {
    const { data, error } = await supabaseAdmin.rpc(
        'get_collaborative_candidates',
        { target_user_id: userId }
    );

    if (error) {
        console.error('[RecoV2] Collaborative RPC error:', error);
        return [];
    }

    if (!data || !Array.isArray(data)) return [];

    return (data as CollaborativeCandidate[]).map((row) => ({
        postId: row.post_id,
        authorId: row.post_author_id,
        postType: row.post_type,
        content: row.post_content,
        createdAt: new Date(row.post_created_at),
        viewCount: row.post_view_count,
        authorName: row.author_name,
        authorAvatar: row.author_avatar,
        authorTrust: row.author_trust,
        slashTags: row.slash_tags || [],
        totalEngagement: row.total_engagement,
        source: 'collaborative' as const,
        gravityScore: 0,
        finalScore: 0,
    }));
}

/**
 * Fetch "Global High-Velocity" posts -- gaining the fastest
 * engagement globally in the last 3 hours, unrelated to user history.
 */
export async function getGlobalHighVelocityPosts(
    userId: string,
    limit: number = 20
): Promise<ScoredCandidate[]> {
    const { data, error } = await supabaseAdmin
        .from('FeedInteraction')
        .select('postId')
        .gt('weightScore', 0)
        .gte('createdAt', new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString());

    if (error || !data) {
        console.error('[RecoV2] High-velocity query error:', error);
        return [];
    }

    // Count engagement per postId
    const engagementMap = new Map<string, number>();
    for (const row of data) {
        engagementMap.set(row.postId, (engagementMap.get(row.postId) || 0) + 1);
    }

    // Sort by engagement count descending and take top N
    const topPostIds = [...engagementMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([postId]) => postId);

    if (topPostIds.length === 0) return [];

    // Fetch post details via Prisma
    const posts = await prisma.post.findMany({
        where: {
            id: { in: topPostIds },
            status: 'PUBLISHED',
            visibility: 'PUBLIC',
            moderationStatus: 'CLEAN',
            userId: { not: userId },
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    trustScore: true,
                    profile: { select: { displayName: true, avatarUrl: true } },
                },
            },
            slashes: { select: { tag: true } },
        },
    });

    return posts.map((p) => ({
        postId: p.id,
        authorId: p.userId,
        postType: p.postType,
        content: p.content,
        createdAt: p.createdAt,
        viewCount: p.viewCount,
        authorName: p.user?.profile?.displayName || p.user?.name || '',
        authorAvatar: p.user?.profile?.avatarUrl || '',
        authorTrust: p.user?.trustScore ?? 0.5,
        slashTags: p.slashes.map((s) => s.tag),
        totalEngagement: engagementMap.get(p.id) || 0,
        source: 'global_velocity' as const,
        gravityScore: 0,
        finalScore: 0,
    }));
}

/**
 * Gravity Math: Score = TotalEngagement / (AgeInHours + 2)^1.5
 */
function applyGravityScore(candidate: ScoredCandidate): number {
    const ageMs = Date.now() - candidate.createdAt.getTime();
    const ageInHours = Math.max(0, ageMs / (1000 * 60 * 60));
    const gravity = Math.pow(ageInHours + 2, 1.5);
    return candidate.totalEngagement / gravity;
}

/**
 * Build the final Home Feed with:
 *  1. Collaborative Candidates (Supabase RPC)
 *  2. Global High-Velocity posts
 *  3. Gravity scoring + 1.5x collaborative boost
 *  4. Author fatigue (max 2 per author, then 0.2x)
 *  5. Slash fatigue (3 in last 10 slots = 0.5x)
 *  6. Discovery injection (1 global post every 6th slot)
 */
export async function buildHomeFeed(
    userId: string,
    limit: number = 20
): Promise<{ posts: ScoredCandidate[]; meta: { collaborativeCount: number; globalVelocityCount: number; totalCandidatesScored: number } }> {

    // 1. Fetch both pools in parallel
    const [collaborativeCandidates, globalVelocityCandidates] = await Promise.all([
        getCollaborativeCandidates(userId),
        getGlobalHighVelocityPosts(userId, 20),
    ]);

    // 2. Merge and deduplicate by postId
    const seenIds = new Set<string>();
    const merged: ScoredCandidate[] = [];

    for (const c of collaborativeCandidates) {
        if (!seenIds.has(c.postId)) { seenIds.add(c.postId); merged.push(c); }
    }
    for (const g of globalVelocityCandidates) {
        if (!seenIds.has(g.postId)) { seenIds.add(g.postId); merged.push(g); }
    }

    // 3. Apply Gravity Scoring + Personalization Boost
    for (const candidate of merged) {
        candidate.gravityScore = applyGravityScore(candidate);
        let boosted = candidate.gravityScore;
        if (candidate.source === 'collaborative') {
            boosted *= 1.5;
        }
        candidate.finalScore = boosted;
    }

    // 4. Sort all candidates descending by finalScore
    merged.sort((a, b) => b.finalScore - a.finalScore);

    // 5. Separate pools for injection
    const globalPool = merged.filter((c) => c.source === 'global_velocity');
    const scoredPool = merged.filter((c) => c.source === 'collaborative');

    // 6. Anti-Fatigue Assembly
    const finalFeed: ScoredCandidate[] = [];
    const authorCounts = new Map<string, number>();
    let globalInjectIdx = 0;

    const getRecentSlashFreq = (tag: string, lastN: number): number => {
        const window = finalFeed.slice(-lastN);
        let count = 0;
        for (const item of window) {
            if (item.slashTags.includes(tag)) count++;
        }
        return count;
    };

    for (const candidate of scoredPool) {
        if (finalFeed.length >= limit) break;

        // Author Fatigue: max 2 posts per author
        const authorCount = authorCounts.get(candidate.authorId) || 0;
        if (authorCount >= 2) {
            candidate.finalScore *= 0.2;
        }

        // Slash Fatigue
        let slashPenalty = 1.0;
        for (const tag of candidate.slashTags) {
            if (getRecentSlashFreq(tag, 10) >= 3) {
                slashPenalty = Math.min(slashPenalty, 0.5);
            }
        }
        candidate.finalScore *= slashPenalty;

        // Discovery Injector: every 6th slot
        if ((finalFeed.length + 1) % 6 === 0 && globalInjectIdx < globalPool.length) {
            const injected = globalPool[globalInjectIdx];
            finalFeed.push(injected);
            authorCounts.set(injected.authorId, (authorCounts.get(injected.authorId) || 0) + 1);
            globalInjectIdx++;
            if (finalFeed.length >= limit) break;
        }

        finalFeed.push(candidate);
        authorCounts.set(candidate.authorId, authorCount + 1);
    }

    // Fill remaining slots with global velocity
    while (finalFeed.length < limit && globalInjectIdx < globalPool.length) {
        finalFeed.push(globalPool[globalInjectIdx]);
        globalInjectIdx++;
    }

    return {
        posts: finalFeed,
        meta: {
            collaborativeCount: collaborativeCandidates.length,
            globalVelocityCount: globalVelocityCandidates.length,
            totalCandidatesScored: merged.length,
        },
    };
}
