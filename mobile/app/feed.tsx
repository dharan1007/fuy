import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, RefreshControl, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

interface FeedPost {
    id: string;
    content: string;
    media: { url: string; type: string }[] | null;
    user: {
        name: string;
        profile: { displayName: string; avatarUrl: string } | null;
    };
    likeCount: number;
    commentCount: number;
    createdAt: string;
}

const DEMO_FEED: FeedPost[] = Array.from({ length: 10 }).map((_, i) => ({
    id: `feed-${i}`,
    content: ['Exploring new horizons', 'Beautiful sunset today', 'Coffee time', 'Work in progress', 'Weekend vibes'][i % 5],
    media: [{ url: `https://picsum.photos/seed/${i + 100}/800/600`, type: 'image' }],
    user: {
        name: ['Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan'][i % 5],
        profile: {
            displayName: ['alex_photo', 'jordan.creates', 'sam.design', 'taylor_art', 'morganx'][i % 5],
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/png?seed=user${i}`
        }
    },
    likeCount: Math.floor(Math.random() * 500) + 10,
    commentCount: Math.floor(Math.random() * 50),
    createdAt: new Date(Date.now() - i * 3600000).toISOString(),
}));

export default function FeedScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const [posts, setPosts] = useState<FeedPost[]>(DEMO_FEED);
    const [refreshing, setRefreshing] = useState(false);
    const [liked, setLiked] = useState<Set<string>>(new Set());

    const fetchFeed = async () => {
        try {
            const response = await fetch('https://fuy.vercel.app/api/feed');
            if (response.ok) {
                const data = await response.json();
                if (data.posts?.length > 0) {
                    setPosts(data.posts);
                }
            }
        } catch (e) {
            console.error('Feed fetch error:', e);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchFeed();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchFeed();
    }, []);

    const toggleLike = (postId: string) => {
        setLiked(prev => {
            const newSet = new Set(prev);
            if (newSet.has(postId)) newSet.delete(postId);
            else newSet.add(postId);
            return newSet;
        });
    };

    const formatTime = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const hours = Math.floor(diff / 3600000);
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    const renderPost = ({ item }: { item: FeedPost }) => (
        <View style={{ marginBottom: 20 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
                <TouchableOpacity onPress={() => router.push(`/profile/${item.user.profile?.displayName}`)}>
                    <Image
                        source={{ uri: item.user.profile?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/png?seed=default' }}
                        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card }}
                    />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{item.user.name}</Text>
                    <Text style={{ color: colors.secondary, fontSize: 12 }}>@{item.user.profile?.displayName}</Text>
                </View>
                <TouchableOpacity>
                    <MoreHorizontal color={colors.secondary} size={20} />
                </TouchableOpacity>
            </View>

            {/* Media */}
            {item.media?.[0] && (
                <TouchableOpacity activeOpacity={0.95} onPress={() => router.push(`/post/${item.id}`)}>
                    <Image
                        source={{ uri: item.media[0].url }}
                        style={{ width, height: width, backgroundColor: colors.card }}
                        resizeMode="cover"
                    />
                </TouchableOpacity>
            )}

            {/* Actions */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 16 }}>
                <TouchableOpacity onPress={() => toggleLike(item.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Heart size={24} color={liked.has(item.id) ? '#ef4444' : colors.text} fill={liked.has(item.id) ? '#ef4444' : 'transparent'} />
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{item.likeCount + (liked.has(item.id) ? 1 : 0)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MessageCircle size={22} color={colors.text} />
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{item.commentCount}</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                    <Share2 size={22} color={colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <TouchableOpacity>
                    <Bookmark size={22} color={colors.text} />
                </TouchableOpacity>
            </View>

            {/* Content */}
            {item.content && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                    <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>
                        <Text style={{ fontWeight: '700' }}>{item.user.name} </Text>
                        {item.content}
                    </Text>
                    <Text style={{ color: colors.secondary, fontSize: 11, marginTop: 4 }}>{formatTime(item.createdAt)}</Text>
                </View>
            )}
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <LinearGradient
                colors={mode === 'light' ? ['#fff', '#f5f5f5'] : ['#000', '#0a0a0a']}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 }}>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>Feed</Text>
                </View>

                <FlatList
                    data={posts}
                    keyExtractor={item => item.id}
                    renderItem={renderPost}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                />
            </SafeAreaView>
        </View>
    );
}
