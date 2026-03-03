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
     * Fetch Home Feed (Direct Supabase)
     */
    async getHomeFeed(limit: number = 15): Promise<FeedPost[]> {
        const { data: session } = await supabase.auth.getSession();
        const userId = session.session?.user?.id;

        // Fetch recent public posts
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
                slashes:Slash(tag),
                likes:PostLike(count),
                comments:PostComment(count)
            `)
            .eq('status', 'PUBLISHED')
            .eq('visibility', 'PUBLIC')
            .neq('userId', userId || '') // Exclude self
            .order('createdAt', { ascending: false })
            .limit(limit * 2); // Fetch extra to randomize locally

        if (error) {
            console.error("Supabase Home Feed Error:", error);
            throw error;
        }

        // Map to FeedPost interface and shuffle
        const posts: FeedPost[] = (data || []).map((post: any) => ({
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
            score: Math.random() // Simplified local scoring
        }));

        // Return randomized subset to mimic algorithmic drift
        return posts.sort(() => 0.5 - Math.random()).slice(0, limit);
    },

    /**
     * Fetch Explore Feed (Direct Supabase)
     */
    async getExploreFeed(limit: number = 15): Promise<FeedPost[]> {
        return this.getHomeFeed(limit); // For now, mirror home feed behavior until specific DB functions are added
    },

    /**
     * Fetch Dots Grid (Direct Supabase)
     */
    async getDotsFeed(category: 'fills' | 'lills' | 'shots' | 'auds', limit: number = 15): Promise<FeedPost[]> {
        // Map UI category to DB PostType
        const typeMap: Record<string, string> = {
            fills: 'TEXT', // Example fallback mappings
            lills: 'SERIES',
            shots: 'VIDEO',
            auds: 'AUDIO'
        };

        const postType = typeMap[category] || 'POST';

        const { data, error } = await supabase
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
            .eq('postType', postType)
            .order('createdAt', { ascending: false })
            .limit(limit);

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
        // In a direct DB environment, we just fetch recent posts as "similar" 
        // until a pgvector backend is explicitly available.
        return this.getHomeFeed(limit);
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

            // Simple client-side scoring weights for direct insert
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
            console.warn('Failed to logically log interaction:', error);
        }
    }
};
