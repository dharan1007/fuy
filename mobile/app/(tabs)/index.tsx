import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Bell, LayoutDashboard, Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

interface PostUser {
    id: string;
    name: string;
    profile: {
        displayName: string;
        avatarUrl: string | null;
    } | null;
}

interface PostMedia {
    url: string;
    type: 'IMAGE' | 'VIDEO';
}

interface FeedPost {
    id: string;
    content: string;
    createdAt: string;
    user: PostUser;
    media: PostMedia[];
    _count?: {
        reactions: number;
        comments: number;
    };
}

export default function FeedScreen() {
    const { colors, mode } = useTheme();
    const router = useRouter();
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const getTimeAgo = (dateString: string) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    const fetchFeed = useCallback(async () => {
        try {
            // Fetch recent posts with user info and media
            // Note: In a real app, you'd filter by friends/following here. 
            // For now, we show a global timeline of recent posts.
            const { data, error } = await supabase
                .from('Post')
                .select(`
                    id, 
                    content, 
                    createdAt, 
                    user:User(id, name, profile:Profile(displayName, avatarUrl)),
                    media:Media(url, type),
                    reactions:Reaction(count),
                    comments:PostComment(count)
                `)
                .order('createdAt', { ascending: false })
                .limit(20);

            if (error) throw error;

            // Transform data if needed (e.g., flatten counts)
            const formattedPosts = data.map((p: any) => ({
                ...p,
                _count: {
                    reactions: p.reactions?.[0]?.count || 0, // Simplified assumption or need exact query
                    comments: p.comments?.[0]?.count || 0
                }
            }));

            // If fetching relation counts is complex via generic select, handled loosely here
            // actually Supabase .select with count is different, removing count for simple implementation
            // Relying on raw data
            setPosts(data as any);

        } catch (error) {
            console.error("Error fetching feed:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchFeed();
    }, [fetchFeed]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchFeed();
    };

    const renderHeader = () => (
        <View className="px-6 pt-4 pb-2 flex-row justify-between items-center pl-16">
            <Text
                className="text-3xl font-bold"
                style={{ color: colors.text }}
            >
                Fuy
            </Text>
            <View className="flex-row gap-4">
                <TouchableOpacity
                    onPress={() => router.push('/dashboard')}
                    className="p-2 rounded-full"
                    style={{ backgroundColor: colors.card }}
                >
                    <LayoutDashboard color={colors.text} size={24} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => router.push('/notifications')}
                    className="p-2 rounded-full"
                    style={{ backgroundColor: colors.card }}
                >
                    <Bell color={colors.text} size={24} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderPost = ({ item }: { item: FeedPost }) => (
        <View className="mb-6 rounded-2xl mx-4 overflow-hidden" style={{ backgroundColor: colors.card }}>
            {/* Header */}
            <View className="flex-row items-center p-4">
                <Image
                    source={{ uri: item.user.profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${item.user.name}` }}
                    className="w-10 h-10 rounded-full bg-gray-200"
                />
                <View className="ml-3 flex-1">
                    <Text className="font-bold text-base" style={{ color: colors.text }}>
                        {item.user.profile?.displayName || item.user.name}
                    </Text>
                    <Text className="text-xs" style={{ color: colors.secondary }}>
                        {getTimeAgo(item.createdAt)}
                    </Text>
                </View>
                <TouchableOpacity>
                    <MoreHorizontal color={colors.secondary} size={20} />
                </TouchableOpacity>
            </View>

            {/* Content */}
            {item.content ? (
                <Text className="px-4 pb-3 text-base leading-6" style={{ color: colors.text }}>
                    {item.content}
                </Text>
            ) : null}

            {/* Media */}
            {item.media && item.media.length > 0 && (
                <View className="w-full aspect-video bg-gray-100">
                    <Image
                        source={{ uri: item.media[0].url }}
                        className="w-full h-full"
                        resizeMode="cover"
                    />
                </View>
            )}

            {/* Actions */}
            <View className="flex-row items-center justify-between px-4 py-3 border-t" style={{ borderColor: colors.border }}>
                <View className="flex-row gap-6">
                    <TouchableOpacity className="flex-row items-center gap-2">
                        <Heart color={colors.text} size={22} />
                        {/* <Text style={{ color: colors.secondary }}>Like</Text> */}
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-row items-center gap-2">
                        <MessageCircle color={colors.text} size={22} />
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-row items-center gap-2">
                        <Share2 color={colors.text} size={22} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
            <LinearGradient
                colors={mode === 'light' ? ['#ffffff', '#f0f0f0'] : ['#000000', '#111111']}
                className="absolute inset-0"
            />
            <SafeAreaView className="flex-1" edges={['top']}>
                {renderHeader()}

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={posts}
                        renderItem={renderPost}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                        }
                        ListEmptyComponent={
                            <View className="flex-1 items-center justify-center py-20">
                                <Text style={{ color: colors.secondary }}>No posts yet. Be the first!</Text>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </View>
    );
}
