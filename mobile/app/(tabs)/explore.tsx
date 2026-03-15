import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Dimensions, FlatList, Alert, RefreshControl, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, X, Play, ChevronRight, Bookmark } from 'lucide-react-native';
import SlashesModal from '../../components/SlashesModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { getSafetyFilters } from '../../services/SafetyService';
import { supabase } from '../../lib/supabase';
import { ExploreService, ExploreMode, FeedPost } from '../../services/ExploreService';
import { TagAffinityService } from '../../services/TagAffinityService';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import ChansTab from '../../components/ChansTab';
import { FlashList } from '@shopify/flash-list';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
    withSequence,
    FadeInDown,
    runOnJS,
} from 'react-native-reanimated';
import {
    GestureDetector,
    Gesture,
    LongPressGestureHandler,
    TapGestureHandler,
    State,
} from 'react-native-gesture-handler';
import { useExplorePrefetch } from '../../hooks/useExplorePrefetch';
import TrendingStrip from '../../components/explore/TrendingStrip';
import ModeSwitcher from '../../components/explore/ModeSwitcher';
import VibeMatchRow from '../../components/explore/VibeMatchRow';
import PeekOverlay from '../../components/explore/PeekOverlay';
import ExploreEmptyState from '../../components/explore/ExploreEmptyState';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PADDING = 16;
const GAP = 2;
const TILE_SIZE = (SCREEN_WIDTH - GAP * 2) / 3;
const LARGE_TILE = TILE_SIZE * 2 + GAP;
const STORAGE_KEY_MODE = 'app:explore:last_mode';

// ─── Types ───────────────────────────────────────────────────────────────
interface Post {
    id: string;
    media: { url: string; type: string; variant?: string; thumbnailUrl?: string; thumbnailBlurHash?: string }[] | null;
    content: string;
    postType?: string;
    postMedia?: { media: { url: string; type: string; variant?: string; thumbnailUrl?: string } }[];
    lillData?: { thumbnailUrl?: string }[] | { thumbnailUrl?: string };
    fillData?: { thumbnailUrl?: string }[] | { thumbnailUrl?: string };
    chanData?: { id?: string; channelName?: string; description?: string; coverImageUrl?: string };
    user?: { id?: string; name?: string; profile?: { avatarUrl?: string; displayName?: string } };
    topBubbles?: { mediaUrl: string; mediaType: string }[];
    slashes?: { tag: string }[];
    slashTags?: string[];
    isWildcard?: boolean;
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

// Helper to get the best thumbnail URL from a post
function getPostThumbnail(post: Post): { url: string | null; blurHash: string | null } {
    if (!post.media || post.media.length === 0) return { url: null, blurHash: null };

    const thumb = post.media.find(m => m.thumbnailUrl);
    if (thumb?.thumbnailUrl) {
        return { url: thumb.thumbnailUrl, blurHash: thumb.thumbnailBlurHash || null };
    }

    const img = post.media.find(m => m.type?.toUpperCase() === 'IMAGE');
    if (img?.url) {
        return { url: img.url, blurHash: img.thumbnailBlurHash || null };
    }

    const imgExt = post.media.find(m => m.url?.match(/\.(jpeg|jpg|png|webp|gif)$/i));
    if (imgExt?.url) {
        return { url: imgExt.url, blurHash: imgExt.thumbnailBlurHash || null };
    }

    return { url: post.media[0]?.url || null, blurHash: post.media[0]?.thumbnailBlurHash || null };
}

function isVideoPost(post: Post): boolean {
    if (!post.media || post.media.length === 0) return false;
    return post.media.some(m => m.type === 'VIDEO' || m.url?.match(/\.(mp4|mov|webm)$/i));
}

// ─── Save Bookmark Animation Component ──────────────────────────────────
const SaveBookmarkOverlay = ({ visible }: { visible: boolean }) => {
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            opacity.value = withTiming(1, { duration: 100 });
            scale.value = withSequence(
                withSpring(1.2, { damping: 12, stiffness: 300 }),
                withDelay(400, withSpring(0, { damping: 15, stiffness: 200 }))
            );
            // Fade out after animation
            opacity.value = withDelay(500, withTiming(0, { duration: 150 }));
        } else {
            scale.value = 0;
            opacity.value = 0;
        }
    }, [visible]);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    if (!visible) return null;

    return (
        <Animated.View
            pointerEvents="none"
            style={[{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 50,
            }, animStyle]}
        >
            <Bookmark size={28} color="white" fill="white" />
        </Animated.View>
    );
};

