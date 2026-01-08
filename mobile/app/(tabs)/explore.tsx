import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, Dimensions, FlatList, Alert, RefreshControl } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, X, UserPlus, Check, Clock, User, Grid, BookOpen, Compass } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const GAP = 10;
const PADDING = 12;
const NUM_COLUMNS = 2;
const COLUMN_WIDTH = (width - (PADDING * 2) - GAP) / NUM_COLUMNS;

interface Post {
    id: string;
    media: { url: string; type: string }[] | null;
    content: string;
    postType?: string;
    title?: string;
}

interface UserResult {
    id: string;
    name: string;
    profile: {
        displayName: string;
        avatarUrl: string;
    } | null;
    friendshipStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'NONE';
}

// Floating Post Card with dynamic sizing
const PostCard = ({ post, index, onPress }: { post: Post; index: number; onPress: () => void }) => {
    const { colors } = useTheme();

    // Dynamic aspect ratios based on content type and index for visual variety
    const getAspectRatio = () => {
        if (post.postType === 'LILL') return 1.6; // Tall
        if (post.postType === 'FILL') return 0.7; // Wide-ish
        if (post.postType === 'CHAPTER') return 1.3;
        // Vary by index for visual interest
        const variants = [1.0, 1.4, 1.2, 0.9, 1.5, 1.1];
        return variants[index % variants.length];
    };

    const aspectRatio = getAspectRatio();
    const cardHeight = COLUMN_WIDTH * aspectRatio;
    const imageUrl = post.media?.[0]?.url || `https://picsum.photos/seed/${post.id}/400/600`;

    // Rounded corners - more rounded for smaller cards
    const borderRadius = cardHeight > 180 ? 20 : 16;

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 50).springify()}
            style={{ marginBottom: GAP }}
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={onPress}
                style={{
                    width: COLUMN_WIDTH,
                    height: cardHeight,
                    borderRadius,
                    overflow: 'hidden',
                    backgroundColor: colors.card,
                }}
            >
                <Image
                    source={{ uri: imageUrl }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                />

                {/* Gradient overlay at bottom */}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.6)']}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: cardHeight * 0.4,
                        justifyContent: 'flex-end',
                        padding: 10,
                    }}
                >
                    {post.content && (
                        <Text
                            numberOfLines={2}
                            style={{
                                color: 'white',
                                fontSize: 12,
                                fontWeight: '600',
                            }}
                        >
                            {post.content}
                        </Text>
                    )}
                </LinearGradient>

                {/* Type badge */}
                {post.postType && (
                    <View
                        style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 8,
                        }}
                    >
                        <Text style={{ color: 'white', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }}>
                            {post.postType}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

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
    const [activeTab, setActiveTab] = useState('posts');

    const DEMO_POSTS: Post[] = Array.from({ length: 20 }).map((_, i) => ({
        id: `demo-${i}`,
        media: [{ url: `https://picsum.photos/seed/${i}/400/600`, type: 'image' }],
        content: ['Away from city', 'I steal motions', 'My stories', 'Nature vibes', 'Urban life'][i % 5],
        postType: ['LILL', 'FILL', 'CHAPTER', undefined, undefined][i % 5],
    }));

    useEffect(() => {
        fetchPosts();
        getCurrentUser();
    }, []);

    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        if (debouncedQuery.length < 2) {
            setSearchResults([]);
            return;
        }
        performSearch(debouncedQuery);
    }, [debouncedQuery]);

    const fetchPosts = async () => {
        try {
            // Fetch from web API for consistency
            const response = await fetch('https://fuy.vercel.app/api/explore/summary');
            if (response.ok) {
                const data = await response.json();
                const allPosts = [
                    ...(data.main || []),
                    ...(data.lills || []),
                    ...(data.fills || []),
                    ...(data.chapters || []),
                ].slice(0, 30);

                if (allPosts.length > 0) {
                    setPosts(allPosts);
                } else {
                    setPosts(DEMO_POSTS);
                }
            } else {
                setPosts(DEMO_POSTS);
            }
        } catch (e) {
            console.error('Failed to fetch explore posts:', e);
            setPosts(DEMO_POSTS);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchPosts();
    }, []);

    const performSearch = async (text: string) => {
        try {
            if (!currentUserId) await getCurrentUser();

            // Search via Profile table
            const { data: profileResults } = await supabase
                .from('Profile')
                .select(`userId, displayName, avatarUrl, user:User(name)`)
                .ilike('displayName', `%${text}%`)
                .limit(20);

            let mappedUsers: UserResult[] = (profileResults || []).map((p: any) => ({
                id: p.userId,
                name: p.user?.name || 'Unknown',
                profile: {
                    displayName: p.displayName,
                    avatarUrl: p.avatarUrl
                },
                friendshipStatus: 'NONE'
            }));

            if (currentUserId) {
                mappedUsers = mappedUsers.filter(u => u.id !== currentUserId);
            }

            setSearchResults(mappedUsers);
        } catch (e) {
            console.error('Search error:', e);
            setSearchResults([]);
        }
    };

    const handleFollow = async (item: UserResult) => {
        if (!currentUserId) return;
        try {
            setSearchResults(prev => prev.map(u =>
                u.id === item.id ? { ...u, friendshipStatus: 'PENDING' } : u
            ));

            const { error } = await supabase
                .from('Friendship')
                .insert({
                    userId: currentUserId,
                    friendId: item.id,
                    status: 'PENDING'
                });

            if (error) {
                setSearchResults(prev => prev.map(u =>
                    u.id === item.id ? { ...u, friendshipStatus: 'NONE' } : u
                ));
                Alert.alert("Error", "Could not send request");
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Split posts into 2 columns for masonry effect
    const leftColumn: Post[] = [];
    const rightColumn: Post[] = [];
    posts.forEach((post, i) => {
        if (i % 2 === 0) leftColumn.push(post);
        else rightColumn.push(post);
    });

    const renderUserAction = (item: UserResult) => {
        if (item.friendshipStatus === 'ACCEPTED') {
            return (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(74,222,128,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                    <Check size={14} color="#4ade80" />
                    <Text style={{ color: '#4ade80', fontSize: 12, fontWeight: '700', marginLeft: 4 }}>Following</Text>
                </View>
            );
        }
        if (item.friendshipStatus === 'PENDING') {
            return (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(250,204,21,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                    <Clock size={14} color="#facc15" />
                    <Text style={{ color: '#facc15', fontSize: 12, fontWeight: '700', marginLeft: 4 }}>Requested</Text>
                </View>
            );
        }
        return (
            <TouchableOpacity
                onPress={() => handleFollow(item)}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
            >
                <UserPlus size={16} color="white" />
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '700', marginLeft: 6 }}>Follow</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <LinearGradient
                colors={mode === 'light' ? ['#ffffff', '#f5f5f5'] : ['#000000', '#0a0a0a']}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />

            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: PADDING, paddingVertical: 12 }}>
                    <TouchableOpacity
                        onPress={() => setIsSearching(true)}
                        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center' }}
                    >
                        <Search color={colors.text} size={20} />
                    </TouchableOpacity>

                    <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Posts</Text>

                    <TouchableOpacity
                        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, overflow: 'hidden' }}
                    >
                        <Image
                            source={{ uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=user' }}
                            style={{ width: '100%', height: '100%' }}
                        />
                    </TouchableOpacity>
                </View>

                {/* Search Overlay */}
                {isSearching && (
                    <BlurView
                        intensity={90}
                        tint={mode === 'light' ? 'light' : 'dark'}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, paddingTop: 60, paddingHorizontal: PADDING }}
                    >
                        {/* Search Input */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 }}>
                            <Search color={colors.secondary} size={18} />
                            <TextInput
                                autoFocus
                                placeholder="Search users..."
                                placeholderTextColor={colors.secondary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                style={{ flex: 1, marginLeft: 12, fontSize: 16, color: colors.text }}
                            />
                            <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQuery(''); setSearchResults([]); }}>
                                <X color={colors.text} size={20} />
                            </TouchableOpacity>
                        </View>

                        {/* Results */}
                        <FlatList
                            data={searchResults}
                            keyExtractor={item => item.id}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => (
                                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.card, borderRadius: 16, marginBottom: 8 }}>
                                    <Image
                                        source={{ uri: item.profile?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/png?seed=' + item.name }}
                                        style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.secondary }}
                                    />
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{item.name}</Text>
                                        <Text style={{ fontSize: 14, color: colors.secondary }}>@{item.profile?.displayName || 'user'}</Text>
                                    </View>
                                    {renderUserAction(item)}
                                </View>
                            )}
                            ListEmptyComponent={
                                searchQuery.length > 1 ? (
                                    <View style={{ alignItems: 'center', marginTop: 40 }}>
                                        <Text style={{ fontSize: 16, color: colors.secondary }}>No users found</Text>
                                    </View>
                                ) : null
                            }
                        />
                    </BlurView>
                )}

                {/* Masonry Grid */}
                <ScrollView
                    style={{ flex: 1 }}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: PADDING, paddingBottom: 120 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
                    }
                >
                    <View style={{ flexDirection: 'row', gap: GAP }}>
                        {/* Left Column */}
                        <View style={{ flex: 1 }}>
                            {leftColumn.map((post, index) => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    index={index * 2}
                                    onPress={() => router.push(`/explore/similar/${post.id}`)}
                                />
                            ))}
                        </View>

                        {/* Right Column with offset */}
                        <View style={{ flex: 1, marginTop: 30 }}>
                            {rightColumn.map((post, index) => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    index={index * 2 + 1}
                                    onPress={() => router.push(`/explore/similar/${post.id}`)}
                                />
                            ))}
                        </View>
                    </View>
                </ScrollView>

                {/* Bottom Navigation Bar */}
                <BlurView
                    intensity={80}
                    tint={mode === 'light' ? 'light' : 'dark'}
                    style={{
                        position: 'absolute',
                        bottom: 30,
                        left: 30,
                        right: 30,
                        borderRadius: 30,
                        overflow: 'hidden',
                    }}
                >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16 }}>
                        <TouchableOpacity
                            onPress={() => setActiveTab('explore')}
                            style={{ alignItems: 'center' }}
                        >
                            <Compass size={24} color={activeTab === 'explore' ? colors.text : colors.secondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActiveTab('posts')}
                            style={{ alignItems: 'center' }}
                        >
                            <Grid size={24} color={activeTab === 'posts' ? colors.text : colors.secondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => router.push('/(tabs)/profile')}
                            style={{ alignItems: 'center' }}
                        >
                            <User size={24} color={colors.secondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => router.push('/notifications')}
                            style={{ alignItems: 'center' }}
                        >
                            <BookOpen size={24} color={colors.secondary} />
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </SafeAreaView>
        </View>
    );
}
