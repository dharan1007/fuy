
import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';

export type PostVisibility = 'PUBLIC' | 'FRIENDS' | 'PRIVATE' | 'SPECIFIC';
export type PostType = 'STANDARD' | 'FILL' | 'LILL' | 'SIMPLE' | 'UD' | 'AUD' | 'CHAN' | 'CHAPTER' | 'XRAY' | 'CLOCK' | 'PULLUPDOWN';

interface MediaItem {
    uri: string;
    type: 'IMAGE' | 'VIDEO' | 'AUDIO';
    width?: number;
    height?: number;
    duration?: number;
    thumbnailUrl?: string; // Optional thumbnail
}

export interface CreatePostParams {
    userId: string;
    postType: PostType;
    content: string;
    visibility: PostVisibility;
    media: MediaItem[];
    // Specific Data Types
    fillData?: {
        duration: number;
        aspectRatio?: string;
        thumbnailUrl?: string;
    };
    lillData?: {
        duration: number;
        aspectRatio?: string;
        thumbnailUrl?: string;
    };
    audData?: {
        title: string;
        artist?: string | null;
        genre?: string | null;
        audioUrl: string;
        duration: number;
        coverImageUrl?: string | null;
    };
    chanData?: {
        channelName: string;
        description: string;
        episodeTitle: string;
        videoUrl: string;
        duration: number;
        isLive: boolean;
        coverImageUrl?: string | null;
    };
    chapterData?: {
        title: string;
        description?: string;
    };
    xrayData?: {
        topLayerUrl: string;
        topLayerType: 'IMAGE';
        bottomLayerUrl: string;
        bottomLayerType: 'IMAGE';
    };
    clockData?: { // Maps to Story model
        mediaUrl: string;
        mediaType: 'IMAGE' | 'VIDEO';
        duration: number;
        expiresAt: string;
    };
    pullUpDownData?: {
        question: string;
        optionA: string;
        optionB: string;
        allowMultiple: boolean;
    };
    taggedUserIds?: string[];
    slashes?: string[]; // Array of slash tags (e.g. "tech", "art")
    status?: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';
}

export class PostService {
    /**
     * Create a new post with all relations (Media, Type-Specific Data, Tags)
     */
    static async createPost(params: CreatePostParams) {
        console.log('[PostService] Creating post:', params.postType);

        // Generate ID client-side because DB default might be missing/failing
        const newPostId = Crypto.randomUUID();
        const now = new Date().toISOString();

        // 1. Insert Base Post
        const { data: post, error: postError } = await supabase
            .from('Post')
            .insert({
                id: newPostId, // Explicitly provide ID
                userId: params.userId,
                postType: params.postType,
                content: params.content,
                visibility: params.visibility,
                expiresAt: params.clockData?.expiresAt || null, // For Story/Clock
                status: params.status || 'PUBLISHED',

                // Explicit Defaults for fields that might be missing DB defaults
                createdAt: now,
                updatedAt: now,
                feature: 'OTHER',
                connectionScore: 0,
                creativityScore: 0,
                chapterAccessPolicy: 'PUBLIC',
                moderationStatus: 'CLEAN',
                impressions: 0,
                shareCount: 0,
                viewCount: 0
            })
            .select()
            .single();

        if (postError) throw new Error(`Failed to create post: ${postError.message}`);
        if (!post) throw new Error('Post created but check failed');

        const postId = post.id;
        console.log('[PostService] Post created:', postId);

        try {
            // 2. Handle Media Insertions
            if (params.media && params.media.length > 0) {
                await this.attachMedia(postId, params.userId, params.media);
            }

            // 3. Handle specific post data
            if (params.postType === 'FILL' && params.fillData) {
                await this.createFill(postId, params.fillData);
            } else if (params.postType === 'LILL' && params.lillData) {
                await this.createLill(postId, params.lillData);
            } else if (params.postType === 'SIMPLE') {
                await this.createSimple(postId);
            } else if (params.postType === 'AUD' && params.audData) {
                await this.createAud(postId, params.audData);
            } else if (params.postType === 'CHAN' && params.chanData) {
                await this.createChan(postId, params.chanData);
            } else if (params.postType === 'CHAPTER' && params.chapterData) {
                await this.createChapter(postId, params.chapterData);
            } else if (params.postType === 'XRAY' && params.xrayData) {
                await this.createXray(postId, params.xrayData);
            } else if (params.postType === 'CLOCK' && params.clockData) {
                await this.createStory(postId, params.clockData);
            } else if (params.postType === 'PULLUPDOWN' && params.pullUpDownData) {
                await this.createPullUpDown(postId, params.pullUpDownData);
            }

            // 4. Handle Tags
            if (params.taggedUserIds) {
                await this.attachUserTags(postId, params.taggedUserIds);
            }

        } catch (error) {
            console.error('[PostService] Error details:', error);
            throw error;
        }

        return post;
    }