// ─── Wildcard "New For You" Pill ─────────────────────────────────────────
const WildcardPill = ({ colors }: { colors: any }) => {
    const opacity = useSharedValue(1);

    useEffect(() => {
        opacity.value = withDelay(3000, withTiming(0, { duration: 500 }));
    }, []);

    const animStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            pointerEvents="none"
            style={[{
                position: 'absolute',
                top: 6,
                left: 6,
                zIndex: 10,
                backgroundColor: (colors.card || '#1a1a1a') + 'D9', // 85% opacity
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 6,
            }, animStyle]}
        >
            <Text style={{ color: colors.text, fontSize: 10, fontWeight: '500' }}>new for you</Text>
        </Animated.View>
    );
};

// ─── Grid Tile ───────────────────────────────────────────────────────────
const GridTile = React.memo(({
    post,
    size,
    onPress,
    onDoubleTap,
    onLongPress,
    colors,
    showSaveAnim,
}: {
    post: Post;
    size: 'small' | 'large';
    onPress: () => void;
    onDoubleTap: () => void;
    onLongPress: () => void;
    colors: any;
    showSaveAnim: boolean;
}) => {
    const tileW = size === 'large' ? LARGE_TILE : TILE_SIZE;
    const tileH = size === 'large' ? LARGE_TILE : TILE_SIZE;
    const { url, blurHash } = getPostThumbnail(post);

    // Gesture detection: single-tap waits for double-tap to fail
    const doubleTapRef = useRef<any>(null);

    const singleTap = Gesture.Tap()
        .numberOfTaps(1)
        .onEnd(() => {
            runOnJS(onPress)();
        });

    const doubleTap = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            runOnJS(onDoubleTap)();
        });

    const longPress = Gesture.LongPress()
        .minDuration(350)
        .onStart(() => {
            runOnJS(onLongPress)();
        });

    const composed = Gesture.Exclusive(doubleTap, Gesture.Exclusive(longPress, singleTap));

    return (
        <GestureDetector gesture={composed}>
            <Animated.View style={{ width: tileW, height: tileH, padding: GAP / 2 }}>
                <View style={{ flex: 1, borderRadius: 4, overflow: 'hidden', backgroundColor: '#1a1a1a' }}>
                    {url ? (
                        <Image
                            source={{ uri: url }}
                            style={{ width: '100%', height: '100%' }}
                            transition={200}
                            cachePolicy="memory-disk"
                            placeholder={blurHash || undefined}
                            placeholderContentFit="cover"
                        />
                    ) : (
                        <View style={{ flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>No media</Text>
                        </View>
                    )}

                    {/* Wildcard pill */}
                    {post.isWildcard && <WildcardPill colors={colors} />}

                    {/* Save bookmark animation */}
                    <SaveBookmarkOverlay visible={showSaveAnim} />
                </View>
            </Animated.View>
        </GestureDetector>
    );
});

