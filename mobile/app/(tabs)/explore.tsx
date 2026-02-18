import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TouchableWithoutFeedback, TextInput, Dimensions, FlatList, Alert, RefreshControl, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, X, UserPlus, Check, Clock, Grid, User, Compass, Bell, Zap, Star, Circle, Play, Pause, Plus } from 'lucide-react-native';
import SlashesModal from '../../components/SlashesModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useFocusEffect as useNavFocusEffect } from '@react-navigation/native';
import { getSafetyFilters, applySafetyFilters } from '../../services/SafetyService';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import XrayScratch from '../../components/XrayScratch';
import ChansTab from '../../components/ChansTab';
import { InfiniteCanvas } from '../../components/InfiniteCanvas';

const { width, height } = Dimensions.get('window');

const PADDING = 16;

interface Post {
    id: string;
    media: { url: string; type: string; variant?: string; thumbnailUrl?: string }[] | null;
    content: string;
    postType?: string;
    postMedia?: { media: { url: string; type: string; variant?: string; thumbnailUrl?: string } }[];
    lillData?: { thumbnailUrl?: string }[] | { thumbnailUrl?: string };
    fillData?: { thumbnailUrl?: string }[] | { thumbnailUrl?: string };
    chanData?: { id?: string; channelName?: string; description?: string; coverImageUrl?: string };
    user?: { name?: string; profile?: { avatarUrl?: string; displayName?: string } };
    topBubbles?: { mediaUrl: string; mediaType: string }[];
    slashes?: { tag: string }[];
}

interface SearchResult {
    type: 'USER' | 'SLASH';
    id: string;
    title: string;
    subtitle?: string;
    avatar?: string;
    data?: any;
    friendshipStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'NONE';
}

// Tighter, scattered card layout for 2D scrolling
// Tighter, scattered card layout for 2D scrolling
// Interface for dynamic card layout
interface CardConfig {
    width: number;
    height: number;
    top: number;
    left: number;
    rotate: number;
    radius: number;
    zIndex?: number;
}



// ... existing code ...





const CONTENT_WIDTH = 900;
const PATTERN_HEIGHT = 1400; // Height of one cycle of CARD_CONFIGS

// Module-level cache for post count to avoid redundant Supabase queries
let cachedPostCount: number | null = null;

