import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, Dimensions, FlatList, Alert, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, X, UserPlus, Check, Clock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const VISIBLE_COLUMNS = 3;
const TOTAL_COLUMNS = 6;
const GAP = 8;
const PADDING = 16;
const COLUMN_WIDTH = (width - (PADDING * 2) - (GAP * (VISIBLE_COLUMNS - 1))) / VISIBLE_COLUMNS;

interface Post {
    id: string;
    media: { url: string; type: string }[] | null;
    content: string;
}

interface UserResult {
    id: string;
    name: string;
    profile: {
        displayName: string;
        avatarUrl: string;
    } | null;
    friendshipStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'NONE'; // Derived status
}

const IconX = ({ color, size }: { color: string; size: number }) => <X color={color} size={size} />;

export default function ExploreScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const DEMO_POSTS: Post[] = Array.from({ length: 24 }).map((_, i) => ({
        id: `demo-${i}`,
        media: [{ url: `https://source.unsplash.com/random/400x${300 + (i % 3) * 100}?sig=${i}`, type: 'image' }],
        content: `Demo Post ${i + 1}`
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
            let fetchedPosts: any[] = [];
            // Try 'Post' first
            let { data, error } = await supabase
                .from('Post')
                .select(`id, content, media:Media (url, type)`)
                .limit(50)
                .order('createdAt', { ascending: false });

            if (error) {
                // Try lowercase 'post'
                const { data: dataLower, error: errorLower } = await supabase
                    .from('post')
                    .select(`id, content, media:media (url, type)`)
                    .limit(50)
                    .order('createdAt', { ascending: false });

                if (dataLower) fetchedPosts = dataLower;
            } else if (data) {
                fetchedPosts = data;
            }

            if (fetchedPosts.length > 0) {
                setPosts(fetchedPosts as any);
            } else {
                setPosts(DEMO_POSTS);
            }
        } catch (e) {
            console.error('Failed to fetch explore posts:', e);
            setPosts(DEMO_POSTS);
        } finally {
            setLoading(false);
        }
    };

    const performSearch = async (text: string) => {
        try {
            if (!currentUserId) await getCurrentUser();

            console.log('Searching for:', text);

            // 0. Check for Profile Card Unique Code (7 digits/chars alphanumeric)
            if (text.length === 7) {
                const { data: cardData } = await supabase
                    .from('ProfileCard')
                    .select('uniqueCode, user:User(id, name, profile:Profile(displayName, avatarUrl))')
                    .eq('uniqueCode', text)
                    .single();

                if (cardData) {
                    const user = cardData.user as any;
                    // Directly navigate to Card View or show special result
                    // For now, let's prepend it as a special match in the list
                    const match: UserResult = {
                        id: user.id,
                        name: user.name || 'Unknown',
                        profile: {
                            displayName: user.profile?.displayName,
                            avatarUrl: user.profile?.avatarUrl
                        },
                        friendshipStatus: 'NONE' // Will be refreshed below
                    };

                    // We can also auto-redirect if perfect match? 
                    // Let's just put it at top for now with a special indicator logic if needed
                    // Or actually, user requirement says "search that user id in explore page search bar to find the ids aswell"
                    // So returning the user is enough.
                    setSearchResults([match]);
                    return;
                }
            }

            // 1. Search Users (Standard)
            let profilesData: any[] = [];
            const { data: profileResults, error: profileError } = await supabase
                .from('Profile')
                .select(`userId, displayName, avatarUrl, user:User(name)`)
                .ilike('displayName', `%${text}%`)
                .limit(20);

            if (!profileError && profileResults) {
                profilesData = profileResults;
            }

            // Map base results
            let mappedUsers: UserResult[] = profilesData.map((p: any) => ({
                id: p.userId,
                name: p.user?.name || 'Unknown',
                profile: {
                    displayName: p.displayName,
                    avatarUrl: p.avatarUrl
                },
                friendshipStatus: 'NONE'
            }));

            // Filter out self
            if (currentUserId) {
                mappedUsers = mappedUsers.filter(u => u.id !== currentUserId);
            }

            // 2. Fetch Friendships to determine status
            if (mappedUsers.length > 0 && currentUserId) {
                const targetIds = mappedUsers.map(u => u.id);
                // Check where 'userId' = Me AND 'friendId' IN targetIds
                const { data: friendships, error: fsError } = await supabase
                    .from('Friendship')
                    .select('friendId, status, isGhosted')
                    .eq('userId', currentUserId)
                    .in('friendId', targetIds);

                if (friendships) {
                    const statusMap = new Map();
                    friendships.forEach((f: any) => {
                        statusMap.set(f.friendId, f.status);
                    });

                    mappedUsers = mappedUsers.map(u => ({
                        ...u,
                        friendshipStatus: statusMap.get(u.id) || 'NONE'
                    }));
                }
            }

            setSearchResults(mappedUsers);

        } catch (e) {
            console.error('Search unexpected error:', e);
            setSearchResults([]);
        }
    };

    const handleFollow = async (item: UserResult) => {
        if (!currentUserId) return;
        try {
            // Optimistic Update
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
                console.error('Follow error:', error);
                // Revert
                setSearchResults(prev => prev.map(u =>
                    u.id === item.id ? { ...u, friendshipStatus: 'NONE' } : u
                ));
                Alert.alert("Error", "Could not send request");
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
    };

    const columns: Post[][] = Array.from({ length: TOTAL_COLUMNS }, () => []);
    posts.forEach((post, i) => columns[i % TOTAL_COLUMNS].push(post));

    const renderMasonryItem = (post: Post, index: number) => {
        const variants = [1, 1.25, 1.6];
        const aspectRatio = variants[(post.id.charCodeAt(0) + index) % 3];
        const itemHeight = COLUMN_WIDTH * aspectRatio;
        const imageUrl = post.media && post.media.length > 0 ? post.media[0].url : `https://source.unsplash.com/random/400x${Math.floor(itemHeight * 2)}?sig=${post.id}`;

        return (
            <TouchableOpacity
                key={post.id}
                activeOpacity={0.9}
                className="rounded-xl overflow-hidden mb-2"
                style={{ height: itemHeight, width: '100%', backgroundColor: colors.card }}
            >
                <Image
                    source={{ uri: imageUrl }}
                    className="w-full h-full"
                    resizeMode="cover"
                />
            </TouchableOpacity>
        );
    };

    const renderUserAction = (item: UserResult) => {
        if (item.friendshipStatus === 'ACCEPTED') {
            return (
                <View className="px-3 py-1 bg-green-500/20 rounded-full flex-row items-center gap-1">
                    <Check size={14} color="#4ade80" />
                    <Text className="text-green-400 text-xs font-bold">Following</Text>
                </View>
            );
        }
        if (item.friendshipStatus === 'PENDING') {
            return (
                <View className="px-3 py-1 bg-yellow-500/20 rounded-full flex-row items-center gap-1">
                    <Clock size={14} color="#facc15" />
                    <Text className="text-yellow-400 text-xs font-bold">Requested</Text>
                </View>
            );
        }
        // NONE or REJECTED (Usually you can try again if rejected? Or blocked? Assuming try again for now or just 'Follow')
        return (
            <TouchableOpacity
                onPress={() => handleFollow(item)}
                className="px-4 py-2 rounded-full flex-row items-center gap-2"
                style={{ backgroundColor: colors.primary }}
            >
                <UserPlus size={16} color="white" />
                <Text className="text-white text-xs font-bold">Follow</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
            <LinearGradient
                colors={mode === 'light' ? ['#ffffff', '#f0f0f0'] : ['#000000', '#0a0a0a']}
                className="absolute inset-0"
            />

            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Search Bar with pl-16 */}
                <View className="px-4 py-3 z-50 pl-16">
                    <BlurView
                        intensity={mode === 'light' ? 50 : 30}
                        tint={mode === 'light' ? 'light' : 'dark'}
                        className="flex-row items-center px-4 py-3 rounded-xl overflow-hidden"
                        style={{
                            borderColor: colors.border,
                            borderWidth: 1,
                            backgroundColor: mode === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.05)'
                        }}
                    >
                        <Search color={colors.secondary} size={18} />
                        <TextInput
                            placeholder="Explore users or enter Profile Code..."
                            placeholderTextColor={colors.secondary}
                            value={searchQuery}
                            onChangeText={handleSearch}
                            onFocus={() => setIsSearching(true)}
                            className="flex-1 ml-3 text-base font-medium"
                            style={{ color: colors.text }}
                        />
                        {isSearching && (
                            <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQuery(''); setSearchResults([]); }}>
                                <IconX color={colors.text} size={18} />
                            </TouchableOpacity>
                        )}
                    </BlurView>
                </View>

                {/* Search Results Overlay */}
                {isSearching && (
                    <BlurView
                        intensity={80}
                        tint={mode === 'light' ? 'light' : 'dark'}
                        className="absolute top-[80px] left-0 right-0 bottom-0 z-40 px-4"
                    >
                        {searchResults.length > 0 ? (
                            <FlatList
                                data={searchResults}
                                keyExtractor={item => item.id}
                                className="mt-2"
                                keyboardShouldPersistTaps="handled"
                                renderItem={({ item }) => (
                                    <View
                                        className="flex-row items-center p-4 rounded-xl mb-2 justify-between"
                                        style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
                                    >
                                        <View className="flex-row items-center flex-1">
                                            <Image
                                                source={{ uri: item.profile?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/png?seed=' + item.name }}
                                                className="w-12 h-12 rounded-full"
                                                style={{ backgroundColor: colors.secondary }}
                                            />
                                            <View className="ml-4 flex-1">
                                                <Text className="font-bold text-base" style={{ color: colors.text }}>{item.name}</Text>
                                                <Text className="text-sm" style={{ color: colors.secondary }}>@{item.profile?.displayName || 'user'}</Text>
                                            </View>
                                        </View>
                                        {renderUserAction(item)}
                                    </View>
                                )}
                            />
                        ) : searchQuery.length > 1 ? (
                            <View className="mt-10 items-center">
                                <Text className="text-lg" style={{ color: colors.secondary }}>No explorers found</Text>
                            </View>
                        ) : null}
                    </BlurView>
                )}

                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: PADDING, paddingBottom: 50 }}
                    >
                        <View className="flex-row" style={{ gap: GAP }}>
                            {columns.map((colPosts, colIndex) => (
                                <View key={colIndex} style={{ width: COLUMN_WIDTH, gap: GAP }}>
                                    <View style={{ height: (colIndex % 3) * 30 }} />
                                    {colPosts.map((post, index) => renderMasonryItem(post, index))}
                                </View>
                            ))}
                        </View>
                    </ScrollView>

                    {loading && (
                        <View className="py-10 items-center w-full">
                            <Text style={{ color: colors.secondary }}>Loading inspiration...</Text>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