// ─── Featured Row (Large + 2 Small) ──────────────────────────────────────
const FeaturedRow = React.memo(({ item, onPostPress, onDoubleTap, onLongPress, colors, savingPostId }: {
    item: { large: Post; smalls: Post[] };
    onPostPress: (id: string) => void;
    onDoubleTap: (post: Post) => void;
    onLongPress: (post: Post) => void;
    colors: any;
    savingPostId: string | null;
}) => {
    const charSum = item.large.id.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
    const isLeftLarge = charSum % 2 === 0;

    const largeTile = (
        <GridTile
            post={item.large}
            size="large"
            onPress={() => onPostPress(item.large.id)}
            onDoubleTap={() => onDoubleTap(item.large)}
            onLongPress={() => onLongPress(item.large)}
            colors={colors}
            showSaveAnim={savingPostId === item.large.id}
        />
    );
    const smallTiles = (
        <View>
            {item.smalls.map(post => (
                <GridTile
                    key={post.id}
                    post={post}
                    size="small"
                    onPress={() => onPostPress(post.id)}
                    onDoubleTap={() => onDoubleTap(post)}
                    onLongPress={() => onLongPress(post)}
                    colors={colors}
                    showSaveAnim={savingPostId === post.id}
                />
            ))}
            {item.smalls.length < 2 && <View style={{ width: TILE_SIZE, height: TILE_SIZE }} />}
        </View>
    );

    return (
        <View style={{ flexDirection: 'row' }}>
            {isLeftLarge ? <>{largeTile}{smallTiles}</> : <>{smallTiles}{largeTile}</>}
        </View>
    );
});

// ─── Category Row (Horizontal Scroll) ────────────────────────────────────
const CategoryRow = React.memo(({ title, posts, onPostPress, colors }: {
    title: string;
    posts: Post[];
    onPostPress: (id: string) => void;
    colors: any;
}) => {
    if (!posts || posts.length === 0) return null;

    return (
        <View style={{ marginVertical: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, marginBottom: 10 }}>
                <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{title}</Text>
                <ChevronRight color={colors.text + '60'} size={20} />
            </View>
            <FlatList
                data={posts}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => `cat-${item.id}`}
                contentContainerStyle={{ paddingHorizontal: 12 }}
                renderItem={({ item }) => {
                    const { url } = getPostThumbnail(item);
                    return (
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => onPostPress(item.id)}
                            style={{ width: 150, height: 200, marginHorizontal: 4, borderRadius: 10, overflow: 'hidden', backgroundColor: '#1a1a1a' }}
                        >
                            {url ? (
                                <Image
                                    source={{ uri: url }}
                                    style={{ width: '100%', height: '100%' }}
                                    contentFit="cover"
                                    cachePolicy="memory-disk"
                                    transition={200}
                                />
                            ) : (
                                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>No media</Text>
                                </View>
                            )}
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.7)']}
                                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, justifyContent: 'flex-end', padding: 8 }}
                            >
                                <Text numberOfLines={1} style={{ color: 'white', fontSize: 11, fontWeight: '600' }}>
                                    {item.user?.profile?.displayName || item.user?.name || ''}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
});

