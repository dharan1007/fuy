/**
 * ExploreService — Explore Feed, Dots Feed, Recommendation, and Discovery
 *
 * MIGRATION SQL: See prisma/migrations/explore_overhaul.sql for all
 * database structures required by this service.
 *
 * ADDITIONAL RPC FUNCTION (add to explore_overhaul.sql if not present):
 *
 * CREATE OR REPLACE FUNCTION upsert_tag_affinity(
 *   p_user_id TEXT, p_tag TEXT, p_score_delta FLOAT
 * ) RETURNS VOID AS $$
 * BEGIN
 *   INSERT INTO "user_tag_affinity" ("userId", "tag", "score", "interactionCount", "lastUpdated")
 *   VALUES (p_user_id, p_tag, p_score_delta, 1, NOW())
 *   ON CONFLICT ("userId", "tag") DO UPDATE SET
 *     "score" = "user_tag_affinity"."score" + p_score_delta,
 *     "interactionCount" = "user_tag_affinity"."interactionCount" + 1,
 *     "lastUpdated" = NOW();
 * END;
 * $$ LANGUAGE plpgsql;
 */

import { supabase } from '../lib/supabase';
import { TagAffinityService } from './TagAffinityService';

export interface FeedPost {
    id: string;
    postType: string;
    content: string;
    createdAt: string;
    slashTags: string[];
    user: {
        id: string;
        name: string;
        trustScore: number;
        profile?: {
            displayName: string;
            avatarUrl: string;
        };
    };
    media: {
        type: string;
        url: string;
        thumbnailUrl?: string;
        thumbnailBlurHash?: string;
    }[];
    score: number;
    audioInfo?: {
        audioAssetId: string;
        audioTitle?: string;
        audioCreatorName?: string;
        isOriginalAudio?: boolean;
    };
    isWildcard?: boolean;
}

export type ExploreMode = 'foryou' | 'fresh' | 'nearby' | 'following';

// Interaction signal weights
export const INTERACTION_WEIGHTS: Record<string, number> = {
    'LIKE': 1.0,
    'W': 1.0,
    'FULL_WATCH': 0.8,
    'VIDEO_COMPLETE': 0.9,
    'RETURN_VIEW': 0.8,
    'LONG_VIEW': 0.5,
    'PROFILE_TAP': 0.6,
    'PROFILE_VISIT': 0.8,
    'VIDEO_75': 0.6,
    'SCROLL_DEPTH_100': 0.6,
    'SAVE': 0.5,
    'SCROLL_DEPTH_75': 0.4,
    'VIDEO_25': 0.2,
    'LONG_PRESS_PEEK': 0.2,
    'SCROLL_DEPTH_25': 0.15,
    'VIEW': 0.1,
    'QUICK_SCROLL': -0.1,
    'DISLIKE': -1.0,
    'L': -1.0,
    'CAP': -1.5,
};

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.fuymedia.org';