const FloatingCard = ({ post, config, index, onPress, onToggleScroll, isActive, shouldPlay, shouldRenderVideo }: { post: Post; config: CardConfig; index: number; onPress: () => void; onToggleScroll: (enabled: boolean) => void; isActive: boolean; shouldPlay: boolean; shouldRenderVideo: boolean }) => {
    const [slashesModalVisible, setSlashesModalVisible] = React.useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [generatedThumb, setGeneratedThumb] = useState<string | null>(null);
    const { colors } = useTheme();

    // Generate thumbnail for video posts that lack a thumbnailUrl
    useEffect(() => {
        if (post.media && post.media.length > 0) {
            const firstMedia = post.media[0];
            const isVideo = firstMedia.type === 'VIDEO' || firstMedia.url?.match(/\.(mp4|mov|webm)$/i);
            if (isVideo && !firstMedia.thumbnailUrl && firstMedia.url) {
                VideoThumbnails.getThumbnailAsync(firstMedia.url, { time: 0 })
                    .then(result => setGeneratedThumb(result.uri))
                    .catch(() => { }); // Fail silently, will use video fallback
            }
        }
    }, [post.id]);

    // Priority: thumbnailUrl > generated thumbnail > IMAGE type > image extension > video URL (last resort)
    const getImageUrl = (): string | null => {
        if (!post.media || post.media.length === 0) {
            return null;
        }

        // Check for thumbnailUrl first (from Lill/Fill tables)
        const withThumb = post.media.find(m => m.thumbnailUrl);
        if (withThumb?.thumbnailUrl) {
            return withThumb.thumbnailUrl;
        }

        // Check for generated thumbnail (from expo-video-thumbnails)
        if (generatedThumb) {
            return generatedThumb;
        }

        // Check for IMAGE type
        const imageType = post.media.find(m => m.type?.toUpperCase() === 'IMAGE');
        if (imageType?.url) {
            return imageType.url;
        }

        // Check for image extension
        const imageExt = post.media.find(m => m.url?.match(/\.(jpeg|jpg|png|webp|gif)$/i));
        if (imageExt?.url) {
            return imageExt.url;
        }

        // Last resort: use any available URL (including video)
        const anyUrl = post.media[0]?.url;
        if (anyUrl) {
            return anyUrl;
        }

        return null;
    };

    // For XRAY posts, get both layers
    let coverUrl: string | null = null;
    let contentUrl: string | null = null;
    let coverType: string = 'IMAGE';
    let contentType: string = 'IMAGE';

    if (post.postType === 'XRAY' && post.media && post.media.length >= 2) {
        const cover = post.media.find(m => m.variant === 'xray-bottom') || post.media[0];
        const content = post.media.find(m => m.variant === 'xray-top') || post.media[1];
        coverUrl = cover?.thumbnailUrl || cover?.url || null;
        contentUrl = content?.thumbnailUrl || content?.url || null;
        coverType = cover?.type || 'IMAGE';
        contentType = content?.type || 'IMAGE';
    }

    const imageUrl = getImageUrl();

    return (
        <View
            style={{
                position: 'absolute',
                top: config.top,
                left: config.left,
                width: config.width,
                height: config.height,
                transform: [{ rotate: `${config.rotate}deg` }],
            }}
        >
            <View
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: config.radius,
                    overflow: 'hidden',
                    backgroundColor: '#1a1a1a',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 5,
                }}
            >
                {/* Media Layer */}
                <TouchableWithoutFeedback onPress={onPress}>
                    <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
                        {imageUrl ? (
                            imageUrl.match(/\.(mp4|mov|webm)$/i) ? (
                                (shouldPlay || shouldRenderVideo) ? (
                                    <Video
                                        source={{ uri: imageUrl }}
                                        style={{ width: '100%', height: '100%', backgroundColor: '#1a1a1a' }}
                                        resizeMode={ResizeMode.COVER}
                                        shouldPlay={shouldPlay}
                                        isMuted={true}
                                        isLooping={true}
                                        useNativeControls={false}
                                        onReadyForDisplay={() => setIsLoaded(true)}
                                        onError={() => setIsLoaded(true)}
                                    />
                                ) : (
                                    // Video not actively playing: show thumbnail image instead of Video decoder
                                    (post.media && post.media[0]?.thumbnailUrl) || generatedThumb ? (
                                        <Image
                                            source={{ uri: post.media?.[0]?.thumbnailUrl || generatedThumb || '' }}
                                            style={{ width: '100%', height: '100%' }}
                                            contentFit="cover"
                                            cachePolicy="memory-disk"
                                            recyclingKey={`thumb-${post.id}`}
                                            transition={200}
                                            onLoad={() => setIsLoaded(true)}
                                            onError={() => setIsLoaded(true)}
                                        />
                                    ) : (
                                        <View
                                            style={{ flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }}
                                            onLayout={() => setIsLoaded(true)}
                                        >
                                            <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
                                        </View>
                                    )
                                )
                            ) : (
                                <Image
                                    source={{ uri: imageUrl }}
                                    style={{ width: '100%', height: '100%' }}
                                    contentFit="cover"
                                    cachePolicy="memory-disk"
                                    recyclingKey={post.id}
                                    transition={200}
                                    onLoad={() => setIsLoaded(true)}
                                    onError={() => setIsLoaded(true)}
                                />
                            )
                        ) : (
                            <View style={{ flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }}>
                                <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
                            </View>
                        )}
                        {!isLoaded && (
                            <View style={{ position: 'absolute', inset: 0, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }}>
                                <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
                            </View>
                        )}
                    </View>
                </TouchableWithoutFeedback>

                {/* XRAY Layer - Overlay if applicable */}
                {post.postType === 'XRAY' && coverUrl && contentUrl && (
                    <View style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
                        <XrayScratch
                            coverUrl={coverUrl}
                            contentUrl={contentUrl}
                            coverType={coverType}
                            contentType={contentType}
                            isActive={isActive}
                            onToggleScroll={onToggleScroll}
                        />
                    </View>
                )}

                {/* Overlays - Interactable for Navigation (Only for non-Xray or passive Xray areas) */}
                {post.postType !== 'XRAY' && (
                    <View
                        style={{ position: 'absolute', inset: 0, justifyContent: 'flex-end' }}
                        pointerEvents="box-none"
                    >
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={onPress}
                        >
                            <View
                                style={{
                                    height: config.height * 0.5,
                                    justifyContent: 'flex-end',
                                    padding: 12,
                                }}
                            />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Reaction Bubbles (Mini) */}
                {post.topBubbles && post.topBubbles.length > 0 && (
                    <View style={{ position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', marginLeft: 4 }}>
                            {post.topBubbles.slice(0, 2).map((bubble, i) => (
                                <View
                                    key={i}
                                    style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: 12,
                                        borderWidth: 1.5,
                                        borderColor: '#1a1a1a',
                                        backgroundColor: '#333',
                                        overflow: 'hidden',
                                        marginLeft: -8,
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Image
                                        source={{ uri: bubble.mediaUrl }}
                                        style={{ width: '100%', height: '100%' }}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                    />
                                </View>
                            ))}
                        </View>
                    </View>
                )}

            </View>

            <SlashesModal
                visible={slashesModalVisible}
                onClose={() => setSlashesModalVisible(false)}
                slashes={post.slashes || []}
            />
        </View >
    );
};

// Optimized with React.memo to prevent crashes
const MemoizedFloatingCard = React.memo(FloatingCard, (prev, next) => {
    return prev.isActive === next.isActive &&
        prev.post.id === next.post.id &&
        prev.index === next.index &&
        prev.shouldPlay === next.shouldPlay &&
        prev.shouldRenderVideo === next.shouldRenderVideo;
});

export default function ExploreScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentTab, setCurrentTab] = useState('Posts'); // Default to Posts
    const [scrollX, setScrollX] = useState(0);
    const [scrollY, setScrollY] = useState(0);

    const [isScreenFocused, setIsScreenFocused] = useState(true);
    const [scrollEnabled, setScrollEnabled] = useState(true);
    const [chunkRegistry, setChunkRegistry] = useState<Record<string, Post[]>>({});
    const [loadedChunks, setLoadedChunks] = useState<Set<string>>(new Set());
    const fetchingRefs = useRef<Set<string>>(new Set());
    // const CHUNK_SIZE = 1000; // Removed in favor of dynamic Width/Height
    const globalOffsetRef = useRef(0);
    const [playingPostId, setPlayingPostId] = useState<string | null>(null);

    // Sequential Player Logic
    // Sequential Player Logic
    useEffect(() => {
        const interval = setInterval(() => {
            setPlayingPostId(prev => {
                const allPosts: Post[] = [];
                // Only consider VISIBLE chunks for playback to ensure immediate responsiveness
                const currentVisible = visibleChunkKeysRef.current;

                currentVisible.forEach(key => {
                    const chunk = chunkRegistry[key];
                    if (chunk) allPosts.push(...chunk);
                });

                if (allPosts.length === 0) return null;

                // Sort by vertical position (top) to ensure "one by one" down the feed
                // We cast to any to access _layout
                allPosts.sort((a: any, b: any) => (a._layout?.top || 0) - (b._layout?.top || 0));

                const videoPosts = allPosts.filter(p =>
                    p.postMedia?.some(m => m.media?.type === 'VIDEO' || m.media?.url?.match(/\.(mp4|mov|webm)$/i)) ||
                    p.media?.some(m => m.type === 'VIDEO' || m.url?.match(/\.(mp4|mov|webm)$/i))
                );

                if (videoPosts.length === 0) return null;

                const currentIndex = videoPosts.findIndex(p => p.id === prev);
                // If current playing is not found (off screen), start from first visible
                if (currentIndex === -1) return videoPosts[0].id;

                const nextIndex = (currentIndex + 1) % videoPosts.length;
                return videoPosts[nextIndex].id;
            });
        }, 3000); // 3 seconds per post

        return () => clearInterval(interval);
    }, [chunkRegistry]); // Depend on registry updates

    const [visibleChunkKeys, setVisibleChunkKeys] = useState<Set<string>>(new Set());
    const visibleChunkKeysRef = useRef<Set<string>>(new Set());

    const [scrollBounds, setScrollBounds] = useState<{ minX: number; maxX: number; minY: number; maxY: number } | null>(null);
    const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());
    const [allowedVideoIds, setAllowedVideoIds] = useState<Set<string>>(new Set());

    // Calculate Bounds based on loaded chunks (data fetched from network)
    // No more waiting for individual assets to render
    useEffect(() => {
        let minChunkX = Infinity, maxChunkX = -Infinity;
        let minChunkY = Infinity, maxChunkY = -Infinity;

        if (loadedChunks.size === 0) {
            minChunkX = 0; maxChunkX = 0;
            minChunkY = 0; maxChunkY = 0;
        } else {
            loadedChunks.forEach(key => {
                const [cx, cy] = key.split(',').map(Number);
                if (cx < minChunkX) minChunkX = cx;
                if (cx > maxChunkX) maxChunkX = cx;
                if (cy < minChunkY) minChunkY = cy;
                if (cy > maxChunkY) maxChunkY = cy;
            });
        }

        const CHUNK_WIDTH = width + 60;
        const CHUNK_HEIGHT = 1600;

        const newBounds = {
            maxX: -(minChunkX * CHUNK_WIDTH),
            minX: -((maxChunkX + 1) * CHUNK_WIDTH - width),
            maxY: -(minChunkY * CHUNK_HEIGHT),
            minY: -((maxChunkY + 1) * CHUNK_HEIGHT - height)
        };

        setScrollBounds(newBounds);
    }, [loadedChunks]);

    const handleRegionChange = useCallback((region: { x: number, y: number, width: number, height: number }) => {
        const CHUNK_WIDTH = width + 60; // Add 60px gap between horizontal batches
        const CHUNK_HEIGHT = 1600; // Match layout logic

        const startChunkX = Math.floor(region.x / CHUNK_WIDTH);
        const endChunkX = Math.floor((region.x + region.width) / CHUNK_WIDTH);
        const startChunkY = Math.floor(region.y / CHUNK_HEIGHT);
        const endChunkY = Math.floor((region.y + region.height) / CHUNK_HEIGHT);

        const newVisibleKeys = new Set<string>();

        // Render Logic: We MUST render neighbors to allow them to load assets (Image/Video)
        // even if they are off-screen.
        // Expand range by 1 in all directions

        const renderStartX = startChunkX - 1;
        const renderEndX = endChunkX + 1;
        const renderStartY = startChunkY - 1;
        const renderEndY = endChunkY + 1;

        for (let x = renderStartX; x <= renderEndX; x++) {
            for (let y = renderStartY; y <= renderEndY; y++) {
                newVisibleKeys.add(`${x},${y}`);
            }
        }
        setVisibleChunkKeys(newVisibleKeys);
        visibleChunkKeysRef.current = newVisibleKeys;

        setScrollX(region.x);
        setScrollY(region.y);

        // Calculate Video Priority (Limit Hardware Decoders to max 6)
        const centerX = region.x + region.width / 2;
        const centerY = region.y + region.height / 2;
        const candidatePosts: { id: string, dist: number }[] = [];

        newVisibleKeys.forEach(key => {
            const chunk = chunkRegistry[key];
            if (!chunk) return;
            chunk.forEach(p => {
                const isVideo = p.media?.some(m => m.type === 'VIDEO' || m.url?.match(/\.(mp4|mov|webm)$/i));
                if (isVideo && (p as any)._layout) {
                    const layout = (p as any)._layout;
                    const dx = (layout.left + layout.width / 2) - centerX;
                    const dy = (layout.top + layout.height / 2) - centerY;
                    candidatePosts.push({ id: p.id, dist: dx * dx + dy * dy });
                }
            });
        });
        candidatePosts.sort((a, b) => a.dist - b.dist);
        setAllowedVideoIds(new Set(candidatePosts.slice(0, 6).map(p => p.id)));

        // Prefetch adjacent chunks
        for (let x = startChunkX - 1; x <= endChunkX + 1; x++) {
            for (let y = startChunkY - 1; y <= endChunkY + 1; y++) {
                const key = `${x},${y}`;
                if (!loadedChunks.has(key) && !fetchingRefs.current.has(key)) {
                    fetchChunk(x, y);
                }
            }
        }
    }, [loadedChunks, chunkRegistry]);

    const fetchChunk = async (chunkX: number, chunkY: number) => {
        const key = `${chunkX},${chunkY}`;
        // If already fetching, ignore
        if (fetchingRefs.current.has(key)) return;

        // If already loaded, ignore
        if (loadedChunks.has(key)) return;

        fetchingRefs.current.add(key);
        // Force update to show loading state (by checking fetchingRefs in render)
        // Actually, we use a local state updater or just rely on the component re-rendering via other means
        // But for spinners, we might need to know what's fetching.
        // Let's add a state for loadingKeys to control spinners
        setLoadingKeys(prev => new Set(prev).add(key));

        const batchSize = 15;
        const totalCycleSize = 3000; // Increased to 3000 to cover user's 2000+ posts

        // Generate a pseudo-random but deterministic offset based on coordinates
        // This ensures infinite scrolling even with limited data by looping
        const seed = Math.abs(chunkX * 73 + chunkY * 19);

        try {
            // Use cached post count to avoid redundant Supabase queries
            let totalPosts = cachedPostCount || 100;
            if (!cachedPostCount) {
                const { count } = await supabase
                    .from('Post')
                    .select('*', { count: 'estimated', head: true })
                    .eq('visibility', 'PUBLIC');
                if (count) {
                    totalPosts = count;
                    cachedPostCount = count;
                }
            }

            // Ensure offset wraps around actual data size
            const validOffset = (seed * batchSize) % (totalPosts || 1);

            const { data, error } = await supabase
                .from('Post')
                .select(`
                    id, content, postType,
                    user:User(name, profile:Profile(displayName, avatarUrl)),
                    postMedia:PostMedia(media:Media(url, type, variant)),
                    lillData:Lill(thumbnailUrl),
                    fillData:Fill(thumbnailUrl),
                    chanData:Chan(coverImageUrl),
                    topBubbles:ReactionBubble(mediaUrl, mediaType),
                    slashes:Slash(tag)
                `)
                .eq('visibility', 'PUBLIC')
                // .in('postType', ['XRAY', 'LILL', 'FILL', 'CHAPTER']) // Allow ALL
                .order('createdAt', { ascending: false })
                .range(validOffset, validOffset + batchSize - 1);

            if (error) {
                console.error('[Explore] Supabase error:', error);
                fetchingRefs.current.delete(key);
                setLoadingKeys(prev => {
                    const next = new Set(prev);
                    next.delete(key);
                    return next;
                });
                return;
            }

            if (data && data.length > 0) {
                const transformed: Post[] = data.map((p: any) => {
                    const lill = Array.isArray(p.lillData) ? p.lillData[0] : p.lillData;
                    const fill = Array.isArray(p.fillData) ? p.fillData[0] : p.fillData;
                    const chan = Array.isArray(p.chanData) ? p.chanData[0] : p.chanData;
                    let thumbnailUrl = lill?.thumbnailUrl || fill?.thumbnailUrl || chan?.coverImageUrl || null;
                    const media = (p.postMedia || []).map((pm: any) => {
                        const m = pm.media;
                        if (m && !m.type) {
                            if (m.url?.match(/\.(mp4|mov|webm)$/i)) m.type = 'VIDEO';
                            else m.type = 'IMAGE';
                        }
                        return m;
                    }).filter(Boolean);

                    // Fallback - Instant Cover
                    if (!thumbnailUrl && media.length > 0) {
                        if (media[0].type === 'VIDEO' || media[0].url?.match(/\.(mp4|mov|webm)$/i)) {
                            thumbnailUrl = media[0].url;
                        }
                    }
                    if (thumbnailUrl && media.length > 0) media[0].thumbnailUrl = thumbnailUrl;

                    return {
                        id: p.id,
                        content: p.content || '',
                        postType: p.postType,
                        media,
                        lillData: p.lillData,
                        fillData: p.fillData,
                        chanData: p.chanData || null,
                        postMedia: p.postMedia,
                        user: Array.isArray(p.user) ? p.user[0] : p.user,
                        topBubbles: p.topBubbles || [],
                        slashes: p.slashes || []
                    };
                }).filter(post => post.media && post.media.length > 0);

                // Shuffle
                for (let i = transformed.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [transformed[i], transformed[j]] = [transformed[j], transformed[i]];
                }

                // SCATTERED LAYOUT
                const SCREEN_WIDTH = width;
                const COLS = 3;
                const slotWidth = SCREEN_WIDTH / COLS;
                const slotHeight = 320; // Increased height to prevent vertical overlap (was 280)

                const layoutedPosts = transformed.map((post, index) => {
                    const col = index % COLS;
                    const row = Math.floor(index / COLS);

                    // Scattered Dimensions
                    const wBase = slotWidth;
                    const hBase = 220; // Base height

                    const width = slotWidth - 40; // Reduce width significantly to create a large gutter (20px per side)
                    const height = hBase + ((Math.random() - 0.5) * 40); // Variance +/- 20. Max 240. Min 200. Gap 80-120px.

                    // Scattered Position & Tilt
                    let jitterX = (Math.random() - 0.5) * 10; // reduced range +/- 5

                    // Strictly force inward movement for edge columns to prevent overlap
                    if (col === 0) jitterX = Math.abs(jitterX) + 6; // Force inward (right)
                    if (col === COLS - 1) jitterX = -(Math.abs(jitterX) + 6); // Force inward (left)

                    const jitterY = (Math.random() - 0.5) * 20;
                    const rotate = (Math.random() - 0.5) * 4; // Reduce rotation

                    const CHUNK_WIDTH = SCREEN_WIDTH + 60; // Add 60px gap between batches
                    const CHUNK_HEIGHT = 1600; // Increased to match content height (5 rows * 320 = 1600)

                    const actualChunkOffsetY = chunkY * CHUNK_HEIGHT;
                    const actualChunkOffsetX = chunkX * CHUNK_WIDTH;

                    return {
                        ...post,
                        _layout: {
                            top: actualChunkOffsetY + (row * slotHeight) + jitterY,
                            left: actualChunkOffsetX + (col * slotWidth) + jitterX + 14, // +14 to center the card (28px gap / 2)
                            width,
                            height,
                            rotate,
                            radius: 8,
                            zIndex: Math.floor(Math.random() * 100)
                        }
                    } as Post & { _layout: any };
                });

                setChunkRegistry(prev => ({ ...prev, [key]: layoutedPosts }));

                // IMPORTANT: Update loadedChunks AFTER registry to prevent accessing undefined data
                setLoadedChunks(prev => new Set(prev).add(key));

                // Prefetch images for instant rendering when cards mount
                layoutedPosts.forEach(p => {
                    const url = (p as any).media?.[0]?.thumbnailUrl || (p as any).media?.[0]?.url;
                    if (url && !url.match(/\.(mp4|mov|webm)$/i)) {
                        Image.prefetch(url);
                    }
                });
            }
        } catch (e) {
            console.error('[Explore] Chunk fetch error:', e);
        } finally {
            fetchingRefs.current.delete(key);
            // Don't remove from loadingKeys here if valid? 
            // Actually loadingKeys tracks NETWORK fetch.
            // The spinner for ASSETS is handled by the fact that it's in registry but not in readyChunks.

            setLoadingKeys(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        }
    };




    // Global Pause when leaving tab (Crash Fix)
    useFocusEffect(
        React.useCallback(() => {
            setIsScreenFocused(true);
            return () => setIsScreenFocused(false);
        }, [])
    );

    const [allSlashes, setAllSlashes] = useState<{ tag: string, count: number }[]>([]);

    const fetchSlashes = async () => {
        try {
            const { data } = await supabase.from('Slash').select('tag, count').order('count', { ascending: false });
            if (data) setAllSlashes(data);
        } catch (e) {
            console.error('Fetch slashes error:', e);
        }
    };

    useEffect(() => {
        if (currentTab === 'Slashes') {
            fetchSlashes();
        } else {
            fetchPosts(currentTab);
        }
        getCurrentUser();
    }, [currentTab]);

    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);
    };

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(searchQuery), 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        if (debouncedQuery.length < 2) {
            setSearchResults([]);
            return;
        }
        performSearch(debouncedQuery);
    }, [debouncedQuery]);

    const fetchPosts = async (tab = 'ALL', isLoadMore = false) => {
        if (!isLoadMore && loading && !refreshing) return; // Prevent double load
        if (isLoadMore && (!hasMore || loading)) return;

        try {
            setLoading(true);
            const PAGE_SIZE = 20;
            const from = isLoadMore ? posts.length : 0;
            const to = from + PAGE_SIZE - 1;

            // --- Safety Filtering ---
            // Get current user directly to avoid race condition
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id;

            let filters = { excludedUserIds: [], hiddenPostIds: [] };
            if (userId && !isLoadMore) { // Only fetch filters on fresh load
                filters = await getSafetyFilters(userId);
                setCurrentUserId(userId);
            }

            // Direct Supabase query with service role to bypass RLS
            let query = supabase
                .from('Post')
                .select(`
            id,
            content,
            postType,
            user:User(name, profile:Profile(displayName, avatarUrl)),
            chan_data:Chan(*),
            lillData:Lill(thumbnailUrl),
            fillData:Fill(thumbnailUrl),
            postMedia:PostMedia (
                media:Media (url, type)
            ),
            topBubbles:ReactionBubble (
                mediaUrl,
                mediaType
            ),
            slashes:Slash(tag)
            `)
                .eq('visibility', 'PUBLIC')
                .order('createdAt', { ascending: false })
                .range(from, to);

            // Apply safety filters (simple implementation - ideally should be in query or rpc)
            if (userId && !isLoadMore) {
                // query = applySafetyFilters(query, filters);
            }

            // Map tabs to PostTypes
            switch (tab) {
                case 'Chans':
                    query = query.eq('postType', 'CHAN');
                    break;
                case 'Auds':
                    query = query.eq('postType', 'AUD');
                    break;
                case 'Chapters':
                    query = query.eq('postType', 'CHAPTER');
                    break;
                case 'Puds':
                    query = query.eq('postType', 'PULLUPDOWN');
                    break;
                case 'sixts':
                    query = query.eq('postType', 'SIXT');
                    break;
                case 'Posts':
                default:
                    // Filter: XRAY, LILL, FILL, CHAPTER
                    query = query.in('postType', ['XRAY', 'LILL', 'FILL', 'CHAPTER']);
                    break;
            }

            const { data, error } = await query;

            if (error) {
                console.error('Explore fetch error:', error.message);
                setPosts([]);
                return;
            }

            if (data && data.length > 0) {
                console.log('Sample Post Data:', JSON.stringify(data[0], null, 2));
                console.log('User Data:', JSON.stringify(data[0].user, null, 2));
            }

            // Transform to Post interface
            const transformedPosts: Post[] = (data || []).map((p: any) => {
                // Get thumbnailUrl from the correct post type table
                // Note: chan_data is used here instead of chanData due to query usage
                const chanCover = Array.isArray(p.chan_data) ? p.chan_data[0]?.coverImageUrl : p.chan_data?.coverImageUrl;

                const thumbnailUrl = p.lillData?.thumbnailUrl
                    || p.fillData?.thumbnailUrl
                    || chanCover
                    || null;

                // Map media
                const media = (p.postMedia || []).map((pm: any) => pm.media).filter(Boolean);

                // Attach thumbnail if found
                if (thumbnailUrl && media.length > 0) {
                    media[0].thumbnailUrl = thumbnailUrl;
                }

                return {
                    id: p.id,
                    content: p.content || '',
                    postType: p.postType,
                    media,
                    chanData: Array.isArray(p.chan_data) ? p.chan_data[0] : p.chan_data,
                    postMedia: p.postMedia,
                    user: Array.isArray(p.user) ? p.user[0] : p.user, // Safely unwrap user
                    topBubbles: p.topBubbles || [],
                    slashes: p.slashes || []
                };
            }).filter(post => {
                // Filter out broken posts to avoid empty spaces
                if (post.postType === 'XRAY') {
                    // XRAY needs at least 2 layers (cover + content)
                    return post.media && post.media.length >= 2;
                }
                // Others need at least 1 media item
                return post.media && post.media.length >= 0; // Keeping 0 for text posts if any... wait, query logic...
                // Actually the query doesn't enforce media, but FloatingCard DOES return null if no media.
                // So if we want to avoid gaps, we must filter out anything that FloatingCard returns null for.
                // FloatingCard returns null if !coverUrl && !videoUrl.
                // Let's use length > 0 as a safe baseline for these media-heavy types.
                return post.media && post.media.length > 0;
            });

            if (isLoadMore) {
                setPosts(prev => [...prev, ...transformedPosts]);
            } else {
                setPosts(transformedPosts);
            }

            setHasMore(transformedPosts.length === PAGE_SIZE);
        } catch (e) {
            console.error('Fetch error:', e);
            setPosts([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setPage(0);
        setHasMore(true);
        fetchPosts(currentTab, false);
    }, [currentTab]);

    const loadMore = () => {
        if (!hasMore || loading) return;
        fetchPosts(currentTab, true);
    };





    const performSearch = async (text: string) => {
        try {
            const { data: profileResults } = await supabase
                .from('Profile')
                .select(`userId, displayName, avatarUrl, user:User(name)`)
                .ilike('displayName', `%${text}%`)
                .limit(10);

            const { data: slashResults } = await supabase
                .from('Slash')
                .select('*')
                .ilike('tag', `%${text}%`)
                .ilike('tag', `%${text}%`)
                .limit(5);

            // Search by Profile Code (Exact Match)
            const { data: codeUser } = await supabase
                .from('User')
                .select(`id, name, profileCode, profile:Profile(displayName, avatarUrl)`)
                .eq('profileCode', text.replace('#', '')) // Clean input
                .maybeSingle();

            let results: SearchResult[] = [];

            // Map Slashes
            if (slashResults) {
                results = slashResults.map((s: any) => ({
                    type: 'SLASH',
                    id: s.id,
                    title: `#${s.tag}`,
                    subtitle: `${s.count || 0} posts`,
                    data: s
                }));
            }

            // Get user IDs to check follow status
            const userIds = (profileResults || []).map((p: any) => p.userId).filter((id: string) => id !== currentUserId);

            // Check if current user is following these users (via Subscription table)
            let followingMap: Record<string, boolean> = {};
            if (currentUserId && userIds.length > 0) {
                const { data: subscriptions } = await supabase
                    .from('Subscription')
                    .select('subscribedToId')
                    .eq('subscriberId', currentUserId)
                    .in('subscribedToId', userIds);

                if (subscriptions) {
                    subscriptions.forEach((sub: any) => {
                        followingMap[sub.subscribedToId] = true;
                    });
                }
            }

            // Map Users with follow status
            let mappedUsers: SearchResult[] = (profileResults || []).map((p: any) => ({
                type: 'USER',
                id: p.userId,
                title: p.user?.name || 'Unknown',
                subtitle: `@${p.displayName}`,
                avatar: p.avatarUrl,
                friendshipStatus: followingMap[p.userId] ? 'ACCEPTED' : 'NONE'
            }));

            // Add Profile Code Match if found
            if (codeUser && !mappedUsers.find(u => u.id === codeUser.id)) {
                const profile = Array.isArray(codeUser.profile) ? codeUser.profile[0] : codeUser.profile;
                mappedUsers.unshift({
                    type: 'USER',
                    id: codeUser.id,
                    title: codeUser.name || 'Unknown',
                    subtitle: `#${codeUser.profileCode}`, // Highlight code
                    avatar: profile?.avatarUrl,
                    friendshipStatus: followingMap[codeUser.id] ? 'ACCEPTED' : 'NONE' // Might need check
                });
            }

            if (currentUserId) {
                mappedUsers = mappedUsers.filter(u => u.id !== currentUserId);
            }

            setSearchResults([...results, ...mappedUsers]);
        } catch (e) {
            console.error('Search error:', e);
            setSearchResults([]);
        }
    };

    const handleFollow = async (item: SearchResult) => {
        if (!currentUserId) return;

        // Optimistic UI update
        setSearchResults(prev => prev.map(u => u.id === item.id ? { ...u, friendshipStatus: 'PENDING' } : u));

        try {
            // Direct Supabase Insert
            const { error } = await supabase.from('Subscription').insert({
                subscriberId: currentUserId,
                subscribedToId: item.id
            });

            if (error) {
                // If unique violation, user effectively followed.
                if (error.code !== '23505') {
                    throw error;
                }
            }

            // Success - update UI to show following
            setSearchResults(prev => prev.map(u => u.id === item.id ? { ...u, friendshipStatus: 'ACCEPTED' } : u));
        } catch (error) {
            console.error('Follow error:', error);
            setSearchResults(prev => prev.map(u => u.id === item.id ? { ...u, friendshipStatus: 'NONE' } : u));
            Alert.alert("Error", "Could not follow user");
        }
    };



    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={[styles.header, { zIndex: 101 }]}>
                    <Text style={styles.title}>Explore</Text>
                    <View style={{ flexDirection: 'row', gap: 16 }}>


                        <TouchableOpacity onPress={() => setIsSearching(true)} style={styles.iconButton}>
                            <Search color="white" size={24} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Tabs - Restored to original position below header */}
                <View style={{ paddingBottom: 10 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PADDING, gap: 8 }}>
                        {['Posts', 'Slashes', /* 'Chans', // V2 - hidden for now */ 'Auds', 'Chapters'].map(tab => (
                            <TouchableOpacity
                                key={tab}
                                onPress={() => {
                                    setCurrentTab(tab);
                                    setPosts([]);
                                    setChunkRegistry({});
                                    setLoadedChunks(new Set());
                                    globalOffsetRef.current = 0;
                                    setPage(0);
                                    cachedPostCount = null; // Reset count cache on tab switch
                                }}
                                style={{
                                    paddingHorizontal: 16,
                                    paddingVertical: 8,
                                    borderRadius: 20,
                                    backgroundColor: currentTab === tab ? 'black' : 'rgba(255,255,255,0.1)',
                                    borderWidth: currentTab === tab ? 1 : 0,
                                    borderColor: 'rgba(255,255,255,0.3)'
                                }}
                            >
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>{tab}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Search Overlay */}
                {isSearching && (
                    <BlurView
                        intensity={95}
                        tint="dark"
                        style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}
                    >
                        <SafeAreaView style={{ flex: 1, paddingHorizontal: PADDING }}>
                            <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
                                <Search color={colors.text} size={18} />
                                <TextInput
                                    autoFocus
                                    placeholder="Search users..."
                                    placeholderTextColor={colors.text + '80'}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    style={[styles.searchInput, { color: colors.text }]}
                                />
                                <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQuery(''); setSearchResults([]); }}>
                                    <X color={colors.text} size={20} />
                                </TouchableOpacity>
                            </View>

                            <FlatList
                                data={searchResults}
                                keyExtractor={item => item.id}
                                keyboardShouldPersistTaps="handled"
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.searchResultItem, { backgroundColor: colors.card }]}
                                        onPress={() => {
                                            if (item.type === 'USER') {
                                                setIsSearching(false);
                                                router.push(`/profile/${item.id}` as any);
                                            } else if (item.type === 'SLASH') {
                                                setIsSearching(false);
                                                router.push(`/slash/${item.data?.tag}` as any);
                                            }
                                        }}
                                    >
                                        {item.type === 'USER' ? (
                                            <Image
                                                source={{ uri: item.avatar }}
                                                style={styles.searchAvatar}
                                                cachePolicy="memory-disk"
                                            />
                                        ) : (
                                            <View style={[styles.searchAvatar, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '20' }]}>
                                                <Text style={{ color: colors.text, fontSize: 20, fontWeight: 'bold' }}>#</Text>
                                            </View>
                                        )}
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={[styles.searchName, { color: colors.text }]}>{item.title}</Text>
                                            <Text style={[styles.searchHandle, { color: colors.text + '80' }]}>{item.subtitle}</Text>
                                        </View>
                                        {item.type === 'USER' && item.friendshipStatus !== 'ACCEPTED' && (
                                            <TouchableOpacity
                                                onPress={(e) => { e.stopPropagation(); handleFollow(item); }}
                                                style={[styles.followButton, {
                                                    backgroundColor: item.friendshipStatus === 'PENDING' ? 'rgba(255,255,255,0.2)' : 'white'
                                                }]}
                                            >
                                                <Text style={[styles.followText, {
                                                    color: item.friendshipStatus === 'PENDING' ? 'white' : 'black'
                                                }]}>
                                                    {item.friendshipStatus === 'PENDING' ? 'Requested' : 'Follow'}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                        {item.type === 'USER' && item.friendshipStatus === 'ACCEPTED' && (
                                            <View style={[styles.followButton, { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }]}>
                                                <Text style={[styles.followText, { color: 'rgba(255,255,255,0.7)' }]}>Following</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                )}
                            />
                        </SafeAreaView>
                    </BlurView>
                )}

                {/* Content Area */}
                {currentTab === 'Chans' ? (
                    // Using new aesthetic ChansTab component
                    <ChansTab isActive={isScreenFocused && currentTab === 'Chans'} />
                ) : currentTab === 'Slashes' ? (
                    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16 }}>
                        <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>All Slashes</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                            {allSlashes.map((slash, idx) => (
                                <TouchableOpacity key={idx} style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                                    <Text style={{ color: colors.text, fontWeight: '600' }}>#{slash.tag} <Text style={{ opacity: 0.5 }}>{slash.count}</Text></Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                ) : (
                    // ------------------------------------------------------------------
                    // ------------------ EXISTING SCATTERED MAP UI ---------------------
                    // ------------------------------------------------------------------
                    // ------------------------------------------------------------------
                    // ------------------ 360 INFINITE CANVAS UI ------------------------
                    // ------------------------------------------------------------------
                    <InfiniteCanvas
                        onRegionChange={handleRegionChange}
                        bounds={scrollBounds}
                        initialX={0}
                    >
                        {/* Render ALL loaded chunks - hidden until all assets load, then visible */}
                        {(() => {
                            const seen = new Set<string>();
                            const items: React.ReactNode[] = [];

                            Object.keys(chunkRegistry).forEach(chunkKey => {
                                const posts = chunkRegistry[chunkKey];
                                if (!posts) return;

                                posts.forEach(post => {
                                    if (seen.has(post.id)) return;
                                    seen.add(post.id);

                                    const config = (post as any)._layout;
                                    if (!config) return;

                                    items.push(
                                        <MemoizedFloatingCard
                                            key={post.id}
                                            post={post}
                                            config={config}
                                            index={0}
                                            onPress={() => router.push(`/post/${post.id}` as any)}
                                            onToggleScroll={(enabled) => setScrollEnabled(enabled)}
                                            isActive={isScreenFocused}
                                            shouldPlay={post.id === playingPostId}
                                            shouldRenderVideo={allowedVideoIds.has(post.id)}
                                        />
                                    );
                                });
                            });

                            return items;
                        })()}
                    </InfiniteCanvas>
                )}
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: PADDING,
        paddingVertical: 12,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: 'white',
    },
    avatarButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginTop: 20,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: 'white',
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 16,
        marginBottom: 8,
    },
    searchAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    searchName: {
        fontSize: 16,
        fontWeight: '700',
        color: 'white',
    },
    searchHandle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
    },
    followButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'white',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    followText: {
        fontSize: 12,
        fontWeight: '700',
        color: 'black',
    },
});
