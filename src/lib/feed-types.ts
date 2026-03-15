/**
 * Feed Types - Strongly typed interfaces for the Deterministic Recommendation Engine
 */

// ============================================================
// Interaction Tracking
// ============================================================

export type FeedAction =
    | 'FULL_WATCH'
    | 'SHARE'
    | 'COMMENT'
    | 'LIKE'
    | 'FAST_SWIPE'
    | 'NOT_INTERESTED';

export const FEED_ACTION_WEIGHTS: Record<FeedAction, number> = {
    FULL_WATCH: 15,
    SHARE: 10,
    COMMENT: 5,
    LIKE: 2,
    FAST_SWIPE: -20,
    NOT_INTERESTED: -50,
};

export interface FeedInteraction {
    id: string;
    userId: string;
    postId: string;
    authorId: string;
    action: FeedAction;
    weightScore: number;
    watchDurationMs: number | null;
    createdAt: Date;
}

// ============================================================
// Collaborative RPC Response
// ============================================================

export interface CollaborativeCandidate {
    post_id: string;
    post_author_id: string;
    post_type: string;
    post_content: string;
    post_created_at: string;   // ISO timestamp from Supabase
    post_view_count: number;
    author_name: string;
    author_avatar: string;
    author_trust: number;
    slash_tags: string[];
    total_engagement: number;
    source: 'collaborative';
}

// ============================================================
// Scoring Pipeline
// ============================================================

export interface ScoredCandidate {
    postId: string;
    authorId: string;
    postType: string;
    content: string;
    createdAt: Date;
    viewCount: number;
    authorName: string;
    authorAvatar: string;
    authorTrust: number;
    slashTags: string[];
    totalEngagement: number;
    source: 'collaborative' | 'global_velocity';
    gravityScore: number;        // After gravity math
    finalScore: number;          // After all multipliers and penalties
}

// ============================================================
// Final Feed Response
// ============================================================

export interface FeedPostResponse {
    id: string;
    postType: string;
    content: string;
    createdAt: string;
    user: {
        id: string;
        name: string;
        trustScore: number;
        profile: {
            displayName: string;
            avatarUrl: string;
        };
    };
    media: Array<{ type: string; url: string; thumbnailUrl: string | null }>;
    slashTags: string[];
    score: number;
    source: 'collaborative' | 'global_velocity';
}

export interface HomeFeedResponse {
    posts: FeedPostResponse[];
    meta: {
        collaborativeCount: number;
        globalVelocityCount: number;
        totalCandidatesScored: number;
    };
}
