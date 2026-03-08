import { supabase } from '../lib/supabase';

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
    }[];
    score: number;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.fuymedia.org';

export const ExploreService = {
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
                    media:Media(type, url)
                ),
                topBubbles:ReactionBubble(id, mediaUrl, mediaType),
                slashes:Slash(tag),
                likes:PostLike(count),
                comments:PostComment(count)
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

        let posts = (data || []).map((post: any) => ({
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
            topBubbles: post.topBubbles || [],
            score: 1.0
        }));

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
     * Fetch Explore Feed with offset pagination (Direct Supabase)
     */
    async getExploreFeed(limit: number = 20, offset: number = 0): Promise<FeedPost[]> {
        return this.getHomeFeed(limit, offset);
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
                    slashes:Slash(tag)
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
     * TELEMETRY: Send Mathematical Algo Feedback (Direct Supabase)
     * Actions: 'W', 'LIKE', 'VIEW', 'LONG_VIEW', 'FULL_WATCH', 'PROFILE_VISIT', 'QUICK_SCROLL', 'L', 'DISLIKE', 'CAP'
     */
    async logRecommendationFeedback(contentId: string, contentType: string, action: string, tags: string[] = []) {
        try {
            const { data: session } = await supabase.auth.getSession();
            const userId = session.session?.user?.id;
            if (!userId) return;

            const weights: Record<string, number> = {
                'LIKE': 1.0, 'W': 1.0, 'FULL_WATCH': 0.8, 'LONG_VIEW': 0.5,
                'VIEW': 0.1, 'PROFILE_VISIT': 0.8, 'QUICK_SCROLL': -0.1,
                'DISLIKE': -1.0, 'L': -1.0, 'CAP': -1.5
            };

            await supabase.from('RecoFeedback').insert({
                userId,
                contentId,
                contentType,
                action,
                score: weights[action] || 0.1,
                slashes: tags.length > 0 ? JSON.stringify(tags) : null,
                source: 'mobile_app_direct'
            });

        } catch (error) {
            console.warn('Failed to log interaction:', error);
        }
    }
};
