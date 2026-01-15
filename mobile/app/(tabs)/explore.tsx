import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TouchableWithoutFeedback, Image, TextInput, Dimensions, FlatList, Alert, RefreshControl, StyleSheet, Animated } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, X, UserPlus, Check, Clock, Grid, User, Compass, Bell, Zap, Star, Circle, Play, Pause } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useFocusEffect as useNavFocusEffect } from '@react-navigation/native';
import { getSafetyFilters, applySafetyFilters } from '../../services/SafetyService';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import XrayScratch from '../../components/XrayScratch';

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
    }, [isPaused, customEmoji]);

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
            {customEmoji ? (
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



const CONTENT_WIDTH = 900;
const CONTENT_HEIGHT = 2000;

// Floating Post Card
// Floating Post Card
const FloatingCard = ({ post, config, index, onPress, onToggleScroll, isActive }: { post: Post; config: typeof CARD_CONFIGS[0]; index: number; onPress: () => void; onToggleScroll: (enabled: boolean) => void; isActive: boolean }) => {
    // Determine media:
    // If XRAY: media[0] is Cover (Image usually), media[1] is Content.
    // If VIDEO: media[0] is Video. Cover might be missing.
    // Card always navigates on tap, videos autoplay muted when active

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
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentTab, setCurrentTab] = useState('Posts'); // Default to Posts
    const [scrollX, setScrollX] = useState(0);
    const [scrollY, setScrollY] = useState(0);
    const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);
    const [isScreenFocused, setIsScreenFocused] = useState(true);
    const [scrollEnabled, setScrollEnabled] = useState(true);

    // Emoji/Background State
    const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [isBackgroundPaused, setIsBackgroundPaused] = useState(false);
    const [customEmojiText, setCustomEmojiText] = useState('');
    const EMOJI_OPTIONS = ['✨', '🔥', '💧', '🍀', '🚀', '👾', '💎', '🌙', '🦋', '❤️'];

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

    const fetchPosts = async (tab = 'ALL') => {
        try {
            // --- Safety Filtering ---
            // --- Safety Filtering ---
            // Get current user directly to avoid race condition
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id;

            let filters = { excludedUserIds: [], hiddenPostIds: [] };
            if (userId) {
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
            )
            `)
                .eq('visibility', 'PUBLIC')
                .order('createdAt', { ascending: false })
                .limit(20);

            // Apply safety filters
            if (userId) {
                query = applySafetyFilters(query, filters);
            }

            // Map tabs to PostTypes

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
                topBubbles: p.topBubbles || []
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

            setPosts(transformedPosts);
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
        fetchPosts(currentTab); // Fix: Pass current tab
    }, [currentTab]); // Add dependency



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
                {/* Header - Removed Profile Circle as requested */}
                <View style={[styles.header, { paddingRight: 20 }]}>
                    <TouchableOpacity
                        onPress={() => setIsSearching(true)}
                        style={[styles.iconButton, { backgroundColor: colors.card }]}
                    >
                        <Search color={colors.text} size={20} />
                    </TouchableOpacity>
                    {/* Tabs - Smaller sizing */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 36, marginBottom: 8 }} contentContainerStyle={{ paddingHorizontal: PADDING, gap: 6 }}>
                        {['Posts', 'Slashes', 'Chans', 'Auds', 'Chapters', 'sixts', 'Puds'].map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                onPress={() => setCurrentTab(tab)}
                                style={{
                                    paddingHorizontal: 10, // Reduced from 12
                                    paddingVertical: 5,   // Reduced from 6
                                    borderRadius: 10,
                                    backgroundColor: currentTab === tab ? 'white' : 'rgba(255,255,255,0.08)',
                                    borderWidth: 0.5,
                                    borderColor: currentTab === tab ? 'white' : 'rgba(255,255,255,0.15)'
                                }}
                            >
                                <Text style={{
                                    color: currentTab === tab ? 'black' : 'rgba(255,255,255,0.7)',
                                    fontWeight: '600',
                                    fontSize: 10, // Reduced from 11
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5
                                }}>
                                    {tab}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Background Settings Toggle */}
                <View style={{ position: 'absolute', top: 120, right: 20, zIndex: 100, alignItems: 'flex-end' }}>
                    <TouchableOpacity
                        onPress={() => setIsEmojiPickerOpen(prev => !prev)}
                        style={{
                            width: 40, height: 40, borderRadius: 20,
                            backgroundColor: colors.card,
                            justifyContent: 'center', alignItems: 'center',
                            borderWidth: 1, borderColor: colors.border,
                            shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5
                        }}
                    >
                        <Zap color={colors.text} size={20} fill={selectedEmoji ? "none" : colors.text} />
                    </TouchableOpacity>

                    {isEmojiPickerOpen && (
                        <View style={{ marginTop: 10, backgroundColor: colors.card, borderRadius: 16, padding: 12, width: 220, borderWidth: 1, borderColor: colors.border }}>
                            {/* Header Info */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8 }}>
                                <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.text, alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
                                    <Text style={{ color: colors.text, fontSize: 10, fontWeight: 'bold' }}>i</Text>
                                </View>
                                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>Background Effects</Text>
                            </View>

                            {/* Pause Toggle */}
                            <TouchableOpacity
                                onPress={() => setIsBackgroundPaused(prev => !prev)}
                                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: colors.background, padding: 8, borderRadius: 8 }}
                            >
                                {isBackgroundPaused ? <Play size={16} color={colors.text} /> : <Pause size={16} color={colors.text} />}
                                <Text style={{ color: colors.text, marginLeft: 8, fontSize: 13 }}>{isBackgroundPaused ? "Resume Animation" : "Pause Animation"}</Text>
                            </TouchableOpacity>

                            {/* Custom Emoji Input */}
                            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                                <TextInput
                                    placeholder="Add emoji..."
                                    placeholderTextColor={colors.text + '80'}
                                    value={customEmojiText}
                                    onChangeText={setCustomEmojiText}
                                    maxLength={2}
                                    style={{ flex: 1, backgroundColor: colors.background, color: colors.text, borderRadius: 6, paddingHorizontal: 8, height: 36, fontSize: 16 }}
                                />
                                <TouchableOpacity
                                    onPress={() => { if (customEmojiText) { setSelectedEmoji(customEmojiText); setCustomEmojiText(''); } }}
                                    style={{ marginLeft: 8, backgroundColor: colors.primary, borderRadius: 6, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <Check color="white" size={16} />
                                </TouchableOpacity>
                            </View>

                            {/* Presets */}
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                                <TouchableOpacity onPress={() => setSelectedEmoji(null)} style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.text, alignItems: 'center', justifyContent: 'center', backgroundColor: !selectedEmoji ? colors.primary + '20' : 'transparent' }}>
                                    <Zap size={14} color={colors.text} />
                                </TouchableOpacity>
                                {EMOJI_OPTIONS.map(emoji => (
                                    <TouchableOpacity key={emoji} onPress={() => setSelectedEmoji(emoji)} style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: selectedEmoji === emoji ? colors.primary + '20' : 'transparent', borderRadius: 15 }}>
                                        <Text style={{ fontSize: 18 }}>{emoji}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
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
                    // ------------------------------------------------------------------
                    // ------------------ SPECIALIZED CHANS UI (NETFLIX STYLE) ----------
                    // ------------------------------------------------------------------
                    <ScrollView
                        style={{ flex: 1, backgroundColor: colors.background }}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
                    >
                        {/* Hero Section */}
                        {posts.length > 0 && (
                            <View style={{ height: 500, marginBottom: 24 }}>
                                <Image
                                    source={{ uri: posts[0].chanData?.coverImageUrl || posts[0].user?.profile?.avatarUrl || posts[0].media?.[0]?.url || 'https://via.placeholder.com/500' }}
                                    style={{ width: '100%', height: '100%', opacity: 0.7 }}
                                    resizeMode="cover"
                                />
                                <LinearGradient
                                    colors={['transparent', colors.background]}
                                    style={StyleSheet.absoluteFill}
                                />
                                <View style={{ position: 'absolute', bottom: 40, left: 20, right: 20 }}>
                                    <Text style={{ color: colors.text, fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>
                                        Featured Channel
                                    </Text>
                                    <Text style={{ color: colors.text, fontSize: 42, fontWeight: '900', marginBottom: 16 }}>
                                        {posts[0].chanData?.channelName || 'Untitled Channel'}
                                    </Text>
                                    <Text style={{ color: colors.text + 'CC', fontSize: 14, marginBottom: 24, lineHeight: 20 }} numberOfLines={2}>
                                        {posts[0].chanData?.description || posts[0].content}
                                    </Text>
                                    <TouchableOpacity
                                        style={{ backgroundColor: colors.text, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, alignSelf: 'flex-start' }}
                                        onPress={() => {
                                            if (posts[0].chanData?.id) {
                                                router.push(`/chan/${posts[0].chanData.id}` as any);
                                            } else {
                                                router.push(`/post/${posts[0].id}` as any);
                                            }
                                        }}
                                    >
                                        <Text style={{ color: colors.background, fontWeight: 'bold', marginRight: 8 }}>WATCH NOW</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Section: Trending Channels */}
                        <View style={{ marginBottom: 32 }}>
                            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginLeft: 20, marginBottom: 16 }}>Trending Channels</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
                                {posts.slice(1).map((post) => (
                                    <TouchableOpacity
                                        key={post.id}
                                        style={{ width: 160 }}
                                        onPress={() => {
                                            if (post.chanData?.id) {
                                                router.push(`/chan/${post.chanData.id}` as any);
                                            } else {
                                                router.push(`/post/${post.id}` as any);
                                            }
                                        }}
                                    >
                                        <Image
                                            source={{ uri: post.chanData?.coverImageUrl || post.user?.profile?.avatarUrl || post.media?.[0]?.url || 'https://via.placeholder.com/150' }}
                                            style={{ width: 160, height: 220, borderRadius: 12, marginBottom: 8, backgroundColor: colors.card }}
                                        />
                                        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{post.chanData?.channelName || 'Channel'}</Text>
                                        <Text style={{ color: colors.text + '80', fontSize: 12 }} numberOfLines={1}>324 Episodes</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Section: New Shows */}
                        <View style={{ marginBottom: 32 }}>
                            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginLeft: 20, marginBottom: 16 }}>New Shows</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
                                {[...posts].reverse().map((post) => (
                                    <TouchableOpacity
                                        key={post.id}
                                        style={{ width: 280 }}
                                        onPress={() => {
                                            if (post.chanData?.id) {
                                                router.push(`/chan/${post.chanData.id}` as any);
                                            } else {
                                                router.push(`/post/${post.id}` as any);
                                            }
                                        }}
                                    >
                                        <Image
                                            source={{ uri: post.chanData?.coverImageUrl || post.user?.profile?.avatarUrl || post.media?.[0]?.url || 'https://via.placeholder.com/300' }}
                                            style={{ width: 280, height: 160, borderRadius: 12, marginBottom: 8, backgroundColor: colors.card }}
                                        />
                                        <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }} numberOfLines={1}>{post.chanData?.channelName || post.content.substring(0, 20)}</Text>
                                        <Text style={{ color: colors.text + '60', fontSize: 13 }} numberOfLines={1}>{post.chanData?.description || 'Exclusive Content'}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Episodes section removed */}
                    </ScrollView>
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
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ minHeight: '100%' }}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="white" />}
                        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
                        scrollEventThrottle={100}
                        scrollEnabled={scrollEnabled}
                    >
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ width: CONTENT_WIDTH, height: CONTENT_HEIGHT }}
                            onScroll={(e) => setScrollX(e.nativeEvent.contentOffset.x)}
                            scrollEventThrottle={100}
                            scrollEnabled={scrollEnabled}
                        >
                            <View style={{ width: CONTENT_WIDTH, height: CONTENT_HEIGHT }}>
                                {/* Render Animated Decorations (Background) - Virtualized */}
                                {DECORATION_CONFIGS.map((deco, i) => {
                                    // Optimization: Don't render animations if screen is not focused
                                    if (!isScreenFocused) return null;

                                    // Simple virtualization for bg elements too
                                    const viewportCx = scrollX + width / 2;
                                    const viewportCy = scrollY + height / 2;
                                    const dist = Math.hypot(deco.left - viewportCx, deco.top - viewportCy);

                                    // Tighter buffer (1200px -> 800px) to save memory
                                    if (dist > 800) return null;

                                    return <AnimatedDecoration key={`deco-${i}`} config={deco} index={i} customEmoji={selectedEmoji} isPaused={isBackgroundPaused} />;
                                })}

                                {/* Render Posts - Strict Virtualization */}
                                {posts.slice(0, CARD_CONFIGS.length).map((post, index) => {
                                    const config = CARD_CONFIGS[index];
                                    const cardCx = config.left + config.width / 2;
                                    const cardCy = config.top + config.height / 2;
                                    const viewportCx = scrollX + width / 2;
                                    const viewportCy = scrollY + height / 2;

                                    // Distance check: If card is far from viewport center, DON'T RENDER IT.
                                    // Viewport is roughly 400x800. 
                                    // Buffer needs to be enough to see coming cards but not too big.
                                    // 1000px radius covers screen + significant margin.
                                    const dist = Math.hypot(cardCx - viewportCx, cardCy - viewportCy);

                                    if (dist > 600) {
                                        return null; // CRASH FIX: Unmount completely
                                    }

                                    return (
                                        <MemoizedFloatingCard
                                            key={post.id}
                                            post={post}
                                            config={config}
                                            index={index}
                                            onPress={() => router.push(`/post/${post.id}/similar` as any)}
                                            onToggleScroll={setScrollEnabled}
                                            isActive={isScreenFocused && activeCardIndex === index}
                                        />
                                    );
                                })}
                            </View>
                        </ScrollView>
                    </ScrollView>
                )}

                {/* Bottom Navigation Bar removed - handled by _layout.tsx */}
            </SafeAreaView>
        </View>
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