// ─── Main Component ──────────────────────────────────────────────────────
export default function ExploreScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const { session } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentTab, setCurrentTab] = useState('Posts');
    const [isScreenFocused, setIsScreenFocused] = useState(true);

    // New explore features state
    const [exploreMode, setExploreMode] = useState<ExploreMode>('foryou');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [trendingRefreshKey, setTrendingRefreshKey] = useState(0);
    const [currentVisibleIndex, setCurrentVisibleIndex] = useState(0);
    const [savingPostId, setSavingPostId] = useState<string | null>(null);
    const [gridOpacity, setGridOpacity] = useState(1);

    // Peek overlay state
    const [peekVisible, setPeekVisible] = useState(false);
    const [peekCreatorId, setPeekCreatorId] = useState<string | null>(null);
    const [peekThumbnail, setPeekThumbnail] = useState<string | null>(null);

    // RETURN_VIEW tracking
    const departureTimestamps = useRef<Map<string, number>>(new Map());

    // Category row data
    const [chapterPosts, setChapterPosts] = useState<Post[]>([]);
    const [audPosts, setAudPosts] = useState<Post[]>([]);
    const [allSlashes, setAllSlashes] = useState<{ tag: string, count: number }[]>([]);

    // User interests for empty state
    const [userInterests, setUserInterests] = useState<string[]>([]);

    // Focus tracking
    useFocusEffect(
        React.useCallback(() => {
            setIsScreenFocused(true);
            return () => setIsScreenFocused(false);
        }, [])
    );

    // Prefetch hook
    const { onScroll: prefetchOnScroll } = useExplorePrefetch(posts, currentVisibleIndex);

    // Restore last explore mode from storage
    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY_MODE).then(saved => {
            if (saved && ['foryou', 'fresh', 'nearby', 'following'].includes(saved)) {
                setExploreMode(saved as ExploreMode);
            }
        });
    }, []);

    // Session start: apply decay and fetch interests
    useEffect(() => {
        if (session?.user?.id) {
            TagAffinityService.applyAffinityDecay(session.user.id);
            // Fetch user interests for empty state
            supabase
                .from('Profile')
                .select('currentlyInto, tags')
                .eq('userId', session.user.id)
                .maybeSingle()
                .then(({ data }) => {
                    if (data) {
                        const interests = [
                            ...(data.currentlyInto || []),
                            ...(data.tags ? [data.tags] : []),
                        ].filter(Boolean);
                        setUserInterests(interests);
                    }
                });
        }
    }, [session?.user?.id]);

    // ─── Data Fetching ───────────────────────────────────────────────────
    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);
    };

    const transformPost = (p: any): Post => {
        const lill = Array.isArray(p.lillData) ? p.lillData[0] : p.lillData;
        const fill = Array.isArray(p.fillData) ? p.fillData[0] : p.fillData;
        const chanCover = Array.isArray(p.chan_data) ? p.chan_data?.[0]?.coverImageUrl : p.chan_data?.coverImageUrl;
        const thumbnailUrl = lill?.thumbnailUrl || fill?.thumbnailUrl || chanCover || null;

        const media = (p.postMedia || []).map((pm: any) => {
            const m = Array.isArray(pm.media) ? pm.media[0] : pm.media;
            if (!m) return null;
            if (!m.type) {
                m.type = m.url?.match(/\.(mp4|mov|webm)$/i) ? 'VIDEO' : 'IMAGE';
            }
            return m;
        }).filter(Boolean);

        if (thumbnailUrl) {
            if (media.length > 0) {
                media[0].thumbnailUrl = thumbnailUrl;
            } else {
                media.push({ url: thumbnailUrl, type: 'IMAGE', thumbnailUrl });
            }
        }

        return {
            id: p.id,
            content: p.content || '',
            postType: p.postType,
            media,
            chanData: Array.isArray(p.chan_data) ? p.chan_data[0] : p.chan_data,
            postMedia: p.postMedia,
            user: Array.isArray(p.user) ? p.user[0] : p.user,
            topBubbles: p.topBubbles || [],
            slashes: p.slashes || [],
            isWildcard: p.isWildcard || false,
        };
    };

    const postQuery = `
        id, content, postType,
        user:User(name, profile:Profile(displayName, avatarUrl)),
        chan_data:Chan(*),
        lillData:Lill(thumbnailUrl),
        fillData:Fill(thumbnailUrl),
        postMedia:PostMedia(media:Media(url, type, variant, thumbnailUrl, thumbnailBlurHash)),
        topBubbles:ReactionBubble(mediaUrl, mediaType),
        slashes:Slash(tag)
    `;

    const fetchPosts = async (tab = 'Posts', isLoadMore = false) => {
        if (!isLoadMore && loading && !refreshing) return;
        if (isLoadMore && (!hasMore || loading)) return;

        try {
            setLoading(true);
            const PAGE_SIZE = 30;
            const from = isLoadMore ? posts.length : 0;
            const to = from + PAGE_SIZE - 1;

            const { data: { user } } = await supabase.auth.getUser();
            if (user) setCurrentUserId(user.id);

            let data = null;
            let error = null;

            if (tab === 'Posts') {
                // Use algorithmic explore feed
                data = await ExploreService.getExploreFeed(PAGE_SIZE, from, exploreMode, selectedTag || undefined);
            } else {
                let query = supabase
                    .from('Post')
                    .select(postQuery)
                    .eq('visibility', 'PUBLIC')
                    .order('createdAt', { ascending: false })
                    .range(from, to);

                switch (tab) {
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
                }

                const response = await query;
                data = response.data;
                error = response.error;
            }

            if (error) {
                console.error('Explore fetch error:', error);
                setPosts([]);
                return;
            }

            const transformed = tab === 'Posts'
                ? (data || []).map((apiPost: any) => ({
                    id: apiPost.id,
                    content: apiPost.content || '',
                    postType: apiPost.postType,
                    media: apiPost.media || [],
                    chanData: null,
                    postMedia: apiPost.media,
                    user: apiPost.user,
                    topBubbles: [],
                    slashes: apiPost.slashTags?.map((tag: string) => ({ tag })) || [],
                    slashTags: apiPost.slashTags || [],
                    isWildcard: apiPost.isWildcard || false,
                })) as Post[]
                : (data || []).map(transformPost);

            if (isLoadMore) {
                setPosts(prev => [...prev, ...transformed]);
            } else {
                setPosts(transformed);
            }
            setHasMore(transformed.length === PAGE_SIZE);
        } catch (e) {
            console.error('Fetch error:', e);
            if (!isLoadMore) setPosts([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchCategoryRows = async () => {
        try {
            const [chapRes, audRes] = await Promise.all([
                supabase.from('Post').select(postQuery)
                    .eq('visibility', 'PUBLIC').eq('postType', 'CHAPTER')
                    .order('createdAt', { ascending: false }).limit(15),
                supabase.from('Post').select(postQuery)
                    .eq('visibility', 'PUBLIC').eq('postType', 'AUD')
                    .order('createdAt', { ascending: false }).limit(15),
            ]);

            if (chapRes.data) {
                setChapterPosts(chapRes.data.map(transformPost).filter(p => p.media && p.media.length > 0));
            }
            if (audRes.data) {
                setAudPosts(audRes.data.map(transformPost).filter(p => p.media && p.media.length > 0));
            }
        } catch (e) {
            console.error('Category fetch error:', e);
        }
    };

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
            if (currentTab === 'Posts') fetchCategoryRows();
        }
        getCurrentUser();
    }, [currentTab, exploreMode, selectedTag]);

    // ─── Mode Switching ──────────────────────────────────────────────────
    const handleModeChange = useCallback(async (newMode: ExploreMode) => {
        if (newMode === exploreMode) return;
        setGridOpacity(0);
        setExploreMode(newMode);
        AsyncStorage.setItem(STORAGE_KEY_MODE, newMode);
        setPosts([]);
        setHasMore(true);
        // Grid will fade in after data loads via useEffect
        setTimeout(() => setGridOpacity(1), 200);
    }, [exploreMode]);

    // ─── Search ──────────────────────────────────────────────────────────
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
                .limit(5);

            const { data: codeUser } = await supabase
                .from('User')
                .select(`id, name, profileCode, profile:Profile(displayName, avatarUrl)`)
                .eq('profileCode', text.replace('#', ''))
                .maybeSingle();

            let results: SearchResult[] = [];

            if (slashResults) {
                results = slashResults.map((s: any) => ({
                    type: 'SLASH',
                    id: s.id,
                    title: `#${s.tag}`,
                    subtitle: `${s.count || 0} posts`,
                    data: s
                }));
            }

            const userIds = (profileResults || []).map((p: any) => p.userId).filter((id: string) => id !== currentUserId);

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

            let mappedUsers: SearchResult[] = (profileResults || []).map((p: any) => ({
                type: 'USER',
                id: p.userId,
                title: p.user?.name || 'Unknown',
                subtitle: `@${p.displayName}`,
                avatar: p.avatarUrl,
                friendshipStatus: followingMap[p.userId] ? 'ACCEPTED' : 'NONE'
            }));

            if (codeUser && !mappedUsers.find(u => u.id === codeUser.id)) {
                const profile = Array.isArray(codeUser.profile) ? codeUser.profile[0] : codeUser.profile;
                mappedUsers.unshift({
                    type: 'USER',
                    id: codeUser.id,
                    title: codeUser.name || 'Unknown',
                    subtitle: `#${codeUser.profileCode}`,
                    avatar: profile?.avatarUrl,
                    friendshipStatus: followingMap[codeUser.id] ? 'ACCEPTED' : 'NONE'
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
        setSearchResults(prev => prev.map(u => u.id === item.id ? { ...u, friendshipStatus: 'PENDING' } : u));

        try {
            const { error } = await supabase.from('Subscription').insert({
                subscriberId: currentUserId,
                subscribedToId: item.id
            });
            if (error && error.code !== '23505') throw error;
            setSearchResults(prev => prev.map(u => u.id === item.id ? { ...u, friendshipStatus: 'ACCEPTED' } : u));
        } catch (error) {
            console.error('Follow error:', error);
            setSearchResults(prev => prev.map(u => u.id === item.id ? { ...u, friendshipStatus: 'NONE' } : u));
            Alert.alert("Error", "Could not follow user");
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setHasMore(true);
        setTrendingRefreshKey(prev => prev + 1);
        fetchPosts(currentTab, false);
        if (currentTab === 'Posts') fetchCategoryRows();
    }, [currentTab, exploreMode, selectedTag]);

    const loadMore = () => {
        if (!hasMore || loading) return;
        fetchPosts(currentTab, true);
    };

    // ─── Double-Tap Save Handler ─────────────────────────────────────────
    const handleDoubleTap = useCallback(async (post: Post) => {
        if (!currentUserId) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSavingPostId(post.id);
        setTimeout(() => setSavingPostId(null), 900);

        const saved = await ExploreService.savePost(post.id, currentUserId);
        const tags = post.slashTags || post.slashes?.map(s => s.tag) || [];
        ExploreService.logRecommendationFeedback(post.id, 'POST', 'SAVE', tags);
    }, [currentUserId]);

    // ─── Long-Press Peek Handler ─────────────────────────────────────────
    const handleLongPress = useCallback((post: Post) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const { url } = getPostThumbnail(post);
        setPeekThumbnail(url);
        setPeekCreatorId(post.user?.id || null);
        setPeekVisible(true);

        const tags = post.slashTags || post.slashes?.map(s => s.tag) || [];
        ExploreService.logRecommendationFeedback(post.id, 'POST', 'LONG_PRESS_PEEK', tags);
    }, []);

    // ─── RETURN_VIEW Tracking ────────────────────────────────────────────
    const handleViewableItemsChanged = useCallback(({ viewableItems, changed }: { viewableItems: any[]; changed: any[] }) => {
        // Track visible index
        if (viewableItems.length > 0 && viewableItems[0].index != null) {
            setCurrentVisibleIndex(viewableItems[0].index);
        }

        // RETURN_VIEW detection
        const now = Date.now();
        const currentlyVisible = new Set(viewableItems.map((v: any) => v.item?.id).filter(Boolean));

        // Items that left viewporttrack departure time
        for (const item of changed) {
            if (!item.isViewable && item.item?.id) {
                departureTimestamps.current.set(item.item.id, now);
            }
        }

        // Items that re-entered — check if within 30s
        for (const item of changed) {
            if (item.isViewable && item.item?.id) {
                const departedAt = departureTimestamps.current.get(item.item.id);
                if (departedAt && now - departedAt < 30000) {
                    const tags = item.item.slashTags || item.item.slashes?.map((s: any) => s.tag) || [];
                    ExploreService.logRecommendationFeedback(item.item.id, 'POST', 'RETURN_VIEW', tags);
                }
                departureTimestamps.current.delete(item.item.id);
            }
        }
    }, []);

    // ─── Grid Layout Builder ─────────────────────────────────────────────
    type GridItem =
        | { type: 'row'; posts: Post[]; key: string }
        | { type: 'featured'; large: Post; smalls: Post[]; key: string }
        | { type: 'vibe_match'; key: string }
        | { type: 'category'; category: 'chapters' | 'auds'; key: string };

    const gridData = useMemo((): GridItem[] => {
        if (currentTab !== 'Posts' || posts.length === 0) return [];

        const items: GridItem[] = [];
        let idx = 0;
        let groupCount = 0;
        let postCount = 0;

        while (idx < posts.length) {
            // Insert VibeMatchRow after roughly 6 posts
            if (postCount >= 6 && postCount < 10 && !items.find(i => i.type === 'vibe_match')) {
                items.push({ type: 'vibe_match', key: 'vibe-match' });
            }

            const groupInCycle = groupCount % 3;

            if (groupInCycle < 2) {
                // Regular 3-column row
                const row = posts.slice(idx, idx + 3);
                if (row.length > 0) {
                    items.push({ type: 'row', posts: row, key: `row-${idx}` });
                    postCount += row.length;
                    idx += row.length;
                } else break;
            } else {
                // Featured row: 1 large + 2 small
                const large = posts[idx];
                const smalls = posts.slice(idx + 1, idx + 3);

                if (large) {
                    items.push({
                        type: 'featured',
                        large,
                        smalls,
                        key: `feat-${idx}`,
                    });
                    postCount += 1 + smalls.length;
                    idx += 1 + smalls.length;
                } else break;
            }

            groupCount++;
        }

        return items;
    }, [posts, currentTab]);

    const handlePostPress = useCallback((id: string) => {
        router.push(`/post/${id}` as any);
    }, [router]);

    // ─── FlashList Estimated Size ────────────────────────────────────────
    // Average of small (TILE_SIZE) and large rows, weighted 2:1
    const estimatedItemSize = Math.round((TILE_SIZE * 2 + LARGE_TILE) / 3);

    // ─── Render ──────────────────────────────────────────────────────────
    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={[styles.header, { zIndex: 101 }]}>
                    <Text style={styles.title}>Explore</Text>
                    <TouchableOpacity onPress={() => setIsSearching(true)} style={styles.iconButton}>
                        <Search color="white" size={24} />
                    </TouchableOpacity>
                </View>

                {/* Tabs */}
                <View style={{ paddingBottom: 4 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PADDING, gap: 8 }}>
                        {['Posts', 'Slashes'/*, 'Chapters'*/].map(tab => (
                            <TouchableOpacity
                                key={tab}
                                onPress={() => {
                                    setCurrentTab(tab);
                                    setPosts([]);
                                    setHasMore(true);
                                }}
                                style={{
                                    paddingHorizontal: 16,
                                    paddingVertical: 8,
                                    borderRadius: 20,
                                    backgroundColor: currentTab === tab ? 'white' : 'rgba(255,255,255,0.08)',
                                }}
                            >
                                <Text style={{
                                    color: currentTab === tab ? '#000' : 'white',
                                    fontWeight: '700',
                                    fontSize: 13,
                                }}>{tab}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Mode Switcher (only for Posts tab) */}
                {currentTab === 'Posts' && (
                    <ModeSwitcher activeMode={exploreMode} onModeChange={handleModeChange} />
                )}

                {/* Trending Strip (only for Posts tab) */}
                {currentTab === 'Posts' && (
                    <TrendingStrip
                        selectedTag={selectedTag}
                        onSelectTag={setSelectedTag}
                        forceRefresh={trendingRefreshKey}
                    />
                )}

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

                {/* Content */}
                {currentTab === 'Chans' ? (
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
                ) : currentTab === 'Posts' ? (
                    loading && posts.length === 0 ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="large" color="white" />
                        </View>
                    ) : posts.length === 0 ? (
                        <ExploreEmptyState
                            selectedTag={selectedTag}
                            onClearTag={() => setSelectedTag(null)}
                            topInterests={userInterests}
                            onSelectInterest={(tag) => setSelectedTag(tag)}
                            vibeMatchProfile={null}
                            onFollowProfile={() => { }}
                            onNavigateToProfile={(userId) => router.push(`/profile/${userId}` as any)}
                        />
                    ) : (
                        <View style={{ flex: 1, opacity: gridOpacity }}>
                            <FlashList
                                data={gridData}
                                drawDistance={Dimensions.get('window').height * 2}
                                onEndReached={loadMore}
                                onEndReachedThreshold={0.5}
                                onViewableItemsChanged={handleViewableItemsChanged}
                                onScroll={prefetchOnScroll}
                                scrollEventThrottle={16}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 100 }}
                                refreshControl={
                                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="white" />
                                }
                                keyExtractor={(item) => item.key}
                                renderItem={({ item }) => {
                                    if (item.type === 'row') {
                                        return (
                                            <View style={{ flexDirection: 'row' }}>
                                                {item.posts.map(post => (
                                                    <GridTile
                                                        key={post.id}
                                                        post={post}
                                                        size="small"
                                                        onPress={() => handlePostPress(post.id)}
                                                        onDoubleTap={() => handleDoubleTap(post)}
                                                        onLongPress={() => handleLongPress(post)}
                                                        colors={colors}
                                                        showSaveAnim={savingPostId === post.id}
                                                    />
                                                ))}
                                                {item.posts.length < 3 && Array.from({ length: 3 - item.posts.length }).map((_, i) => (
                                                    <View key={`empty-${i}`} style={{ width: TILE_SIZE, height: TILE_SIZE }} />
                                                ))}
                                            </View>
                                        );
                                    }

                                    if (item.type === 'featured') {
                                        return (
                                            <FeaturedRow
                                                item={{ large: item.large, smalls: item.smalls }}
                                                onPostPress={handlePostPress}
                                                onDoubleTap={handleDoubleTap}
                                                onLongPress={handleLongPress}
                                                colors={colors}
                                                savingPostId={savingPostId}
                                            />
                                        );
                                    }

                                    if (item.type === 'vibe_match') {
                                        return <VibeMatchRow />;
                                    }

                                    if (item.type === 'category') {
                                        if (item.category === 'chapters') {
                                            return <CategoryRow title="Chapters" posts={chapterPosts} onPostPress={handlePostPress} colors={colors} />;
                                        }
                                        if (item.category === 'auds') {
                                            return <CategoryRow title="Auds" posts={audPosts} onPostPress={handlePostPress} colors={colors} />;
                                        }
                                    }

                                    return null;
                                }}
                                ListFooterComponent={loading && hasMore && posts.length > 0 ? (
                                    <View style={{ alignItems: 'center', padding: 20 }}>
                                        <ActivityIndicator size="small" color="white" />
                                    </View>
                                ) : null}
                            />
                        </View>
                    )
                ) : (
                    // Other tab content (fallback grid for non-Posts tabs)
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        scrollEventThrottle={16}
                        onScroll={(e) => {
                            const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
                            const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 500;
                            if (isCloseToBottom && !loading && hasMore) {
                                loadMore();
                            }
                        }}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="white" />
                        }
                    >
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                            {posts.map(item => (
                                <GridTile
                                    key={item.id}
                                    post={item}
                                    size="small"
                                    onPress={() => handlePostPress(item.id)}
                                    onDoubleTap={() => handleDoubleTap(item)}
                                    onLongPress={() => handleLongPress(item)}
                                    colors={colors}
                                    showSaveAnim={savingPostId === item.id}
                                />
                            ))}
                        </View>
                    </ScrollView>
                )}
            </SafeAreaView>

            {/* Peek Overlay */}
            <PeekOverlay
                visible={peekVisible}
                creatorUserId={peekCreatorId}
                thumbnailUrl={peekThumbnail}
                onDismiss={() => setPeekVisible(false)}
            />
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────
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
