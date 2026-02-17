import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, RefreshControl, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { PostService } from '../services/PostService';
import FeedPostItem from '../components/FeedPostItem';


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
            avatarUrl: ''
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
    const [userAvatar, setUserAvatar] = useState<string | null>(null);

    const fetchUserProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('Profile')
                .select('avatarUrl')
                .eq('userId', user.id)
                .single();
            if (data?.avatarUrl) {
                setUserAvatar(data.avatarUrl);
            }
        }
    };

    const fetchFeed = async () => {
        try {
            const data = await PostService.getFeed();
            if (data) {
                const formatted = data.map((p: any) => ({
                    id: p.id,
                    content: p.content,
                    media: p.postMedia?.map((pm: any) => pm.media) || [],
                    user: Array.isArray(p.user) ? p.user[0] : p.user,
                    likeCount: p.likes?.[0]?.count || 0,
                    commentCount: p.comments?.[0]?.count || 0,
                    createdAt: p.createdAt
                }));
                setPosts(formatted);
            }
        } catch (e) {
            console.error('Feed fetch error:', e);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchFeed();
        fetchUserProfile();
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

    const [activePostId, setActivePostId] = useState<string | null>(null);
    const isScreenFocused = true; // Feed is focused if this screen is active

    const renderPost = ({ item }: { item: FeedPost }) => (
        <FeedPostItem
            item={{
                ...item,
                postMedia: item.media ? item.media.map(m => ({ url: m.url, type: m.type === 'video' ? 'VIDEO' : 'IMAGE' })) : [],
                commentCount: item.commentCount,
                reactionCounts: { W: item.likeCount, L: 0, CAP: 0 }, // Map legacy counts
                userReaction: liked.has(item.id) ? 'W' : null
            }}
            isActive={activePostId === item.id}
            colors={colors}
            mode={mode}
            onReact={(id, type) => toggleLike(id)}
            onAddBubble={() => { }}
            onActivate={() => setActivePostId(item.id)}
            onMenuPress={() => { }}
            onCommentPress={() => { }}
            onSharePress={() => { }}
            isScreenFocused={isScreenFocused}
            onToggleScroll={() => { }}
        />
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <LinearGradient
                colors={mode === 'light' ? ['#fff', '#f5f5f5'] : ['#000', '#0a0a0a']}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 }}>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>Feed</Text>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
                        {userAvatar ? (
                            <Image source={{ uri: userAvatar }} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card }} />
                        ) : (
                            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.secondary }}>U</Text>
                            </View>
                        )}
                    </TouchableOpacity>
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
