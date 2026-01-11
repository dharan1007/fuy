import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, Dimensions, FlatList, Alert, RefreshControl, StyleSheet, Animated } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, X, UserPlus, Check, Clock, Grid, User, Compass, Bell, Zap, Star, Circle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const PADDING = 16;

interface Post {
    id: string;
    media: { url: string; type: string }[] | null;
    content: string;
    postType?: string;
    postMedia?: { media: { url: string; type: string } }[];
    chanData?: { channelName?: string; description?: string; coverImageUrl?: string };
    user?: { profile?: { avatarUrl?: string } };
}

interface UserResult {
    id: string;
    name: string;
    profile: { displayName: string; avatarUrl: string } | null;
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

const AnimatedDecoration = ({ config, index }: { config: typeof DECORATION_CONFIGS[0], index: number }) => {
    // Wandering animation
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Random durations to create chaotic/organic movement
        const durationX = 10000 + (index % 7) * 2000;
        const durationY = 12000 + (index % 5) * 2000;
        const range = 150 + (index % 4) * 50; // Move 150-300px

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
    }, []);

    return (
        <Animated.View
            style={{
                position: 'absolute',
                top: config.top,
                left: config.left,
                transform: [
                    { translateX },
                    { translateY },
                    { rotate: `${config.rotate}deg` } // Keep static rotation, move position
                ],
                opacity: 0.3
            }}
        >
            {config.type === 'star' && <Star size={config.size} color="white" fill="white" />}
            {config.type === 'circle' && <Circle size={config.size} color="white" fill="white" />}
            {config.type === 'zap' && <Zap size={config.size} color="white" fill="white" />}
        </Animated.View>
    );
};

const CONTENT_WIDTH = 900;
const CONTENT_HEIGHT = 2000;

