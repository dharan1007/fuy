import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Dimensions, FlatList, Alert, RefreshControl, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, X, Play, ChevronRight } from 'lucide-react-native';
import SlashesModal from '../../components/SlashesModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { getSafetyFilters } from '../../services/SafetyService';
import { supabase } from '../../lib/supabase';
import { ExploreService } from '../../services/ExploreService';
import { useTheme } from '../../context/ThemeContext';
import ChansTab from '../../components/ChansTab';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PADDING = 16;
const GAP = 2;
const TILE_SIZE = (SCREEN_WIDTH - GAP * 2) / 3;
const LARGE_TILE = TILE_SIZE * 2 + GAP;

// ─── Types ───────────────────────────────────────────────────────────────
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

// Helper to get the best thumbnail URL from a post
function getPostThumbnail(post: Post): string | null {
    if (!post.media || post.media.length === 0) return null;
    const thumb = post.media.find(m => m.thumbnailUrl);
    if (thumb?.thumbnailUrl) return thumb.thumbnailUrl;
    const img = post.media.find(m => m.type?.toUpperCase() === 'IMAGE');
    if (img?.url) return img.url;
    const imgExt = post.media.find(m => m.url?.match(/\.(jpeg|jpg|png|webp|gif)$/i));
    if (imgExt?.url) return imgExt.url;
    return post.media[0]?.url || null;
}

function isVideoPost(post: Post): boolean {
    if (!post.media || post.media.length === 0) return false;
    return post.media.some(m => m.type === 'VIDEO' || m.url?.match(/\.(mp4|mov|webm)$/i));
}