export const ExploreService = {
    /**
     * Fetch Explore Feed using materialized view with affinity ranking.
     * Falls back to direct Post query if the view doesn't exist yet.
     */
    async getExploreFeed(
        limit: number = 20,
        offset: number = 0,
        mode: ExploreMode = 'foryou',
        selectedTag?: string
    ): Promise<FeedPost[]> {
        const { data: session } = await supabase.auth.getSession();
        const userId = session.session?.user?.id;

        const isInitialLoad = offset === 0;
        const fetchSize = isInitialLoad ? Math.max(limit * 5, 100) : limit;
        const from = isInitialLoad ? 0 : offset;
        const to = from + fetchSize - 1;

        try {
            let data: any[] | null = null;
            let error: any = null;

            // Try materialized view first
            let query = supabase
                .from('explore_feed_view')
                .select('*');

            // Mode-specific filters
            if (mode === 'following' && userId) {
                // Get followed user IDs first
                const { data: subs } = await supabase
                    .from('Subscription')
                    .select('subscribedToId')
                    .eq('subscriberId', userId);

                const followedIds = (subs || []).map((s: any) => s.subscribedToId);
                if (followedIds.length > 0) {
                    query = query.in('user_id', followedIds);
                } else {
                    return []; // Following no one
                }
            }

            if (mode === 'nearby' && userId) {
                // Get users within 10km from user_locations
                const { data: nearbyUsers } = await supabase.rpc('get_nearby_users', {
                    p_user_id: userId,
                    p_radius_meters: 10000,
                });
                const nearbyIds = (nearbyUsers || []).map((u: any) => u.userId);
                if (nearbyIds.length > 0) {
                    query = query.in('user_id', nearbyIds);
                } else {
                    return [];
                }
            }

            // Tag filter
            if (selectedTag) {
                query = query.contains('tags', [selectedTag]);
            }

            // Exclude own posts
            if (userId) {
                query = query.neq('user_id', userId);
            }

            // Sorting
            if (mode === 'fresh' || mode === 'following') {
                query = query.order('created_at', { ascending: false });
            } else {
                query = query.order('created_at', { ascending: false });
            }

            const response = await query.range(from, to);
            data = response.data;
            error = response.error;

            // Fallback to direct Post query if view doesn't exist
            if (error && error.message?.includes('does not exist')) {
                console.warn('[Explore] Materialized view not found, falling back to direct query');
                return this.getHomeFeed(limit, offset);
            }

            if (error) {
                console.error('[Explore] Feed error:', error);
                return this.getHomeFeed(limit, offset);
            }

            // Transform view rows to FeedPost format
            let posts: FeedPost[] = (data || []).map((row: any) => ({
                id: row.id,
                postType: row.post_type || 'STANDARD',
                content: row.content || '',
                createdAt: row.created_at,
                slashTags: row.tags || [],
                user: {
                    id: row.user_id,
                    name: row.username || '',
                    trustScore: 0.5,
                    profile: {
                        displayName: row.display_name || row.username || '',
                        avatarUrl: row.avatar_url || '',
                    },
                },
                media: row.media_url ? [{
                    type: row.media_type || 'IMAGE',
                    url: row.media_url,
                    thumbnailUrl: row.thumbnail_url,
                    thumbnailBlurHash: row.thumbnail_blur_hash,
                }] : [],
                score: 1.0,
                isWildcard: false,
            }));

            // Shuffle on initial load for "For You" and not for "Fresh"/"Following"
            if (isInitialLoad && mode === 'foryou' && posts.length > limit) {
                // Fisher-Yates shuffle
                for (let i = posts.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [posts[i], posts[j]] = [posts[j], posts[i]];
                }
            }

            // Apply affinity ranking for "For You" mode
            if (mode === 'foryou' && userId && isInitialLoad) {
                posts = await this._applyRecommendationPipeline(posts, userId, limit);
            } else if (isInitialLoad && posts.length > limit) {
                posts = posts.slice(0, limit);
            }

            return posts;
        } catch (e) {
            console.error('[Explore] Unexpected error:', e);
            return this.getHomeFeed(limit, offset);
        }
    },

    /**
     * Internal: Full recommendation pipeline — cold start, affinity, diversity
     */
    async _applyRecommendationPipeline(
        posts: FeedPost[],
        userId: string,
        limit: number
    ): Promise<FeedPost[]> {
        const totalInteractions = await TagAffinityService.getTotalInteractionCount(userId);
        const affinityTags = await TagAffinityService.getTopAffinityTags(userId);

        let ranked: FeedPost[];

        if (totalInteractions < 20) {
            // Phase 1: Cold start — sort by like_count, use profile interests if available
            const { data: profile } = await supabase
                .from('Profile')
                .select('currentlyInto, tags')
                .eq('userId', userId)
                .maybeSingle();

            const interestTags: string[] = [
                ...(profile?.currentlyInto || []),
                ...(profile?.tags ? [profile.tags] : []),
            ].filter(Boolean);

            if (interestTags.length > 0) {
                // Filter to posts whose tags intersect with user interests
                const interestPosts = posts.filter(p =>
                    (p.slashTags || []).some(tag => interestTags.includes(tag))
                );
                const otherPosts = posts.filter(p =>
                    !(p.slashTags || []).some(tag => interestTags.includes(tag))
                );
                ranked = [...interestPosts, ...otherPosts];
            } else {
                ranked = posts; // Keep shuffle order
            }
        } else if (totalInteractions < 100) {
            // Phase 2: Blend — 60% personalised, 40% trending
            const personalised = TagAffinityService.rankPostsByAffinity(posts, affinityTags);
            const trending = [...posts].sort((a, b) => (b.score || 0) - (a.score || 0));

            const pCount = Math.ceil(limit * 0.6);
            const tCount = limit - pCount;
            const pSlice = personalised.slice(0, pCount);
            const tSlice = trending
                .filter(p => !pSlice.find(pp => pp.id === p.id))
                .slice(0, tCount);

            // Interleave in 3:2 pattern
            ranked = [];
            let pi = 0, ti = 0;
            while (ranked.length < limit && (pi < pSlice.length || ti < tSlice.length)) {
                // 3 personalised
                for (let k = 0; k < 3 && pi < pSlice.length; k++) {
                    ranked.push(pSlice[pi++]);
                }
                // 2 trending
                for (let k = 0; k < 2 && ti < tSlice.length; k++) {
                    ranked.push(tSlice[ti++]);
                }
            }
        } else {
            // Phase 3: Full affinity ranking
            ranked = TagAffinityService.rankPostsByAffinity(posts, affinityTags);
        }

        // Diversity injection: every 8th post becomes a wildcard
        ranked = this._injectDiversity(ranked, affinityTags, posts);

        return ranked.slice(0, limit);
    },

    /**
     * Diversity injection: replace every 8th post with a wildcard from unseen tags
     */
    _injectDiversity(
        ranked: FeedPost[],
        affinityTags: { tag: string; score: number }[],
        allPosts: FeedPost[]
    ): FeedPost[] {
        const seenTags = new Set(affinityTags.map(a => a.tag));

        // Find wildcard candidates: posts with tags the user has never interacted with
        const wildcardCandidates = allPosts.filter(p =>
            (p.slashTags || []).some(tag => !seenTags.has(tag))
        );

        if (wildcardCandidates.length === 0) return ranked;

        // Take top 20% by engagement and pick randomly
        const topCount = Math.max(1, Math.ceil(wildcardCandidates.length * 0.2));
        const topWildcards = wildcardCandidates.slice(0, topCount);

        const result = [...ranked];
        for (let i = 7; i < result.length; i += 8) {
            if (topWildcards.length === 0) break;
            const randomIdx = Math.floor(Math.random() * topWildcards.length);
            const wildcard = { ...topWildcards[randomIdx], isWildcard: true };
            // Only replace if not already in the result
            if (!result.find(p => p.id === wildcard.id)) {
                result[i] = wildcard;
            }
        }

        return result;
    },

    /**
     * Fetch Home Feed with offset pagination (Direct Supabase)
     * On initial load (offset=0), fetches a larger pool and shuffles for variety.
     * On subsequent pages (offset>0), uses deterministic pagination.
     */
    async getHomeFeed(limit: number = 20, offset: number = 0): Promise<FeedPost[]> {
        const { data: session } = await supabase.auth.getSession();
        const userId = session.session?.user?.id;

        // For initial load / refresh, fetch a bigger pool and shuffle
        const isInitialLoad = offset === 0;
        const fetchSize = isInitialLoad ? Math.max(limit * 5, 100) : limit;
        const from = isInitialLoad ? 0 : offset;
        const to = from + fetchSize - 1;

        const { data, error } = await supabase
            .from('Post')
            .select(`
                id, postType, content, createdAt,
                user:User!userId (
                    id, name, trustScore,
                    profile:Profile (
                        displayName, avatarUrl
                    )
                ),
                postMedia:PostMedia(
                    media:Media(type, url, thumbnailUrl, thumbnailBlurHash)
                ),
                topBubbles:ReactionBubble(id, mediaUrl, mediaType),
                slashes:Slash(tag),
                likes:PostLike(count),
                comments:PostComment(count),
                audioUsages:AudioUsage(
                    audioAsset:AudioAsset(
                        id, title, isOriginal, originalCreator:originalCreatorId(id, name, profile:Profile(displayName))
                    )
                )
            `)
            .eq('status', 'PUBLISHED')
            .eq('visibility', 'PUBLIC')
            .neq('userId', userId || '')
            .order('createdAt', { ascending: false })
            .range(from, to);

        if (error) {
            console.error("Supabase Home Feed Error:", error);
            throw error;
        }

        let posts = (data || []).map((post: any) => {
            let audioInfo;
            if (post.audioUsages && post.audioUsages.length > 0) {
                const asset = post.audioUsages[0].audioAsset;
                if (asset) {
                    const creator = asset.originalCreator;
                    const cProfile = Array.isArray(creator?.profile) ? creator?.profile[0] : creator?.profile;
                    const creatorName = cProfile?.displayName || creator?.name || 'Unknown';
                    audioInfo = {
                        audioAssetId: asset.id,
                        audioTitle: asset.title || 'Original audio',
                        audioCreatorName: creatorName,
                        isOriginalAudio: asset.isOriginal
                    };
                }
            }

            // Extract media with blur hash
            const media = (post.postMedia || []).map((pm: any) => {
                const m = Array.isArray(pm.media) ? pm.media[0] : pm.media;
                if (!m) return null;
                return {
                    type: m.type || 'IMAGE',
                    url: m.url,
                    thumbnailUrl: m.thumbnailUrl,
                    thumbnailBlurHash: m.thumbnailBlurHash,
                };
            }).filter(Boolean);

            return {
                id: post.id,
                postType: post.postType,
                content: post.content,
                createdAt: post.createdAt,
                slashTags: post.slashes?.map((s: any) => s.tag) || [],
                user: {
                    id: post.user?.id,
                    name: post.user?.name,
                    trustScore: post.user?.trustScore || 0.5,
                    profile: Array.isArray(post.user?.profile) ? post.user.profile[0] : post.user?.profile
                },
                media,
                topBubbles: post.topBubbles || [],
                score: 1.0,
                audioInfo
            };
        });

        // Shuffle on initial load so each refresh gives a different order
        if (isInitialLoad && posts.length > limit) {
            // Fisher-Yates shuffle
            for (let i = posts.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [posts[i], posts[j]] = [posts[j], posts[i]];
            }
            posts = posts.slice(0, limit);
        }

        return posts;
    },

    /**
     * Fetch Dots Feed with offset pagination (Direct Supabase)
     */
    async getDotsFeed(category: string, limit: number = 20, offset: number = 0, userIds?: string[], tags?: string[]): Promise<FeedPost[]> {
        const typeMap: Record<string, string> = {
            fills: 'FILL',
            lills: 'LILL',
            shots: 'VIDEO',
            auds: 'AUD',
            bloom: 'LILL',
        };

        const postType = typeMap[category] || 'POST';
        const from = offset;
        const to = offset + limit - 1;

        // Build the base query
        let query = supabase
            .from('Post')
            .select(`
                    id, postType, content, createdAt,
                    user:User!userId (
                        id, name, trustScore,
                        profile:Profile(displayName, avatarUrl)
                    ),
                    postMedia:PostMedia(media:Media(type, url)),
                    slashes:Slash(tag),
                    audioUsages:AudioUsage(
                        audioAsset:AudioAsset(
                            id, title, isOriginal,
                            originalCreator:User!originalCreatorId(
                                id, name,
                                profile:Profile(displayName, avatarUrl)
                            )
                        )
                    )
                `)
            .eq('status', 'PUBLISHED')
            .eq('visibility', 'PUBLIC')
            .eq('postType', postType);

        // Apply bloom filters if provided
        if (userIds && userIds.length > 0) {
            query = query.in('userId', userIds);
        }
        if (tags && tags.length > 0) {
            query = query.in('slashes.tag', tags);
        }

        const { data, error } = await query
            .order('createdAt', { ascending: false })
            .range(from, to);

        if (error) throw error;

        return (data || []).map((post: any) => ({
            id: post.id,
            postType: post.postType,
            content: post.content,
            createdAt: post.createdAt,
            slashTags: post.slashes?.map((s: any) => s.tag) || [],
            user: {
                id: post.user?.id,
                name: post.user?.name,
                trustScore: post.user?.trustScore || 0.5,
                profile: Array.isArray(post.user?.profile) ? post.user.profile[0] : post.user?.profile
            },
            media: post.postMedia?.map((pm: any) => pm.media) || [],
            audioUsages: post.audioUsages || [],
            score: 1.0
        }));
    },

    /**
     * Fetch Similar Vibes (Direct Supabase)
     */
    async getSimilarVibes(sourceId: string, limit: number = 15): Promise<FeedPost[]> {
        return this.getHomeFeed(limit, 0);
    },

    /**
     * Get Trending Tags (calls Postgres function)
     */
    async getTrendingTags(): Promise<{ tag: string; velocity: number }[]> {
        try {
            const { data, error } = await supabase.rpc('get_trending_tags');
            if (error) {
                console.warn('[Explore] Trending tags error:', error);
                // Fallback: fetch popular slashes
                const { data: slashes } = await supabase
                    .from('Slash')
                    .select('tag')
                    .order('createdAt', { ascending: false })
                    .limit(8);
                return (slashes || []).map(s => ({ tag: s.tag, velocity: 0 }));
            }
            return data || [];
        } catch (e) {
            console.warn('[Explore] Trending tags exception:', e);
            return [];
        }
    },

    /**
     * Get Vibe Match Profiles — users with overlapping interests
     */
    async getVibeMatchProfiles(userId: string): Promise<any[]> {
        if (!userId) return [];

        try {
            // Get current user's interests
            const { data: myProfile } = await supabase
                .from('Profile')
                .select('currentlyInto, tags')
                .eq('userId', userId)
                .maybeSingle();

            if (!myProfile) return [];

            const myInterests: string[] = [
                ...(myProfile.currentlyInto || []),
                ...(myProfile.tags ? [myProfile.tags] : []),
            ].filter(Boolean);

            if (myInterests.length === 0) return [];

            // Get followed user IDs to exclude
            const { data: subs } = await supabase
                .from('Subscription')
                .select('subscribedToId')
                .eq('subscriberId', userId);
            const followedIds = new Set((subs || []).map((s: any) => s.subscribedToId));
            followedIds.add(userId);

            // Get profiles with overlapping interests
            const { data: candidates } = await supabase
                .from('Profile')
                .select('userId, displayName, avatarUrl, currentlyInto, tags')
                .limit(50);

            if (!candidates) return [];

            const matches = candidates
                .filter(c => !followedIds.has(c.userId))
                .map(c => {
                    const theirInterests: string[] = [
                        ...(c.currentlyInto || []),
                        ...(c.tags ? [c.tags] : []),
                    ].filter(Boolean);

                    const overlap = myInterests.filter(t => theirInterests.includes(t));
                    return { ...c, overlapCount: overlap.length, sharedTags: overlap.slice(0, 3) };
                })
                .filter(c => c.overlapCount >= 2)
                .sort((a, b) => b.overlapCount - a.overlapCount)
                .slice(0, 10);

            return matches;
        } catch (e) {
            console.warn('[Explore] Vibe match error:', e);
            return [];
        }
    },

    /**
     * Get Creator Peek Data for long-press preview
     */
    async getCreatorPeekData(creatorUserId: string): Promise<any> {
        try {
            const { data: profile } = await supabase
                .from('Profile')
                .select('userId, displayName, avatarUrl, currentlyInto')
                .eq('userId', creatorUserId)
                .maybeSingle();

            const { data: user } = await supabase
                .from('User')
                .select('name')
                .eq('id', creatorUserId)
                .maybeSingle();

            // Get last 3 public posts as stalk-me preview
            const { data: recentPosts } = await supabase
                .from('Post')
                .select('id, postMedia:PostMedia(media:Media(url, type))')
                .eq('userId', creatorUserId)
                .eq('visibility', 'PUBLIC')
                .eq('status', 'PUBLISHED')
                .order('createdAt', { ascending: false })
                .limit(3);

            const stalkMeMedia = (recentPosts || []).map((p: any) => {
                const pm = p.postMedia?.[0];
                const m = Array.isArray(pm?.media) ? pm.media[0] : pm?.media;
                return m ? { url: m.url, type: m.type } : null;
            }).filter(Boolean);

            return {
                displayName: profile?.displayName || user?.name || 'Unknown',
                username: user?.name || '',
                avatarUrl: profile?.avatarUrl || '',
                currentlyInto: (profile?.currentlyInto || []).join(', '),
                stalkMeMedia,
                userId: creatorUserId,
            };
        } catch (e) {
            console.warn('[Explore] Peek data error:', e);
            return null;
        }
    },

    /**
     * Save/Unsave a post (double-tap to bookmark)
     */
    async savePost(postId: string, userId: string): Promise<boolean> {
        try {
            // Check if already saved
            const { data: existing } = await supabase
                .from('Reaction')
                .select('id')
                .eq('postId', postId)
                .eq('userId', userId)
                .eq('type', 'SAVE')
                .maybeSingle();

            if (existing) {
                // Unsave
                await supabase.from('Reaction').delete().eq('id', existing.id);
                return false; // Unsaved
            } else {
                // Save
                await supabase.from('Reaction').insert({
                    postId,
                    userId,
                    type: 'SAVE',
                });
                return true; // Saved
            }
        } catch (e) {
            console.warn('[Explore] Save error:', e);
            return false;
        }
    },

    /**
     * TELEMETRY: Send Mathematical Algo Feedback (Direct Supabase)
     * Actions: 'W', 'LIKE', 'VIEW', 'LONG_VIEW', 'FULL_WATCH', 'PROFILE_VISIT',
     * 'QUICK_SCROLL', 'L', 'DISLIKE', 'CAP', 'RETURN_VIEW', 'SCROLL_DEPTH_25',
     * 'SCROLL_DEPTH_75', 'SCROLL_DEPTH_100', 'VIDEO_25', 'VIDEO_75',
     * 'VIDEO_COMPLETE', 'PROFILE_TAP', 'SAVE', 'LONG_PRESS_PEEK'
     */
    async logRecommendationFeedback(contentId: string, contentType: string, action: string, tags: string[] = []) {
        try {
            const { data: session } = await supabase.auth.getSession();
            const userId = session.session?.user?.id;
            if (!userId) return;

            const weight = INTERACTION_WEIGHTS[action] ?? 0.1;

            await supabase.from('RecoFeedback').insert({
                userId,
                contentId,
                contentType,
                action,
                score: weight,
                slashes: tags.length > 0 ? JSON.stringify(tags) : null,
                source: 'mobile_app_direct'
            });

            // Update tag affinity if tags are present and weight is positive
            if (tags.length > 0 && weight > 0) {
                TagAffinityService.updateTagAffinity(userId, tags, weight);
            }

        } catch (error) {
            console.warn('Failed to log interaction:', error);
        }
    }
};
