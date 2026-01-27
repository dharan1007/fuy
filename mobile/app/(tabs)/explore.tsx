import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TouchableWithoutFeedback, Image, TextInput, Dimensions, FlatList, Alert, RefreshControl, StyleSheet, Animated } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, X, UserPlus, Check, Clock, Grid, User, Compass, Bell, Zap, Star, Circle, Play, Pause } from 'lucide-react-native';
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
    media: { url: string; type: string; variant?: string }[] | null;
    content: string;
    postType?: string;
    postMedia?: { media: { url: string; type: string; variant?: string } }[];
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
const CARD_CONFIGS = [
    { width: 140, height: 200, top: 10, left: 10, rotate: -2, radius: 16 },
    { width: 120, height: 120, top: 20, left: 160, rotate: 3, radius: 14 },
    { width: 160, height: 220, top: 160, left: 20, rotate: -1, radius: 18 },
    { width: 110, height: 110, top: 150, left: 200, rotate: 4, radius: 12 },
    { width: 130, height: 180, top: 10, left: 300, rotate: -3, radius: 16 },
    { width: 150, height: 190, top: 200, left: 320, rotate: 2, radius: 18 },
    { width: 100, height: 100, top: 20, left: 450, rotate: -2, radius: 12 },
    { width: 140, height: 210, top: 140, left: 480, rotate: 3, radius: 16 },
    { width: 120, height: 160, top: 30, left: 600, rotate: -1, radius: 14 },
    { width: 170, height: 230, top: 200, left: 630, rotate: 1, radius: 20 },
    // More cards vertically
    { width: 140, height: 200, top: 400, left: 40, rotate: 2, radius: 16 },
    { width: 130, height: 160, top: 450, left: 220, rotate: -2, radius: 14 },
    { width: 160, height: 220, top: 410, left: 400, rotate: 1, radius: 18 },
    { width: 120, height: 140, top: 550, left: 600, rotate: -3, radius: 12 },
    { width: 150, height: 210, top: 650, left: 60, rotate: 2, radius: 20 },
    { width: 130, height: 170, top: 620, left: 300, rotate: -1, radius: 16 },
    { width: 180, height: 240, top: 750, left: 500, rotate: 0, radius: 22 },
    // Even more cards to ensure scrolling feel
    { width: 120, height: 150, top: 900, left: 20, rotate: 3, radius: 14 },
    { width: 160, height: 210, top: 950, left: 180, rotate: -2, radius: 18 },
    { width: 140, height: 180, top: 880, left: 380, rotate: 1, radius: 16 },
    { width: 110, height: 110, top: 1000, left: 550, rotate: -1, radius: 12 },
    { width: 150, height: 200, top: 1100, left: 400, rotate: 2, radius: 18 },
    { width: 130, height: 160, top: 1150, left: 700, rotate: -2, radius: 14 },
];

// Fun background elements to fill gaps - DENSE & EVERYWHERE
const DECORATION_CONFIGS = [
    // Top area
    { top: 50, left: 290, type: 'star', size: 24, rotate: 15 },
    { top: 180, left: 440, type: 'circle', size: 18, rotate: 0 },
    { top: 320, left: 150, type: 'zap', size: 32, rotate: -10 },
    { top: 80, left: 740, type: 'star', size: 28, rotate: 45 },

    // Middle area
    { top: 350, left: 500, type: 'circle', size: 20, rotate: 0 },
    { top: 500, left: 360, type: 'zap', size: 36, rotate: 20 },
    { top: 600, left: 180, type: 'star', size: 22, rotate: -15 },
    { top: 700, left: 460, type: 'circle', size: 16, rotate: 0 },
    { top: 550, left: 750, type: 'zap', size: 30, rotate: 5 },

    // New dense filler
    { top: 120, left: 80, type: 'circle', size: 14, rotate: 0 },
    { top: 400, left: 50, type: 'star', size: 18, rotate: 10 },
    { top: 250, left: 600, type: 'zap', size: 22, rotate: -5 },
    { top: 850, left: 100, type: 'circle', size: 24, rotate: 0 },
    { top: 920, left: 600, type: 'star', size: 30, rotate: 20 },
    { top: 1050, left: 300, type: 'zap', size: 28, rotate: 15 },
    { top: 1200, left: 500, type: 'circle', size: 20, rotate: 0 },
    { top: 1300, left: 200, type: 'star', size: 25, rotate: -10 },
    { top: 1100, left: 50, type: 'zap', size: 20, rotate: 5 },
];