// ─── Grid Tile ───────────────────────────────────────────────────────────
const GridTile = React.memo(({ post, size, onPress }: { post: Post; size: 'small' | 'large'; onPress: () => void }) => {
    const tileW = size === 'large' ? LARGE_TILE : TILE_SIZE;
    const tileH = size === 'large' ? LARGE_TILE : TILE_SIZE;
    const url = getPostThumbnail(post);
    const video = isVideoPost(post);

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={onPress}
            style={{ width: tileW, height: tileH, padding: GAP / 2 }}
        >
            <View style={{ flex: 1, borderRadius: 4, overflow: 'hidden', backgroundColor: '#1a1a1a' }}>
                {url ? (
                    <Image
                        source={{ uri: url }}
                        style={{ width: '100%', height: '100%' }}
                        transition={200}
                    />
                ) : (
                    <View style={{ flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>No media</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
});

// ─── Featured Row (Large + 2 Small) ──────────────────────────────────────
const FeaturedRow = React.memo(({ item, onPostPress }: {
    item: { large: Post; smalls: Post[] };
    onPostPress: (id: string) => void;
}) => {
    // Deterministic side based on post ID char code sum
    const charSum = item.large.id.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
    const isLeftLarge = charSum % 2 === 0;

    return (
        <View style={{ flexDirection: 'row' }}>
            {isLeftLarge ? (
                <>
                    <GridTile post={item.large} size="large" onPress={() => onPostPress(item.large.id)} />
                    <View>
                        {item.smalls.map(post => (
                            <GridTile key={post.id} post={post} size="small" onPress={() => onPostPress(post.id)} />
                        ))}
                        {item.smalls.length < 2 && <View style={{ width: TILE_SIZE, height: TILE_SIZE }} />}
                    </View>
                </>
            ) : (
                <>
                    <View>
                        {item.smalls.map(post => (
                            <GridTile key={post.id} post={post} size="small" onPress={() => onPostPress(post.id)} />
                        ))}
                        {item.smalls.length < 2 && <View style={{ width: TILE_SIZE, height: TILE_SIZE }} />}
                    </View>
                    <GridTile post={item.large} size="large" onPress={() => onPostPress(item.large.id)} />
                </>
            )}
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
            {/* Row header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, marginBottom: 10 }}>
                <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{title}</Text>
                <ChevronRight color={colors.text + '60'} size={20} />
            </View>

            {/* Horizontal list */}
            <FlatList
                data={posts}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => `cat-${item.id}`}
                contentContainerStyle={{ paddingHorizontal: 12 }}
                renderItem={({ item }) => {
                    const url = getPostThumbnail(item);
                    const video = isVideoPost(item);
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
                                    recyclingKey={`cat-${item.id}`}
                                    transition={200}
                                />
                            ) : (
                                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>No media</Text>
                                </View>
                            )}

                            {/* Bottom gradient with user info */}
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

    // Category row data
    const [chapterPosts, setChapterPosts] = useState<Post[]>([]);
    const [audPosts, setAudPosts] = useState<Post[]>([]);
    const [allSlashes, setAllSlashes] = useState<{ tag: string, count: number }[]>([]);

    // Focus tracking
    useFocusEffect(
        React.useCallback(() => {
            setIsScreenFocused(true);
            return () => setIsScreenFocused(false);
        }, [])
    );

    // ─── Data Fetching ───────────────────────────────────────────────────
    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);
    };

    const transformPost = (p: any): Post => {
        const lill = Array.isArray(p.lillData) ? p.lillData[0] : p.lillData;
        const fill = Array.isArray(p.fillData) ? p.fillData[0] : p.fillData;
        const chanCover = Array.isArray(p.chan_data) ? p.chan_data?.[0]?.coverImageUrl : p.chan_data?.coverImageUrl;

        // Prioritize specific cover images if available
        const thumbnailUrl = lill?.thumbnailUrl || fill?.thumbnailUrl || chanCover || null;

        // Robustly map postMedia -> Media
        const media = (p.postMedia || []).map((pm: any) => {
            // Handle both direct media object or nested in array if join went wrong
            const m = Array.isArray(pm.media) ? pm.media[0] : pm.media;
            if (!m) return null;

            // Ensure type is set
            if (!m.type) {
                m.type = m.url?.match(/\.(mp4|mov|webm)$/i) ? 'VIDEO' : 'IMAGE';
            }
            return m;
        }).filter(Boolean);

        // If we found a specific thumbnail (e.g. LILL/FILL/CHAN), inject it into the first media item or create a dummy one if needed for display
        if (thumbnailUrl) {
            if (media.length > 0) {
                media[0].thumbnailUrl = thumbnailUrl;
            } else {
                // If no media but we have a thumbnail, treat it as an image media for display purposes
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
            slashes: p.slashes || []
        };
    };

    const postQuery = `
        id, content, postType,
        user:User(name, profile:Profile(displayName, avatarUrl)),
        chan_data:Chan(*),
        lillData:Lill(thumbnailUrl),
        fillData:Fill(thumbnailUrl),
        postMedia:PostMedia(media:Media(url, type, variant)),
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
                // **NEW: Use algorithmic feed for general explore**
                data = await ExploreService.getExploreFeed(PAGE_SIZE, from);
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

            // DEBUG: Log the first post to see what we are getting
            if (data && data.length > 0) {
                console.log('[Explore Debug] First Post Raw:', JSON.stringify(data[0], null, 2));
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
                    slashes: apiPost.slashTags?.map((tag: string) => ({ tag })) || []
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

    // Fetch category rows for horizontal scrolling sections
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
    }, [currentTab]);

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
        fetchPosts(currentTab, false);
        if (currentTab === 'Posts') fetchCategoryRows();
    }, [currentTab]);

    const loadMore = () => {
        if (!hasMore || loading) return;
        fetchPosts(currentTab, true);
    };

    // ─── Grid Layout Builder ─────────────────────────────────────────────
    // Builds a mixed-size grid: every 3rd group has 1 large tile + 2 small
    // Pattern repeats: Row A (3 small), Row B (3 small), Row C (1 large + 2 stacked small)
    const gridData = useMemo(() => {
        if (currentTab !== 'Posts' || posts.length === 0) return [];

        type GridItem =
            | { type: 'row6'; posts: Post[] }
            | { type: 'featured6'; col1: { large: Post, smalls: Post[] }; col2: { large: Post, smalls: Post[] } | null }
            | { type: 'category'; category: 'chapters' | 'auds' }
            | { type: 'spacer' };

        const items: GridItem[] = [];
        let idx = 0;
        let groupCount = 0;
        const CATEGORY_INTERVAL = 3; // Insert category row every N groups

        while (idx < posts.length) {
            const groupInCycle = groupCount % 3;

            if (groupInCycle < 2) {
                // Regular 6-column row
                const row = posts.slice(idx, idx + 6);
                if (row.length > 0) {
                    items.push({ type: 'row6', posts: row });
                    idx += row.length;
                } else break;
            } else {
                // Featured row: 2 panels (1 large + 2 small) side by side
                const large1 = posts[idx];
                const smalls1 = posts.slice(idx + 1, idx + 3);

                let large2 = null;
                let smalls2: Post[] = [];
                if (idx + 3 < posts.length) {
                    large2 = posts[idx + 3];
                    smalls2 = posts.slice(idx + 4, idx + 6);
                }

                if (large1) {
                    items.push({
                        type: 'featured6',
                        col1: { large: large1, smalls: smalls1 },
                        col2: large2 ? { large: large2, smalls: smalls2 } : null
                    });
                    idx += 1 + smalls1.length + (large2 ? 1 + smalls2.length : 0);
                } else break;
            }

            groupCount++;

            // Insert category rows between grid sections
            if (groupCount === CATEGORY_INTERVAL && chapterPosts.length > 0) {
                items.push({ type: 'category', category: 'chapters' });
            }
            // Auds category row is hidden for V2
            // if (groupCount === CATEGORY_INTERVAL * 2 && audPosts.length > 0) {
            //     items.push({ type: 'category', category: 'auds' });
            // }
        }

        return items;
    }, [posts, currentTab, chapterPosts, audPosts]);

    const handlePostPress = useCallback((id: string) => {
        router.push(`/post/${id}` as any);
    }, [router]);

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
                <View style={{ paddingBottom: 10 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PADDING, gap: 8 }}>
                        {['Posts', 'Slashes', 'Chapters'].map(tab => (
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
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ minWidth: SCREEN_WIDTH * 2 }}>
                            <View style={{ flexDirection: 'column', width: SCREEN_WIDTH * 2 }}>
                                {loading && posts.length === 0 ? (
                                    <View style={{ width: '100%', justifyContent: 'center', alignItems: 'center', paddingTop: 100 }}>
                                        <ActivityIndicator size="large" color="white" />
                                    </View>
                                ) : (
                                    gridData.map((item, idx) => {
                                        if (item.type === 'row6') {
                                            return (
                                                <View key={`grid-${idx}`} style={{ flexDirection: 'row', width: SCREEN_WIDTH * 2 }}>
                                                    {item.posts.map(post => (
                                                        <GridTile
                                                            key={post.id}
                                                            post={post}
                                                            size="small"
                                                            onPress={() => handlePostPress(post.id)}
                                                        />
                                                    ))}
                                                    {item.posts.length < 6 && Array.from({ length: 6 - item.posts.length }).map((_, i) => (
                                                        <View key={`empty-${i}`} style={{ width: TILE_SIZE, height: TILE_SIZE }} />
                                                    ))}
                                                </View>
                                            );
                                        }

                                        if (item.type === 'featured6') {
                                            return (
                                                <View key={`grid-${idx}`} style={{ flexDirection: 'row', width: SCREEN_WIDTH * 2 }}>
                                                    <View style={{ width: SCREEN_WIDTH }}>
                                                        <FeaturedRow item={item.col1} onPostPress={handlePostPress} />
                                                    </View>
                                                    {item.col2 ? (
                                                        <View style={{ width: SCREEN_WIDTH }}>
                                                            <FeaturedRow item={item.col2} onPostPress={handlePostPress} />
                                                        </View>
                                                    ) : (
                                                        <View style={{ width: SCREEN_WIDTH }} />
                                                    )}
                                                </View>
                                            );
                                        }

                                        if (item.type === 'category') {
                                            if (item.category === 'chapters') {
                                                return <CategoryRow key={`grid-${idx}`} title="Chapters" posts={chapterPosts} onPostPress={handlePostPress} colors={colors} />;
                                            }
                                            if (item.category === 'auds') {
                                                return <CategoryRow key={`grid-${idx}`} title="Auds" posts={audPosts} onPostPress={handlePostPress} colors={colors} />;
                                            }
                                        }

                                        return null;
                                    })
                                )}

                                {loading && hasMore && posts.length > 0 && (
                                    <View style={{ width: '100%', alignItems: 'center', padding: 20 }}>
                                        <ActivityIndicator size="small" color="white" />
                                    </View>
                                )}
                            </View>
                        </ScrollView>
                    </ScrollView>
                ) : (
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
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ minWidth: SCREEN_WIDTH * 2 }}>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: SCREEN_WIDTH * 2 }}>
                                {loading && posts.length === 0 ? (
                                    <View style={{ width: '100%', justifyContent: 'center', alignItems: 'center', paddingTop: 100 }}>
                                        <ActivityIndicator size="large" color="white" />
                                    </View>
                                ) : (
                                    posts.map(item => (
                                        <GridTile
                                            key={item.id}
                                            post={item}
                                            size="small"
                                            onPress={() => handlePostPress(item.id)}
                                        />
                                    ))
                                )}
                            </View>
                        </ScrollView>
                    </ScrollView>
                )}
            </SafeAreaView>
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
