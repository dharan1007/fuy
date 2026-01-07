// src/lib/post-synthesis.ts
// Shared utility to synthesize specialized post type data from FeedItem media

interface MediaPreview {
    type: string;
    url: string;
    variant?: string;
    thumbnailUrl?: string;
}

interface FeedItemData {
    postId: string;
    postType: string;
    feature?: string;
    contentSnippet?: string;
    authorName?: string;
}

/**
 * Synthesizes specialized post type data from FeedItem + media previews.
 * This eliminates the N+1 problem of joining with specialized tables.
 * 
 * NOTE: For full metadata (title, artist, duration), consider storing
 * these in the FeedItem.mediaPreviews JSON during post creation.
 */
export function synthesizePostData(item: FeedItemData, media: MediaPreview[]) {
    const { postId, postType } = item;

    return {
        lillData: postType === 'LILL' ? {
            id: postId,
            videoUrl: media[0]?.url || '',
            thumbnailUrl: media[0]?.thumbnailUrl || null,
            duration: 0, // Duration not stored in FeedItem - would need schema change
        } : undefined,

        fillData: postType === 'FILL' ? {
            id: postId,
            videoUrl: media[0]?.url || '',
            thumbnailUrl: media[0]?.thumbnailUrl || null,
            duration: 0,
        } : undefined,

        audData: postType === 'AUD' ? {
            id: postId,
            audioUrl: media[0]?.url || '',
            // Title/artist from media preview if stored, else use content snippet
            title: item.contentSnippet?.slice(0, 50) || 'Audio',
            artist: item.authorName || 'Unknown Artist',
            coverImageUrl: media[0]?.thumbnailUrl || media[0]?.url,
            duration: 0,
        } : undefined,

        chanData: postType === 'CHAN' ? {
            id: postId,
            channelName: item.contentSnippet?.slice(0, 30) || 'Channel',
            description: item.contentSnippet,
            coverImageUrl: media[0]?.url,
        } : undefined,

        xrayData: postType === 'XRAY' ? {
            id: postId,
            topLayerUrl: media.find(m => m.variant === 'xray-top')?.url || media[0]?.url || '',
            topLayerType: media.find(m => m.variant === 'xray-top')?.type || 'IMAGE',
            bottomLayerUrl: media.find(m => m.variant === 'xray-bottom')?.url || media[1]?.url || '',
            bottomLayerType: media.find(m => m.variant === 'xray-bottom')?.type || 'IMAGE',
        } : undefined,
    };
}