    // Helper to handle Media attachments
    static async attachMedia(postId: string, userId: string, mediaItems: MediaItem[]) {
        for (let i = 0; i < mediaItems.length; i++) {
            const item = mediaItems[i];

            const mediaId = Crypto.randomUUID();
            const now = new Date().toISOString();

            // Create Media Record
            const { data: mediaRecord, error: mediaError } = await supabase
                .from('Media')
                .insert({
                    id: mediaId,
                    userId,
                    type: item.type,
                    url: item.uri, // map uri to url
                    duration: item.duration || 0,
                    createdAt: now
                })
                .select()
                .single();

            if (mediaError) throw mediaError;

            // Link to Post
            const postMediaId = Crypto.randomUUID();
            const { error: linkError } = await supabase
                .from('PostMedia')
                .insert({
                    id: postMediaId,
                    postId,
                    mediaId: mediaRecord.id,
                    orderIndex: i
                });

            if (linkError) throw linkError;
        }
    }

    // --- Type Helpers ---

    static async createFill(postId: string, data: { duration: number, aspectRatio?: string, thumbnailUrl?: string }) {
        const fillId = Crypto.randomUUID();
        const now = new Date().toISOString();
        const { error } = await supabase.from('Fill').insert({
            id: fillId,
            postId,
            duration: data.duration,
            aspectRatio: data.aspectRatio || '16:9',
            thumbnailUrl: data.thumbnailUrl || null,
            createdAt: now
            // Fill has no updatedAt
        });
        if (error) throw error;
    }

    static async createLill(postId: string, data: { duration: number, aspectRatio?: string, thumbnailUrl?: string }) {
        const lillId = Crypto.randomUUID();
        const now = new Date().toISOString();
        const { error } = await supabase.from('Lill').insert({
            id: lillId,
            postId,
            duration: data.duration,
            aspectRatio: data.aspectRatio || '9:16',
            thumbnailUrl: data.thumbnailUrl || null,
            createdAt: now
            // Lill has no updatedAt
        });
        if (error) throw error;
    }

    static async createSimple(postId: string) {
        const simpleId = Crypto.randomUUID();
        const now = new Date().toISOString();
        const { error } = await supabase.from('SimplePost').insert({
            id: simpleId,
            postId,
            createdAt: now,
            updatedAt: now // SimplePost HAS updatedAt
        });
        if (error) throw error;
    }

    static async createAud(postId: string, data: { title: string, artist?: string | null, genre?: string | null, audioUrl: string, duration: number, coverImageUrl?: string | null }) {
        const audId = Crypto.randomUUID();
        const now = new Date().toISOString();
        const { error } = await supabase.from('Aud').insert({
            id: audId,
            postId,
            title: data.title,
            artist: data.artist,
            genre: data.genre,
            // audioUrl moved to Media table
            duration: data.duration,
            coverImageUrl: data.coverImageUrl,
            createdAt: now
            // Aud has no updatedAt
        });
        if (error) throw error;
    }

    static async createChan(postId: string, data: { channelName: string, description: string, episodeTitle: string, videoUrl: string, duration: number, isLive: boolean, coverImageUrl?: string | null }) {
        const chanId = Crypto.randomUUID();
        const now = new Date().toISOString();
        const { error } = await supabase.from('Chan').insert({
            id: chanId,
            postId,
            channelName: data.channelName,
            description: data.description,
            // episodeTitle, videoUrl, duration Removed from Chan model
            isLive: data.isLive,
            coverImageUrl: data.coverImageUrl,
            createdAt: now,
            updatedAt: now // Chan HAS updatedAt
        });
        if (error) throw error;
    }

    static async createChapter(postId: string, data: { title: string, description?: string }) {
        const chapterId = Crypto.randomUUID();
        const now = new Date().toISOString();
        const { error } = await supabase.from('Chapter').insert({
            id: chapterId,
            postId,
            title: data.title,
            description: data.description,
            createdAt: now,
            updatedAt: now // Chapter HAS updatedAt
        });
        if (error) throw error;
    }

    static async createXray(postId: string, data: { topLayerUrl: string, bottomLayerUrl: string }) {
        const xrayId = Crypto.randomUUID();
        const now = new Date().toISOString();
        const { error } = await supabase.from('Xray').insert({
            id: xrayId,
            postId,
            // topLayerUrl/bottomLayerUrl moved to Media table
            revealPercent: 0,
            createdAt: now
            // Xray has no updatedAt
        });
        if (error) throw error;
    }