const AnimatedDecoration = ({ config, index, customEmoji, isPaused }: { config: typeof DECORATION_CONFIGS[0]; index: number; customEmoji?: string | null; isPaused: boolean }) => {
    const { colors } = useTheme();
    // Wandering animation
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current; // For fade in

    // Safety check for config
    if (!config) return null;

    useEffect(() => {
        // Fade in
        Animated.timing(opacity, {
            toValue: customEmoji ? 0.6 : 0.3,
            duration: 1000,
            useNativeDriver: true
        }).start();

        if (isPaused) {
            translateX.stopAnimation();
            translateY.stopAnimation();
            return;
        }

        // SLOWER Random durations (Increased by ~3x)
        const durationX = 30000 + (index % 7) * 5000;
        const durationY = 35000 + (index % 5) * 5000;
        const range = 150 + (index % 4) * 50;

        // Loop X movement
        Animated.loop(
            Animated.sequence([
                Animated.timing(translateX, {
                    toValue: range,
                    duration: durationX / 2,
                    useNativeDriver: true,
                }),
                Animated.timing(translateX, {
                    toValue: -range,
                    duration: durationX,
                    useNativeDriver: true,
                }),
                Animated.timing(translateX, {
                    toValue: 0,
                    duration: durationX / 2,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Loop Y movement (different timing)
        Animated.loop(
            Animated.sequence([
                Animated.timing(translateY, {
                    toValue: range / 1.5,
                    duration: durationY / 2,
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: -range / 1.5,
                    duration: durationY,
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: durationY / 2,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [isPaused, customEmoji]); // Removed index to prevent re-run on scroll

    return (
        <Animated.View
            style={{
                position: 'absolute',
                top: config.top,
                left: config.left,
                transform: [
                    { translateX },
                    { translateY },
                    { rotate: `${config.rotate}deg` }
                ],
                opacity: opacity
            }}
        >
            {customEmoji === 'FUY_LOGO' ? (
                <Image source={require('../../assets/icon.png')} style={{ width: config.size, height: config.size, resizeMode: 'contain' }} />
            ) : customEmoji ? (
                <Text style={{ fontSize: config.size }}>{customEmoji}</Text>
            ) : (
                <>
                    {config.type === 'star' && <Star size={config.size} color="white" fill="white" />}
                    {config.type === 'circle' && <Circle size={config.size} color="white" fill="white" />}
                    {config.type === 'zap' && <Zap size={config.size} color="white" fill="white" />}
                </>
            )}
        </Animated.View>
    );
};

// ... existing code ...





const CONTENT_WIDTH = 900;
const PATTERN_HEIGHT = 1400; // Height of one cycle of CARD_CONFIGS

// Floating Post Card
// Floating Post Card
const FloatingCard = ({ post, config, index, onPress, onToggleScroll, isActive }: { post: Post; config: typeof CARD_CONFIGS[0]; index: number; onPress: () => void; onToggleScroll: (enabled: boolean) => void; isActive: boolean }) => {
    // Determine media:
    // If XRAY: media[0] is Cover (Image usually), media[1] is Content.
    // If VIDEO: media[0] is Video. Cover might be missing.
    // Card always navigates on tap, videos autoplay muted when active

    const [slashesModalVisible, setSlashesModalVisible] = React.useState(false);
    const { colors } = useTheme();

    let coverUrl: string | null = null;
    let videoUrl: string | null = null;
    let contentUrl: string | null = null;
    let coverType: string = 'IMAGE';
    let contentType: string = 'IMAGE';

    if (post.postType === 'XRAY' && post.media && post.media.length >= 2) {
        // Intelligent Media Assignment - SWAPPED
        let cover = post.media.find(m => m.variant === 'xray-bottom' || (m as any).variant === 'xray-bottom');
        let content = post.media.find(m => m.variant === 'xray-top' || (m as any).variant === 'xray-top');

        if (!cover || !content) {
            cover = post.media[0];
            content = post.media[1];
        }

        if (cover && content) {
            coverUrl = cover.url;
            contentUrl = content.url;
            coverType = cover.type || 'IMAGE';
            contentType = content.type || 'IMAGE';
        }
    } else if (post.media && post.media.length > 0) {
        const item = post.media[0];
        if (item.type?.toUpperCase() === 'VIDEO') {
            videoUrl = item.url;
            // Try to find an image in other media? Or assume no cover.
            const img = post.media.find(m => m.type?.toUpperCase() === 'IMAGE');
            if (img) coverUrl = img.url;
        } else {
            coverUrl = item.url;
        }
    }

    // Fallback: If no media, return null
    if (!coverUrl && !videoUrl) return null;

    const userAvatar = post.user?.profile?.avatarUrl;
    const userName = post.user?.profile?.displayName || post.user?.name || 'User';

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
                {/* Media Layer - Tap to Navigate */}
                <TouchableWithoutFeedback onPress={onPress}>
                    <View style={{ flex: 1 }}>
                        {(() => {
                            // CASE 1: Active Card -> Play Video if available
                            if (isActive && videoUrl && videoUrl.length > 5) {
                                return (
                                    <Video
                                        source={{ uri: videoUrl }}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode={ResizeMode.COVER}
                                        shouldPlay={true}
                                        isLooping
                                        isMuted={true}
                                        useNativeControls={false}
                                        onError={(e) => console.log("Video Error Explore:", e)}
                                    />
                                );
                            }

                            // CASE 2: Inactive separate Cover Image
                            if (coverUrl) {
                                return (
                                    <Image
                                        source={{ uri: coverUrl }}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="cover"
                                    />
                                );
                            }

                            // CASE 3: Inactive & No Cover -> Render Video Paused (for thumbnail)
                            if (videoUrl) {
                                return (
                                    <Video
                                        source={{ uri: videoUrl }}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode={ResizeMode.COVER}
                                        shouldPlay={false}
                                        isMuted={true}
                                        useNativeControls={false}
                                    />
                                );
                            }

                            // CASE 4: Truly no media -> Placeholder
                            return (
                                <View style={{ width: '100%', height: '100%', backgroundColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' }}>
                                    <Play size={32} color="rgba(255,255,255,0.3)" />
                                </View>
                            );

                            // CASE 4: No Media (handled by validation, but safe fallback)
                            return <View className="bg-zinc-800 w-full h-full" />;
                        })()}
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
                            {/* Gradient overlay - Removed Text as per request, kept interactive area */}
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
                                    {bubble.mediaType === 'VIDEO' ? (
                                        <Video
                                            source={{ uri: bubble.mediaUrl }}
                                            style={{ width: '100%', height: '100%' }}
                                            resizeMode={ResizeMode.COVER}
                                            shouldPlay={isActive}
                                            isLooping
                                            isMuted={true}
                                        />
                                    ) : (
                                        <Image source={{ uri: bubble.mediaUrl }} style={{ width: '100%', height: '100%' }} />
                                    )}
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
    return prev.isActive === next.isActive && prev.post.id === next.post.id && prev.index === next.index;
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
    const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);
    const [isScreenFocused, setIsScreenFocused] = useState(true);
    const [scrollEnabled, setScrollEnabled] = useState(true);

    // 360 Infinite Scroll State
    const [chunkRegistry, setChunkRegistry] = useState<Record<string, Post[]>>({});
    const [loadedChunks, setLoadedChunks] = useState<Set<string>>(new Set());
    const fetchingRefs = useRef<Set<string>>(new Set()); // Instant Ref for in-flight requests
    const CHUNK_SIZE = 1000;
    const globalPageRef = useRef(0);

    const handleRegionChange = useCallback((region: { x: number, y: number, width: number, height: number }) => {
        // Calculate visible chunks
        const startX = Math.floor(region.x / CHUNK_SIZE);
        const endX = Math.floor((region.x + region.width) / CHUNK_SIZE);
        const startY = Math.floor(region.y / CHUNK_SIZE);
        const endY = Math.floor((region.y + region.height) / CHUNK_SIZE);

        // Add Buffer (Prefetching) - Load 1 chunk in every direction
        const BUFFER = 1;

        for (let x = startX - BUFFER; x <= endX + BUFFER; x++) {
            for (let y = startY - BUFFER; y <= endY + BUFFER; y++) {
                const key = `${x},${y}`;
                // Check Ref immediately to avoid async state delay
                if (!loadedChunks.has(key) && !fetchingRefs.current.has(key)) {
                    fetchChunk(x, y);
                }
            }
        }
    }, [loadedChunks]);

    const fetchChunk = async (chunkX: number, chunkY: number) => {
        // Generate bg elements for this chunk regardless of posts
        generateDecorationsForChunk(chunkX, chunkY);

        const key = `${chunkX},${chunkY}`;

        // Double check
        if (loadedChunks.has(key) || fetchingRefs.current.has(key)) return;

        // Mark as fetching
        fetchingRefs.current.add(key);

        try {
            const page = globalPageRef.current;
            globalPageRef.current += 1; // Increment for next chunk

            // Default fetch logic similar to fetchPosts but for chunks
            const { data, error } = await supabase
                .from('Post')
                .select(`
                    id, content, postType,
                    user:User(name, profile:Profile(displayName, avatarUrl)),
                    postMedia:PostMedia(media:Media(url, type, variant)),
                    topBubbles:ReactionBubble(mediaUrl, mediaType),
                    slashes:Slash(tag)
                `)
                .eq('visibility', 'PUBLIC')
                .in('postType', ['XRAY', 'LILL', 'FILL', 'CHAPTER']) // Same as Posts tab
                .order('createdAt', { ascending: false })
                .range(page * 15, (page + 1) * 15 - 1);

            if (error) {
                console.error('[Explore] Supabase error:', error);
                return;
            }

            if (data && data.length > 0) {
                const transformed: Post[] = data.map((p: any) => ({
                    id: p.id,
                    content: p.content || '',
                    postType: p.postType,
                    media: (p.postMedia || []).map((pm: any) => pm.media).filter(Boolean),
                    chanData: null,
                    postMedia: p.postMedia,
                    user: Array.isArray(p.user) ? p.user[0] : p.user,
                    topBubbles: p.topBubbles || [],
                    slashes: p.slashes || []
                })).filter(post => post.media && post.media.length > 0);

                // Better approach: Calculate layouts first
                const placedRects: { x: number, y: number, width: number, height: number }[] = [];
                const layoutedPosts = transformed.map((post, index) => {
                    let attempts = 0;
                    let validConfig = null;
                    const width = 140 + Math.random() * 40;
                    const height = 200 + Math.random() * 50;
                    const padding = 40; // Increased padding

                    // 1. Try Random Placement
                    while (attempts < 200) {
                        const innerX = Math.random() * (CHUNK_SIZE - width - padding); // Keep well inside
                        const innerY = Math.random() * (CHUNK_SIZE - height - padding);

                        const candidate = {
                            x: innerX,
                            y: innerY,
                            width,
                            height
                        };

                        // Check collision with already placed in this chunk
                        const hasCollision = placedRects.some(r => {
                            return (
                                candidate.x < r.x + r.width + padding &&
                                candidate.x + candidate.width + padding > r.x &&
                                candidate.y < r.y + r.height + padding &&
                                candidate.y + candidate.height + padding > r.y
                            );
                        });

                        if (!hasCollision) {
                            validConfig = {
                                top: chunkY * CHUNK_SIZE + innerY,
                                left: chunkX * CHUNK_SIZE + innerX,
                                width,
                                height,
                                rotate: (Math.random() - 0.5) * 10,
                                radius: 16
                            };
                            placedRects.push(candidate);
                            break;
                        }
                        attempts++;
                    }

                    // 2. Fallback: Grid Placement (if random fails)
                    if (!validConfig) {
                        const cols = 4;
                        const rows = 4;
                        const slotWidth = CHUNK_SIZE / cols;
                        const slotHeight = CHUNK_SIZE / rows;

                        for (let r = 0; r < rows; r++) {
                            for (let c = 0; c < cols; c++) {
                                const slotX = c * slotWidth + 20;
                                const slotY = r * slotHeight + 20;

                                const candidate = { x: slotX, y: slotY, width, height };

                                const hasCollision = placedRects.some(rect => {
                                    return (
                                        candidate.x < rect.x + rect.width + 10 &&
                                        candidate.x + candidate.width + 10 > rect.x &&
                                        candidate.y < rect.y + rect.height + 10 &&
                                        candidate.y + candidate.height + 10 > rect.y
                                    );
                                });

                                if (!hasCollision) {
                                    validConfig = {
                                        top: chunkY * CHUNK_SIZE + slotY,
                                        left: chunkX * CHUNK_SIZE + slotX,
                                        width,
                                        height,
                                        rotate: 0,
                                        radius: 16
                                    };
                                    placedRects.push(candidate);
                                    break;
                                }
                            }
                            if (validConfig) break;
                        }
                    }

                    if (!validConfig) return null;

                    return {
                        ...post,
                        _layout: validConfig
                    } as Post & { _layout: any };
                }).filter(Boolean) as (Post & { _layout: any })[];

                setChunkRegistry(prev => ({
                    ...prev,
                    [key]: layoutedPosts
                }));
                // Mark loaded in state
                setLoadedChunks(prev => new Set(prev).add(key));
            }
        } catch (e) {
            console.error('[Explore] Chunk fetch error:', e);
        } finally {
            // Remove from fetching lock regardless of success, to allow retry if logic permits
            // But since we setLoadedChunks on success, we check that. 
            // If failed, we remove so we can retry.
            fetchingRefs.current.delete(key);
        }
    };

    // Emoji/Background State
    const [activeEmojis, setActiveEmojis] = useState<string[]>(['FUY_LOGO']); // Default to Logo
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [customEmojiText, setCustomEmojiText] = useState(''); // Text Input State
    const [decorationsRegistry, setDecorationsRegistry] = useState<Record<string, { id: string, x: number, y: number, size: number, rotate: number, variantIndex: number }[]>>({});

    const EMOJI_OPTIONS = ['FUY_LOGO', '✨', '🔥', '💧', '🍀', '🚀', '👾', '💎', '🌙', '🦋', '❤️', '☁️', '🌸', '⚡', '🎵', '👻'];

    const toggleEmoji = (emoji: string) => {
        setActiveEmojis(prev => {
            if (prev.includes(emoji)) {
                return prev.filter(e => e !== emoji);
            }
            if (prev.length >= 5) {
                Alert.alert("Limit Reached", "You can only select up to 5 emojis.");
                return prev;
            }
            return [...prev, emoji];
        });
    };



    // Generate Decoration for Chunk
    const generateDecorationsForChunk = (chunkX: number, chunkY: number) => {
        const key = `${chunkX},${chunkY}`;
        if (decorationsRegistry[key]) return;

        const newDecorations = [];
        // Dense: 5-8 decorations per chunk
        const count = 5 + Math.floor(Math.random() * 4);

        for (let i = 0; i < count; i++) {
            newDecorations.push({
                id: Math.random().toString(36).substr(2, 9),
                x: chunkX * CHUNK_SIZE + Math.random() * CHUNK_SIZE,
                y: chunkY * CHUNK_SIZE + Math.random() * CHUNK_SIZE,
                size: 16 + Math.random() * 24,
                rotate: Math.random() * 360,
                variantIndex: Math.floor(Math.random() * 50) // Random index to map to selected emojis later
            });
        }

        setDecorationsRegistry(prev => ({ ...prev, [key]: newDecorations }));
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
            const transformedPosts: Post[] = (data || []).map((p: any) => ({
                id: p.id,
                content: p.content || '',
                postType: p.postType,
                media: (p.postMedia || []).map((pm: any) => pm.media).filter(Boolean),
                chanData: Array.isArray(p.chan_data) ? p.chan_data[0] : p.chan_data,
                postMedia: p.postMedia,
                user: Array.isArray(p.user) ? p.user[0] : p.user, // Safely unwrap user
                topBubbles: p.topBubbles || [],
                slashes: p.slashes || []
            })).filter(post => {
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
            // Get auth token for API call
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                Alert.alert("Error", "Not authenticated");
                setSearchResults(prev => prev.map(u => u.id === item.id ? { ...u, friendshipStatus: 'NONE' } : u));
                return;
            }

            // Use API endpoint instead of direct Supabase access
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://www.fuymedia.org'}/api/users/follow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ targetUserId: item.id })
            });

            const result = await response.json();

            if (!response.ok) {
                console.error('Follow error:', result);
                setSearchResults(prev => prev.map(u => u.id === item.id ? { ...u, friendshipStatus: 'NONE' } : u));
                Alert.alert("Error", result.error || "Could not follow user");
                return;
            }

            // Success - update UI to show following
            setSearchResults(prev => prev.map(u => u.id === item.id ? { ...u, friendshipStatus: 'ACCEPTED' } : u));
        } catch (error) {
            console.error('Follow error:', error);
            setSearchResults(prev => prev.map(u => u.id === item.id ? { ...u, friendshipStatus: 'NONE' } : u));
            Alert.alert("Error", "Could not follow user");
        }
    };

    // Calculate total content height for scrolling
    const contentHeight = Math.max(...CARD_CONFIGS.map(c => c.top + c.height)) + 150;

    // Detect closest card
    useEffect(() => {
        // Debounce slightly to prevent rapid switching during fast scrolls
        const timer = setTimeout(() => {
            let minDesc = Infinity;
            let closestIndex = -1;

            const viewportCx = scrollX + width / 2;
            const viewportCy = scrollY + height / 2;

            CARD_CONFIGS.forEach((config, idx) => {
                const cardCx = config.left + config.width / 2;
                const cardCy = config.top + config.height / 2;

                // Euclidean distance
                const dist = Math.hypot(cardCx - viewportCx, cardCy - viewportCy);
                if (dist < minDesc) {
                    minDesc = dist;
                    closestIndex = idx;
                }
            });

            // "Confusion" fix: Only switch if the new card is significantly closer or the current one is far away
            // Actually, for a single active item, shortest distance is robust enough.
            // The issue might be multiple videos loading.
            // We optimize by strictly setting ONE active index.

            if (minDesc < 250) { // Tighter activation radius
                setActiveCardIndex(closestIndex);
            } else {
                setActiveCardIndex(null);
            }
        }, 50); // 50ms trailing debounce

        return () => clearTimeout(timer);
    }, [scrollX, scrollY]);

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={[styles.header, { zIndex: 101 }]}>
                    <Text style={styles.title}>Explore</Text>
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                        {/* Decoration Picker Toggle */}
                        {currentTab === 'Posts' && (
                            <TouchableOpacity
                                onPress={() => setIsEmojiPickerOpen(prev => !prev)}
                                style={{
                                    width: 40, height: 40, borderRadius: 20,
                                    backgroundColor: activeEmojis.length > 0 ? 'black' : 'rgba(0,0,0,0.5)',
                                    alignItems: 'center', justifyContent: 'center',
                                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
                                    overflow: 'hidden'
                                }}
                            >
                                {activeEmojis.length > 0 ? (
                                    activeEmojis[0] === 'FUY_LOGO' ? (
                                        <Image source={require('../../assets/icon.png')} style={{ width: 24, height: 24, borderRadius: 12 }} />
                                    ) : (
                                        <Text style={{ fontSize: 20 }}>{activeEmojis[0]}</Text>
                                    )
                                ) : (
                                    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}><Zap size={16} color="white" /></View>
                                )}
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity onPress={() => setIsSearching(true)} style={styles.iconButton}>
                            <Search color="white" size={24} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Tabs - Restored to original position below header */}
                <View style={{ paddingBottom: 10 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PADDING, gap: 8 }}>
                        {['Posts', 'Slashes', 'Chans', 'Auds', 'Chapters'].map(tab => (
                            <TouchableOpacity
                                key={tab}
                                onPress={() => {
                                    setCurrentTab(tab);
                                    setPosts([]);
                                    setChunkRegistry({});
                                    setLoadedChunks(new Set());
                                    globalPageRef.current = 0;
                                    setPage(0);
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
                    <InfiniteCanvas onRegionChange={handleRegionChange}>
                        {/* Render Background Decorations */}
                        {Object.values(decorationsRegistry).flat().map((dec) => {
                            // Pick emoji based on variantIndex and activeEmojis
                            // Pick emoji based on variantIndex and activeEmojis - GUARD against empty array
                            if (!activeEmojis || activeEmojis.length === 0) return null;
                            const emoji = activeEmojis[dec.variantIndex % activeEmojis.length];

                            return (
                                <AnimatedDecoration
                                    key={dec.id}
                                    config={{ top: dec.y, left: dec.x, type: 'custom', size: dec.size, rotate: dec.rotate } as any}
                                    index={dec.variantIndex}
                                    customEmoji={emoji}
                                    isPaused={false}
                                />
                            );
                        })}

                        {Object.values(chunkRegistry).flat().map((post) => {
                            // Use the layout stored on the post object
                            const config = (post as any)._layout;
                            if (!config) return null;

                            return (
                                <MemoizedFloatingCard
                                    key={post.id}
                                    post={post}
                                    config={config}
                                    index={0}
                                    onPress={() => router.push(`/post/${post.id}/similar` as any)}
                                    onToggleScroll={() => { }}
                                    isActive={false}
                                />
                            );
                        })}

                        {/* Add some random background elements based on chunks too? For now, simple fixed ones might be lost in infinite space. */}
                    </InfiniteCanvas>
                )}

                {/* Aesthetic Emoji Picker Overlay - Rendered LAST for Z-Index */}
                {isEmojiPickerOpen && (
                    <TouchableWithoutFeedback onPress={() => setIsEmojiPickerOpen(false)}>
                        <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]}>
                            <BlurView intensity={30} tint="dark" style={[StyleSheet.absoluteFill]} />
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <TouchableWithoutFeedback>
                                    <View style={{
                                        width: '85%',
                                        backgroundColor: 'rgba(20,20,20,0.95)',
                                        borderRadius: 32,
                                        padding: 24,
                                        borderWidth: 1,
                                        borderColor: 'rgba(255,255,255,0.1)',
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 10 },
                                        shadowOpacity: 0.5,
                                        shadowRadius: 20,
                                        elevation: 10
                                    }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                            <View>
                                                <Text style={{ color: 'white', fontSize: 20, fontWeight: '700' }}>Atmosphere</Text>
                                                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 }}>Select up to 5 vibes or type your own</Text>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => setIsEmojiPickerOpen(false)}
                                                style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 8 }}
                                            >
                                                <X size={20} color="white" />
                                            </TouchableOpacity>
                                        </View>

                                        {/* Current Pattern Display & Reset */}
                                        <View style={{ marginBottom: 20 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>Current Vibe</Text>
                                                {activeEmojis.length > 0 && (
                                                    <TouchableOpacity onPress={() => setActiveEmojis(['FUY_LOGO'])}>
                                                        <Text style={{ color: '#FF4B4B', fontSize: 13, fontWeight: '600' }}>Reset Default</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, minHeight: 40, alignItems: 'center' }}>
                                                {activeEmojis.length === 0 ? (
                                                    <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, fontStyle: 'italic' }}>No vibes selected...</Text>
                                                ) : (
                                                    activeEmojis.map((emoji, idx) => (
                                                        <TouchableOpacity
                                                            key={`${emoji}-${idx}`}
                                                            onPress={() => toggleEmoji(emoji)}
                                                            style={{
                                                                flexDirection: 'row', alignItems: 'center',
                                                                backgroundColor: 'rgba(255,255,255,0.1)',
                                                                paddingVertical: 6, paddingHorizontal: 12,
                                                                borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
                                                            }}
                                                        >
                                                            {emoji === 'FUY_LOGO' ? (
                                                                <Image source={require('../../assets/icon.png')} style={{ width: 16, height: 16, marginRight: 6 }} />
                                                            ) : (
                                                                <Text style={{ fontSize: 16, marginRight: 6 }}>{emoji}</Text>
                                                            )}
                                                            <X size={12} color="rgba(255,255,255,0.5)" />
                                                        </TouchableOpacity>
                                                    ))
                                                )}
                                                {activeEmojis.length > 0 && (
                                                    <TouchableOpacity onPress={() => setActiveEmojis([])} style={{ marginLeft: 4 }}>
                                                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Clear All</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>

                                        {/* Custom Input */}
                                        <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                                            <TextInput
                                                placeholder="Type custom emoji..."
                                                placeholderTextColor="rgba(255,255,255,0.5)"
                                                value={customEmojiText}
                                                onChangeText={setCustomEmojiText}
                                                maxLength={4}
                                                style={{
                                                    flex: 1,
                                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                                    borderRadius: 12,
                                                    paddingHorizontal: 16,
                                                    color: 'white',
                                                    height: 44,
                                                    fontSize: 16
                                                }}
                                            />
                                            <TouchableOpacity
                                                onPress={() => {
                                                    if (customEmojiText.trim()) {
                                                        toggleEmoji(customEmojiText.trim());
                                                        setCustomEmojiText('');
                                                    }
                                                }}
                                                style={{
                                                    marginLeft: 10,
                                                    width: 44,
                                                    height: 44,
                                                    backgroundColor: 'white',
                                                    borderRadius: 12,
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <Check color="black" size={20} />
                                            </TouchableOpacity>
                                        </View>

                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                                            {EMOJI_OPTIONS.map(emoji => {
                                                const isActive = activeEmojis.includes(emoji);
                                                return (
                                                    <TouchableOpacity
                                                        key={emoji}
                                                        onPress={() => toggleEmoji(emoji)}
                                                        activeOpacity={0.7}
                                                        style={{
                                                            width: 50, height: 50, borderRadius: 25,
                                                            backgroundColor: isActive ? 'white' : 'rgba(255,255,255,0.05)',
                                                            alignItems: 'center', justifyContent: 'center',
                                                            borderWidth: 1,
                                                            borderColor: isActive ? 'white' : 'rgba(255,255,255,0.1)',
                                                            transform: [{ scale: isActive ? 1.1 : 1 }]
                                                        }}
                                                    >
                                                        {emoji === 'FUY_LOGO' ? (
                                                            <Image source={require('../../assets/icon.png')} style={{ width: 30, height: 30 }} resizeMode="contain" />
                                                        ) : (
                                                            <Text style={{ fontSize: 24 }}>{emoji}</Text>
                                                        )}
                                                    </TouchableOpacity>
                                                )
                                            })}
                                        </View>

                                        <View style={{ marginTop: 24, alignItems: 'center' }}>
                                            <LinearGradient
                                                colors={activeEmojis.length > 0 ? ['#00C6FF', '#0072FF'] : ['#333', '#333']}
                                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                                style={{ borderRadius: 24, width: '100%' }}
                                            >
                                                <TouchableOpacity
                                                    onPress={() => setIsEmojiPickerOpen(false)}
                                                    style={{ paddingVertical: 14, alignItems: 'center' }}
                                                >
                                                    <Text style={{ color: activeEmojis.length > 0 ? 'white' : 'rgba(255,255,255,0.3)', fontWeight: 'bold', fontSize: 16 }}>
                                                        Set Vibe ({activeEmojis.length}/5)
                                                    </Text>
                                                </TouchableOpacity>
                                            </LinearGradient>
                                        </View>
                                    </View>
                                </TouchableWithoutFeedback>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                )}

                {/* Bottom Navigation Bar removed - handled by _layout.tsx */}
            </SafeAreaView>
        </View >
    );
}

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
    },
    followText: {
        fontSize: 12,
        fontWeight: '700',
        color: 'black',
    },
    // Bottom nav styles removed
});