// Floating Post Card
const FloatingCard = ({ post, config, index, onPress, isActive }: { post: Post; config: typeof CARD_CONFIGS[0]; index: number; onPress: () => void; isActive: boolean }) => {
    // Determine media:
    // If XRAY: media[0] is Cover (Image usually), media[1] is Content.
    // If VIDEO: media[0] is Video. Cover might be missing.

    let coverUrl: string | null = null;
    let videoUrl: string | null = null;

    if (post.postType === 'XRAY' && post.media && post.media.length > 0) {
        coverUrl = post.media[0].url; // Top layer is cover
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
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={onPress}
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
                {/* 
                   Logic - Optimized for Stability:
                   1. Video only mounts if it's the ACTIVE card (playing).
                   2. If not active, priority is Cover Image.
                   3. If not active SAME TIME no Cover, we MUST mount video (paused) but let's try to avoid this for all cards.
                   To prevent "confusion"/flicker, we strictly render based on state.
                */}

                {(() => {
                    // CASE 1: Active Card -> Always Play Video (if available)
                    if (isActive && videoUrl) {
                        return (
                            <Video
                                source={{ uri: videoUrl }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode={ResizeMode.COVER}
                                shouldPlay={true}
                                isLooping
                                isMuted={true} // User requested preview (often muted) or sound? Usually preview is muted.
                                useNativeControls={false}
                            />
                        );
                    }

                    // CASE 2: Inactive Card -> Prefer Cover Image
                    if (coverUrl) {
                        return (
                            <Image
                                source={{ uri: coverUrl }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                            />
                        );
                    }

                    // CASE 3: Inactive & No Cover -> Fallback to Paused Video
                    // This is the heavy part. We accept it but only if absolutely necessary.
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

                    // CASE 4: No Media -> Placeholder (shouldn't happen with filter)
                    return <View className="bg-zinc-800 w-full h-full" />;
                })()}

                {/* Gradient overlay */}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '40%',
                        justifyContent: 'flex-end',
                        padding: 12,
                    }}
                >
                    {post.content && (
                        <Text
                            numberOfLines={2}
                            style={{
                                color: 'white',
                                fontSize: 11,
                                fontWeight: '600',
                                textShadowColor: 'rgba(0,0,0,0.5)',
                                textShadowOffset: { width: 0, height: 1 },
                                textShadowRadius: 2,
                            }}
                        >
                            {post.content}
                        </Text>
                    )}
                </LinearGradient>
            </TouchableOpacity>
        </View>
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
    const [searchResults, setSearchResults] = useState<UserResult[]>([]);
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

    // Global Pause when leaving tab (Crash Fix)
    useFocusEffect(
        React.useCallback(() => {
            setIsScreenFocused(true);
            return () => setIsScreenFocused(false);
        }, [])
    );

    // Fetch posts based on filter

    // Using real data from Supabase - no demo fallback

    useEffect(() => {
        fetchPosts(currentTab);
        getCurrentUser();
    }, [currentTab]); // Re-fetch when tab changes

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
            // Direct Supabase query with service role to bypass RLS
            let query = supabase
                .from('Post')
                .select(`
                    id,
                    content,
                    postType,
                    user:User(profile:Profile(avatarUrl)),
                    chan_data:Chan(*),
                    postMedia:PostMedia (
                        media:Media (url, type)
                    )
                `)
                .eq('visibility', 'PUBLIC')
                .order('createdAt', { ascending: false })
                .limit(20);

            // Map tabs to PostTypes

            // Map tabs to PostTypes
            switch (tab) {
                case 'Chans':
                    query = query.eq('postType', 'CHAN');
                    break;
                case 'Auds':
                    query = query.eq('postType', 'AUD');
                    break;
                case 'Chaptes':
                    query = query.eq('postType', 'CHAPTER');
                    break;
                case 'Puds':
                    query = query.eq('postType', 'PULLUPDOWN');
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
                user: Array.isArray(p.user) ? p.user[0] : p.user // Safely unwrap user
            }));

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
                .limit(20);

            let mappedUsers: UserResult[] = (profileResults || []).map((p: any) => ({
                id: p.userId,
                name: p.user?.name || 'Unknown',
                profile: { displayName: p.displayName, avatarUrl: p.avatarUrl },
                friendshipStatus: 'NONE'
            }));

            if (currentUserId) {
                mappedUsers = mappedUsers.filter(u => u.id !== currentUserId);
            }
            setSearchResults(mappedUsers);
        } catch (e) {
            setSearchResults([]);
        }
    };

    const handleFollow = async (item: UserResult) => {
        if (!currentUserId) return;
        setSearchResults(prev => prev.map(u => u.id === item.id ? { ...u, friendshipStatus: 'PENDING' } : u));

        const { error } = await supabase.from('Friendship').insert({
            userId: currentUserId,
            friendId: item.id,
            status: 'PENDING'
        });

        if (error) {
            setSearchResults(prev => prev.map(u => u.id === item.id ? { ...u, friendshipStatus: 'NONE' } : u));
            Alert.alert("Error", "Could not send request");
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
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header - Removed Profile Circle as requested */}
                <View style={[styles.header, { paddingRight: 20 }]}>
                    <TouchableOpacity
                        onPress={() => setIsSearching(true)}
                        style={[styles.iconButton, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                    >
                        <Search color="white" size={20} />
                    </TouchableOpacity>

                    <Text style={styles.title}>Explore</Text>

                    {/* Placeholder to balance header if needed, or just standard title alignment */}
                    <View style={{ width: 40 }} />
                </View>

                {/* Tabs - Smaller sizing */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 36, marginBottom: 8 }} contentContainerStyle={{ paddingHorizontal: PADDING, gap: 6 }}>
                    {['Posts', 'Slashes', 'Chans', 'Auds', 'Chaptes', 'sixts', 'Puds'].map((tab) => (
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

                {/* Search Overlay */}
                {isSearching && (
                    <BlurView
                        intensity={95}
                        tint="dark"
                        style={StyleSheet.absoluteFill}
                    >
                        <SafeAreaView style={{ flex: 1, paddingHorizontal: PADDING }}>
                            <View style={styles.searchBar}>
                                <Search color="rgba(255,255,255,0.5)" size={18} />
                                <TextInput
                                    autoFocus
                                    placeholder="Search users..."
                                    placeholderTextColor="rgba(255,255,255,0.4)"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    style={styles.searchInput}
                                />
                                <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQuery(''); setSearchResults([]); }}>
                                    <X color="white" size={20} />
                                </TouchableOpacity>
                            </View>

                            <FlatList
                                data={searchResults}
                                keyExtractor={item => item.id}
                                keyboardShouldPersistTaps="handled"
                                renderItem={({ item }) => (
                                    <View style={styles.searchResultItem}>
                                        <Image
                                            source={{ uri: item.profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${item.name}` }}
                                            style={styles.searchAvatar}
                                        />
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.searchName}>{item.name}</Text>
                                            <Text style={styles.searchHandle}>@{item.profile?.displayName || 'user'}</Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => handleFollow(item)}
                                            style={[styles.followButton, item.friendshipStatus === 'PENDING' && { backgroundColor: 'rgba(250,204,21,0.2)' }]}
                                        >
                                            <Text style={styles.followText}>
                                                {item.friendshipStatus === 'PENDING' ? 'Requested' : item.friendshipStatus === 'ACCEPTED' ? 'Following' : 'Follow'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
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
                        style={{ flex: 1, backgroundColor: 'black' }}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="white" />}
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
                                    colors={['transparent', 'black']}
                                    style={StyleSheet.absoluteFill}
                                />
                                <View style={{ position: 'absolute', bottom: 40, left: 20, right: 20 }}>
                                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>
                                        Featured Channel
                                    </Text>
                                    <Text style={{ color: 'white', fontSize: 42, fontWeight: '900', marginBottom: 16 }}>
                                        {posts[0].chanData?.channelName || 'Untitled Channel'}
                                    </Text>
                                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 24, lineHeight: 20 }} numberOfLines={2}>
                                        {posts[0].chanData?.description || posts[0].content}
                                    </Text>
                                    <TouchableOpacity
                                        style={{ backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, alignSelf: 'flex-start' }}
                                        onPress={() => router.push(`/post/${posts[0].id}` as any)}
                                    >
                                        <Text style={{ color: 'black', fontWeight: 'bold', marginRight: 8 }}>WATCH NOW</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Section: Trending Channels */}
                        <View style={{ marginBottom: 32 }}>
                            <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginLeft: 20, marginBottom: 16 }}>Trending Channels</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
                                {posts.slice(1).map((post) => (
                                    <TouchableOpacity
                                        key={post.id}
                                        style={{ width: 160 }}
                                        onPress={() => router.push(`/post/${post.id}` as any)}
                                    >
                                        <Image
                                            source={{ uri: post.chanData?.coverImageUrl || post.user?.profile?.avatarUrl || post.media?.[0]?.url || 'https://via.placeholder.com/150' }}
                                            style={{ width: 160, height: 220, borderRadius: 12, marginBottom: 8, backgroundColor: '#111' }}
                                        />
                                        <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{post.chanData?.channelName || 'Channel'}</Text>
                                        <Text style={{ color: '#666', fontSize: 12 }} numberOfLines={1}>324 Episodes</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Section: New Shows */}
                        <View style={{ marginBottom: 32 }}>
                            <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginLeft: 20, marginBottom: 16 }}>New Shows</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
                                {[...posts].reverse().map((post) => (
                                    <TouchableOpacity
                                        key={post.id}
                                        style={{ width: 280 }}
                                        onPress={() => router.push(`/post/${post.id}` as any)}
                                    >
                                        <Image
                                            source={{ uri: post.chanData?.coverImageUrl || post.user?.profile?.avatarUrl || post.media?.[0]?.url || 'https://via.placeholder.com/300' }}
                                            style={{ width: 280, height: 160, borderRadius: 12, marginBottom: 8, backgroundColor: '#111' }}
                                        />
                                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }} numberOfLines={1}>{post.chanData?.channelName || post.content.substring(0, 20)}</Text>
                                        <Text style={{ color: '#888', fontSize: 13 }} numberOfLines={1}>{post.chanData?.description || 'Exclusive Content'}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Episodes section removed */}
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
                    >
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ width: CONTENT_WIDTH, height: CONTENT_HEIGHT }}
                            onScroll={(e) => setScrollX(e.nativeEvent.contentOffset.x)}
                            scrollEventThrottle={100}
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

                                    // Tighter buffer (1500px -> 1200px) to save memory
                                    if (dist > 1200) return null;

                                    return <AnimatedDecoration key={`deco-${i}`} config={deco} index={i} />;
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

                                    if (dist > 800) {
                                        return null; // CRASH FIX: Unmount completely
                                    }

                                    return (
                                        <MemoizedFloatingCard
                                            key={post.id}
                                            post={post}
                                            config={config}
                                            index={index}
                                            onPress={() => router.push(`/post/${post.id}/similar` as any)}
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
