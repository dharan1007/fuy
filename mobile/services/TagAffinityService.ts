/**
 * TagAffinityService
 * 
 * Manages per-user tag affinity scores for the recommendation engine.
 * Tags are scored based on user interactions — likes, views, watches, etc.
 * Scores decay over time via the decay_tag_affinity() Postgres function.
 */

import { supabase } from '../lib/supabase';

// In-memory session cache for top affinity tags
let cachedTopTags: { tag: string; score: number }[] | null = null;
let cachedUserId: string | null = null;

export interface TagAffinity {
    tag: string;
    score: number;
    interactionCount: number;
}

export const TagAffinityService = {
    /**
     * Update tag affinity scores for a user after an interaction.
     * Batches all tag updates into a single upsert call.
     */
    async updateTagAffinity(userId: string, postTags: string[], interactionWeight: number): Promise<void> {
        if (!userId || !postTags || postTags.length === 0) return;

        try {
            const rows = postTags.map(tag => ({
                userId,
                tag,
                score: interactionWeight,
                interactionCount: 1,
                lastUpdated: new Date().toISOString(),
            }));

            // Upsert: on conflict increment score and interactionCount
            // Supabase upsert will replace, so we need to use RPC for increment
            // Using individual upserts with raw SQL via RPC for proper incrementing
            for (const row of rows) {
                await supabase.rpc('upsert_tag_affinity', {
                    p_user_id: row.userId,
                    p_tag: row.tag,
                    p_score_delta: interactionWeight,
                });
            }

            // Invalidate session cache after update
            if (cachedUserId === userId) {
                cachedTopTags = null;
            }
        } catch (error) {
            console.warn('[TagAffinity] Failed to update:', error);
        }
    },

    /**
     * Apply recency decay to all tag scores for a user.
     * Called once per app session start. Multiplies all scores by 0.95.
     * Only runs if lastUpdated is more than 23 hours ago.
     */
    async applyAffinityDecay(userId: string): Promise<void> {
        if (!userId) return;

        try {
            // Check if decay is needed (any row older than 23 hours)
            const { data: staleRows } = await supabase
                .from('user_tag_affinity')
                .select('id')
                .eq('userId', userId)
                .lt('lastUpdated', new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString())
                .limit(1);

            if (!staleRows || staleRows.length === 0) {
                console.log('[TagAffinity] No decay needed (all recent)');
                return;
            }

            await supabase.rpc('decay_tag_affinity', { p_user_id: userId });
            console.log('[TagAffinity] Decay applied for user');

            // Invalidate cache
            if (cachedUserId === userId) {
                cachedTopTags = null;
            }
        } catch (error) {
            console.warn('[TagAffinity] Decay failed:', error);
        }
    },

    /**
     * Get the user's top affinity tags sorted by score descending.
     * Cached in memory for the session — only re-fetches on session start.
     */
    async getTopAffinityTags(userId: string, limit: number = 10): Promise<{ tag: string; score: number }[]> {
        if (!userId) return [];

        // Return cached if available for same user
        if (cachedTopTags && cachedUserId === userId) {
            return cachedTopTags;
        }

        try {
            const { data, error } = await supabase
                .from('user_tag_affinity')
                .select('tag, score')
                .eq('userId', userId)
                .order('score', { ascending: false })
                .limit(limit);

            if (error) throw error;

            cachedTopTags = data || [];
            cachedUserId = userId;
            return cachedTopTags;
        } catch (error) {
            console.warn('[TagAffinity] Failed to fetch top tags:', error);
            return [];
        }
    },

    /**
     * Get total interaction count for the user (sum of all rows).
     * Used for cold start phase detection.
     */
    async getTotalInteractionCount(userId: string): Promise<number> {
        if (!userId) return 0;

        try {
            const { data, error } = await supabase
                .from('user_tag_affinity')
                .select('interactionCount')
                .eq('userId', userId);

            if (error) throw error;
            return (data || []).reduce((sum: number, row: any) => sum + (row.interactionCount || 0), 0);
        } catch (error) {
            console.warn('[TagAffinity] Failed to get interaction count:', error);
            return 0;
        }
    },

    /**
     * Re-rank posts by multiplying each post's base score by the sum of
     * the user's affinity scores for each of its tags.
     * If a post has no tags or user has no affinity data, score = 1.0.
     */
    rankPostsByAffinity(
        posts: any[],
        userAffinities: { tag: string; score: number }[]
    ): any[] {
        if (!userAffinities || userAffinities.length === 0) return posts;

        const affinityMap = new Map<string, number>();
        for (const a of userAffinities) {
            affinityMap.set(a.tag, a.score);
        }

        const scored = posts.map(post => {
            const postTags: string[] = post.slashTags || post.tags || [];
            if (postTags.length === 0) {
                return { ...post, _affinityScore: 1.0 };
            }

            let totalAffinity = 0;
            let matchedTags = 0;
            for (const tag of postTags) {
                const score = affinityMap.get(tag);
                if (score !== undefined) {
                    totalAffinity += score;
                    matchedTags++;
                }
            }

            // If no matched tags, keep original order
            const affinityScore = matchedTags > 0 ? 1.0 + totalAffinity : 1.0;
            return { ...post, _affinityScore: Math.max(0.1, affinityScore) };
        });

        // Sort by affinity score descending, stable sort
        scored.sort((a, b) => b._affinityScore - a._affinityScore);
        return scored;
    },

    /**
     * Clear the session cache (call on logout or session change)
     */
    clearCache(): void {
        cachedTopTags = null;
        cachedUserId = null;
    },
};
