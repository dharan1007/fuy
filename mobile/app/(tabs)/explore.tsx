import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, Dimensions, FlatList, Alert, RefreshControl, StyleSheet, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, X, UserPlus, Check, Clock, Grid, User, Compass, Bell } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const PADDING = 16;

interface Post {
    id: string;
    media: { url: string; type: string }[] | null;
    content: string;
    postType?: string;
}

interface UserResult {
    id: string;
    name: string;
    profile: { displayName: string; avatarUrl: string } | null;
    friendshipStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'NONE';
}

// Card configurations matching reference images exactly
const CARD_CONFIGS = [
    { width: 0.42, height: 180, top: 0, left: 0, rotate: 0, radius: 20 },
    { width: 0.28, height: 140, top: 10, left: 0.44, rotate: 2, radius: 16 },
    { width: 0.26, height: 100, top: 160, left: 0.46, rotate: -1, radius: 14 },
    { width: 0.52, height: 200, top: 190, left: 0, rotate: 0, radius: 24 },
    { width: 0.48, height: 160, top: 270, left: 0.5, rotate: 1, radius: 20 },
    { width: 0.38, height: 120, top: 400, left: 0.08, rotate: -2, radius: 16 },
    { width: 0.30, height: 180, top: 440, left: 0.5, rotate: 0, radius: 18 },
    { width: 0.45, height: 140, top: 530, left: 0, rotate: 1, radius: 20 },
    { width: 0.42, height: 160, top: 630, left: 0.48, rotate: -1, radius: 22 },
    { width: 0.35, height: 200, top: 680, left: 0.05, rotate: 0, radius: 20 },
];

// Floating Post Card matching reference design
const FloatingCard = ({ post, config, index, onPress }: { post: Post; config: typeof CARD_CONFIGS[0]; index: number; onPress: () => void }) => {
    const cardWidth = (width - PADDING * 2) * config.width;
    const imageUrl = post.media?.[0]?.url || `https://picsum.photos/seed/${post.id}/${Math.round(cardWidth * 2)}/${Math.round(config.height * 2)}`;

    return (
        <View
            style={{
                position: 'absolute',
                top: config.top,
                left: PADDING + (width - PADDING * 2) * config.left,
                width: cardWidth,
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
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    elevation: 8,
                }}
            >
                <Image
                    source={{ uri: imageUrl }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                />

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

    // Using real data from Supabase - no demo fallback

    useEffect(() => {
        fetchPosts();
        getCurrentUser();
    }, []);

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

    const fetchPosts = async () => {
        try {
            // Use web API to bypass RLS restrictions
            const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://fuy.vercel.app';
            const response = await fetch(`${API_URL}/api/posts/create?limit=20`);

            if (!response.ok) {
                console.error('Explore API error:', response.status);
                setPosts([]);
                return;
            }

            const { posts: feedPosts } = await response.json();

            // Transform to Post interface
            const transformedPosts: Post[] = (feedPosts || []).map((p: any) => ({
                id: p.id,
                content: p.content || '',
                postType: p.postType,
                media: p.media || [],
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
        fetchPosts();
    }, []);

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

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => setIsSearching(true)}
                        style={[styles.iconButton, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                    >
                        <Search color="white" size={20} />
                    </TouchableOpacity>

                    <Text style={styles.title}>Posts</Text>

                    <TouchableOpacity style={styles.avatarButton}>
                        <Image
                            source={{ uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=user' }}
                            style={{ width: 36, height: 36, borderRadius: 18 }}
                        />
                    </TouchableOpacity>
                </View>

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

                {/* Floating Cards Container */}
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ height: contentHeight, paddingBottom: 120 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="white" />}
                >
                    {posts.slice(0, CARD_CONFIGS.length).map((post, index) => (
                        <FloatingCard
                            key={post.id}
                            post={post}
                            config={CARD_CONFIGS[index]}
                            index={index}
                            onPress={() => router.push(`/post/${post.id}`)}
                        />
                    ))}
                </ScrollView>

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