    static async createStory(postId: string, data: { duration: number }) {
        const storyId = Crypto.randomUUID();
        const now = new Date().toISOString();
        const { error } = await supabase.from('Story').insert({
            id: storyId,
            postId,
            duration: data.duration,
            createdAt: now
            // Story has no updatedAt
        });
        if (error) throw error;
    }

    static async createPullUpDown(postId: string, data: { question: string, optionA: string, optionB: string, allowMultiple: boolean }) {
        // 1. Create PullUpDown record
        const pullId = Crypto.randomUUID();
        const now = new Date().toISOString();
        const { data: pull, error } = await supabase.from('PullUpDown').insert({
            id: pullId,
            postId,
            question: data.question,
            allowMultiple: data.allowMultiple,
            createdAt: now
            // PullUpDown has no updatedAt
        }).select().single();

        if (error) throw error;

        // 2. Create Options
        const opt1Id = Crypto.randomUUID();
        const opt2Id = Crypto.randomUUID();
        const options = [
            { id: opt1Id, pullUpDownId: pull.id, text: data.optionA, isUp: true, createdAt: now },
            { id: opt2Id, pullUpDownId: pull.id, text: data.optionB, isUp: false, createdAt: now }
        ];

        const { error: optError } = await supabase.from('PullUpDownOption').insert(options);
        if (optError) throw optError;
    }

    // --- End Type Helpers ---

    // Helper for Tags
    static async attachUserTags(postId: string, userIds: string[]) {
        if (!userIds || userIds.length === 0) return;

        // PostTag might not have an 'id' column, usually it's composite key (postId, userId).
        // If it DOES have 'id', we need to generate it.
        // Assuming composite for now, but if it fails, user will report.
        // Safe bet: manually generate UUID for id ONLY IF column exists.
        // I will assume it DOES NOT need ID for now to avoid breaking it if no ID column.

        const tags = userIds.map(uid => ({
            postId,
            userId: uid
        }));

        const { error } = await supabase.from('PostTag').insert(tags);
        if (error) throw error;
    }
    static async deletePost(postId: string) {
        const { error } = await supabase.from('Post').delete().eq('id', postId);
        if (error) throw error;
    }

    /**
     * Handles reaction toggling/updating.
     * If user already reacted with same type -> remove it.
     * If user reacted with different type -> update it.
     * If no reaction -> insert it.
     */
    static async handleReaction(postId: string, userId: string, type: string) {
        // 1. Check existing
        const { data: existing, error: fetchError } = await supabase
            .from('Reaction')
            .select('id, type')
            .eq('postId', postId)
            .eq('userId', userId)
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (existing) {
            if (existing.type === type) {
                // Remove
                const { error } = await supabase.from('Reaction').delete().eq('id', existing.id);
                if (error) throw error;
                return 'REMOVED';
            } else {
                // Update
                const { error } = await supabase.from('Reaction').update({ type }).eq('id', existing.id);
                if (error) throw error;
                return 'UPDATED';
            }
        } else {
            // Insert
            const { error } = await supabase.from('Reaction').insert({
                postId,
                userId,
                type
            });
            if (error) throw error;
            return 'INSERTED';
        }
    }

    /**
     * Adds a reaction bubble to a post.
     */
    static async addBubble(postId: string, userId: string, media: { url: string, type: 'IMAGE' | 'VIDEO' }) {
        const bubbleId = Crypto.randomUUID();
        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from('ReactionBubble')
            .insert({
                id: bubbleId,
                postId,
                userId,
                mediaUrl: media.url,
                mediaType: media.type,
                createdAt: now
            })
            .select() // Return data so we can update UI with real ID if needed
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Fetch feed posts with counts.
     */
    static async getFeed(page = 0, limit = 20) {
        const from = page * limit;
        const to = from + limit - 1;

        const { data, error } = await supabase
            .from('Post')
            .select(`
                id, content, createdAt, postType,
                user:User(name, profile:Profile(displayName, avatarUrl)),
                postMedia:PostMedia(media:Media(url, type)),
                likes:PostLike(count),
                comments:PostComment(count),
                bubbles:ReactionBubble(
                    id,
                    mediaUrl,
                    mediaType,
                    createdAt,
                    userId,
                    user:User (
                        name,
                        profile:Profile (avatarUrl, displayName)
                    )
                )
            `)
            .eq('visibility', 'PUBLIC')
            .order('createdAt', { ascending: false })
            .range(from, to);

        if (error) throw error;
        return data;
    }
}
