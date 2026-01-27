import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, FlatList, RefreshControl, Dimensions, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Users, Tv, Star, Clock, TrendingUp, Sparkles, Radio } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ChanData {
    id: string;
    postId: string;
    name: string;
    description: string;
    coverUrl: string;
    avatarUrl: string;
    username: string;
    userId: string;
    subscriberCount: number;
    episodeCount: number;
    category?: string;
    isLive?: boolean;
    watchingCount?: number;
    createdAt: string;
}

const CHAN_CATEGORIES = ['All', 'Entertainment', 'Music', 'Gaming', 'Education', 'Tech', 'Sports', 'News'];

interface ChansTabProps {
    isActive?: boolean;
}

export default function ChansTab({ isActive = true }: ChansTabProps) {
    const router = useRouter();
    const { mode } = useTheme();
    const isDark = mode === 'dark';

    const colors = {
        bg: isDark ? '#000000' : '#FFFFFF',
        surface: isDark ? '#0A0A0A' : '#F8F8F8',
        card: isDark ? '#111111' : '#FFFFFF',
        border: isDark ? '#1A1A1A' : '#E5E5E5',
        text: isDark ? '#FFFFFF' : '#000000',
        textSecondary: isDark ? '#666666' : '#888888',
    };

    const [chans, setChans] = useState<ChanData[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeCategory, setActiveCategory] = useState('All');

    useEffect(() => {
        if (isActive) {
            fetchChans();
        }
    }, [isActive]);

    const fetchChans = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('Post')
                .select(`
                    id,
                    content,
                    createdAt,
                    userId,
                    user:User(id, name, profile:Profile(displayName, avatarUrl)),
                    chan_data:Chan(channelName, description, coverImageUrl, subscriberCount, isLive, watchingCount),
                    postMedia:PostMedia(media:Media(url, type))
                `)
                .eq('postType', 'CHAN')
                .eq('visibility', 'PUBLIC')
                .order('createdAt', { ascending: false })
                .limit(50);

            if (error) {
                console.error('[ChansTab] Error:', error);
                setChans([]);
                return;
            }

            const formatted = (data || []).map((post: any) => {
                const chanData = Array.isArray(post.chan_data) ? post.chan_data[0] : post.chan_data;
                const media = (post.postMedia || []).map((pm: any) => pm.media).filter(Boolean);
                const user = Array.isArray(post.user) ? post.user[0] : post.user;

                let coverUrl = chanData?.coverImageUrl || (media.length > 0 ? media[0].url : '');

                return {
                    id: post.id,
                    postId: post.id,
                    name: chanData?.channelName || post.content?.slice(0, 30) || 'Untitled Channel',
                    description: chanData?.description || post.content || '',
                    coverUrl,
                    avatarUrl: user?.profile?.avatarUrl || '',
                    username: user?.profile?.displayName || user?.name || 'Creator',
                    userId: post.userId,
                    subscriberCount: chanData?.subscriberCount || 0,
                    episodeCount: 0, // Placeholder as episodes are JSON
                    category: CHAN_CATEGORIES[Math.floor(Math.random() * (CHAN_CATEGORIES.length - 1)) + 1],
                    isLive: chanData?.isLive || false,
                    watchingCount: chanData?.watchingCount || 0,
                    createdAt: post.createdAt,
                };
            }).filter((c: ChanData) => c.coverUrl || c.name);

            setChans(formatted);
        } catch (e) {
            console.error('[ChansTab] Fetch error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchChans();
    }, []);

    const formatCount = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const filteredChans = useMemo(() => {
        if (activeCategory === 'All') return chans;
        return chans.filter(c => c.category === activeCategory);
    }, [chans, activeCategory]);

    const featuredChans = useMemo(() => chans.slice(0, 5), [chans]);
    const liveChans = useMemo(() => chans.filter(c => c.isLive), [chans]);
    const popularChans = useMemo(() => [...chans].sort((a, b) => b.subscriberCount - a.subscriberCount).slice(0, 10), [chans]);
    const newChans = useMemo(() => chans.slice(0, 6), [chans]);

    const navigateToChan = (chan: ChanData) => {
        router.push(`/post/${chan.postId}` as any);
    };

    if (loading && chans.length === 0) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
                <ActivityIndicator size="large" color={colors.text} />
            </View>
        );
    }

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.bg }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
            contentContainerStyle={styles.scrollContent}
        >
            {/* Categories */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesContainer}
            >
                {CHAN_CATEGORIES.map(cat => (
                    <TouchableOpacity
                        key={cat}
                        onPress={() => setActiveCategory(cat)}
                        style={[
                            styles.categoryPill,
                            activeCategory === cat && styles.categoryPillActive
                        ]}
                    >
                        <Text style={[
                            styles.categoryText,
                            activeCategory === cat && styles.categoryTextActive
                        ]}>{cat}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Live Now Section */}
            {liveChans.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.liveDot} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>LIVE NOW</Text>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.liveList}
                    >
                        {liveChans.map(chan => (
                            <TouchableOpacity
                                key={chan.id}
                                onPress={() => navigateToChan(chan)}
                                style={styles.liveCard}
                            >
                                <View style={styles.liveMedia}>
                                    {chan.coverUrl && <Image source={{ uri: chan.coverUrl }} style={styles.liveImage} />}
                                    <View style={styles.liveOverlay}>
                                        <View style={styles.liveBadge}>
                                            <Radio size={10} color="#fff" />
                                            <Text style={styles.liveBadgeText}>LIVE</Text>
                                        </View>
                                    </View>
                                </View>
                                <Text style={styles.liveName} numberOfLines={1}>{chan.name}</Text>
                                <Text style={styles.liveViewers}>{formatCount(chan.watchingCount || 0)} watching</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Featured Channels */}
            {featuredChans.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Star size={18} color="#FFD700" />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>FEATURED CHANNELS</Text>
                    </View>
                    <FlatList
                        horizontal
                        data={featuredChans}
                        keyExtractor={item => item.id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.featuredList}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => navigateToChan(item)}
                                style={styles.featuredCard}
                                activeOpacity={0.9}
                            >
                                <View style={styles.featuredMedia}>
                                    {item.coverUrl && <Image source={{ uri: item.coverUrl }} style={styles.featuredImage} />}
                                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.featuredGradient} />
                                    <View style={styles.featuredOverlay}>
                                        <Text style={styles.featuredName}>{item.name}</Text>
                                        <View style={styles.featuredStats}>
                                            <Users size={12} color="#ccc" />
                                            <Text style={styles.featuredStat}>{formatCount(item.subscriberCount)}</Text>
                                            <Tv size={12} color="#ccc" style={{ marginLeft: 12 }} />
                                            <Text style={styles.featuredStat}>{item.episodeCount} eps</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

            {/* Popular Channels */}
            {popularChans.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <TrendingUp size={18} color="#00D4FF" />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>POPULAR</Text>
                    </View>
                    <View style={styles.popularList}>
                        {popularChans.slice(0, 5).map((chan, index) => (
                            <TouchableOpacity
                                key={chan.id}
                                onPress={() => navigateToChan(chan)}
                                style={styles.popularCard}
                            >
                                <Text style={styles.popularRank}>#{index + 1}</Text>
                                <View style={styles.popularAvatar}>
                                    {chan.avatarUrl ? (
                                        <Image source={{ uri: chan.avatarUrl }} style={styles.popularAvatarImage} />
                                    ) : chan.coverUrl ? (
                                        <Image source={{ uri: chan.coverUrl }} style={styles.popularAvatarImage} />
                                    ) : (
                                        <View style={[styles.popularAvatarImage, { backgroundColor: '#333' }]} />
                                    )}
                                </View>
                                <View style={styles.popularInfo}>
                                    <Text style={styles.popularName} numberOfLines={1}>{chan.name}</Text>
                                    <Text style={styles.popularMeta}>@{chan.username} - {formatCount(chan.subscriberCount)} subscribers</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {/* New Channels */}
            {newChans.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Sparkles size={18} color="#A855F7" />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>DISCOVER NEW</Text>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.newList}
                    >
                        {newChans.map(chan => (
                            <TouchableOpacity
                                key={chan.id}
                                onPress={() => navigateToChan(chan)}
                                style={styles.newCard}
                            >
                                <View style={styles.newMedia}>
                                    {chan.coverUrl && <Image source={{ uri: chan.coverUrl }} style={styles.newImage} />}
                                    <View style={styles.newBadge}>
                                        <Text style={styles.newBadgeText}>NEW</Text>
                                    </View>
                                </View>
                                <Text style={styles.newName} numberOfLines={1}>{chan.name}</Text>
                                <Text style={styles.newCategory}>{chan.category}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* All Channels Grid */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>ALL CHANNELS</Text>
                    <Text style={styles.sectionCount}>{filteredChans.length} channels</Text>
                </View>
                <View style={styles.gridContainer}>
                    {filteredChans.map(chan => (
                        <TouchableOpacity
                            key={chan.id}
                            onPress={() => navigateToChan(chan)}
                            style={styles.gridCard}
                        >
                            <View style={styles.gridMedia}>
                                {chan.coverUrl ? (
                                    <Image source={{ uri: chan.coverUrl }} style={styles.gridImage} />
                                ) : (
                                    <View style={[styles.gridImage, { backgroundColor: '#1a1a1a' }]}>
                                        <Tv size={24} color="#333" />
                                    </View>
                                )}
                            </View>
                            <View style={styles.gridInfo}>
                                <View style={styles.gridAvatarRow}>
                                    {chan.avatarUrl ? (
                                        <Image source={{ uri: chan.avatarUrl }} style={styles.gridAvatar} />
                                    ) : (
                                        <View style={[styles.gridAvatar, { backgroundColor: '#333' }]} />
                                    )}
                                    <Text style={styles.gridUsername} numberOfLines={1}>@{chan.username}</Text>
                                </View>
                                <Text style={styles.gridName} numberOfLines={2}>{chan.name}</Text>
                                <View style={styles.gridMeta}>
                                    <Users size={10} color="#555" />
                                    <Text style={styles.gridMetaText}>{formatCount(chan.subscriberCount)}</Text>
                                    <Text style={styles.gridMetaDot}>-</Text>
                                    <Text style={styles.gridMetaText}>{chan.episodeCount} episodes</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 300 },
    scrollContent: { paddingBottom: 100 },

    categoriesContainer: { paddingHorizontal: 16, paddingVertical: 16, gap: 8 },
    categoryPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#1a1a1a',
        marginRight: 8,
    },
    categoryPillActive: { backgroundColor: '#FFFFFF' },
    categoryText: { color: '#888', fontSize: 12, fontWeight: '600' },
    categoryTextActive: { color: '#000' },

    section: { marginBottom: 32 },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 2,
        fontFamily: 'monospace',
    },
    sectionCount: { marginLeft: 'auto', color: '#555', fontSize: 11 },

    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF0000' },
    liveList: { paddingHorizontal: 16 },
    liveCard: { width: 140, marginRight: 12 },
    liveMedia: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1a1a1a' },
    liveImage: { width: '100%', height: '100%' },
    liveOverlay: { position: 'absolute', top: 8, left: 8 },
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FF0000', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    liveBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    liveName: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 8 },
    liveViewers: { color: '#666', fontSize: 10, marginTop: 2 },

    featuredList: { paddingHorizontal: 16 },
    featuredCard: { width: 260, marginRight: 16 },
    featuredMedia: { width: '100%', aspectRatio: 16 / 9, borderRadius: 16, overflow: 'hidden', backgroundColor: '#111' },
    featuredImage: { width: '100%', height: '100%' },
    featuredGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%' },
    featuredOverlay: { position: 'absolute', bottom: 12, left: 12, right: 12 },
    featuredName: { color: '#fff', fontSize: 14, fontWeight: '700' },
    featuredStats: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
    featuredStat: { color: '#ccc', fontSize: 11 },

    popularList: { paddingHorizontal: 16, gap: 12 },
    popularCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111',
        borderRadius: 12,
        padding: 12,
    },
    popularRank: { color: '#444', fontSize: 18, fontWeight: '900', fontFamily: 'monospace', width: 32 },
    popularAvatar: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', backgroundColor: '#222' },
    popularAvatarImage: { width: '100%', height: '100%' },
    popularInfo: { flex: 1, marginLeft: 12 },
    popularName: { color: '#fff', fontSize: 14, fontWeight: '700' },
    popularMeta: { color: '#666', fontSize: 11, marginTop: 2 },

    newList: { paddingHorizontal: 16 },
    newCard: { width: 120, marginRight: 12 },
    newMedia: { width: '100%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1a1a1a' },
    newImage: { width: '100%', height: '100%' },
    newBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: '#A855F7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    newBadgeText: { color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
    newName: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 8 },
    newCategory: { color: '#666', fontSize: 10, marginTop: 2 },

    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
    gridCard: { width: '50%', padding: 4 },
    gridMedia: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
    gridImage: { width: '100%', height: '100%' },
    gridInfo: { padding: 10, backgroundColor: '#111', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, marginTop: -4 },
    gridAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    gridAvatar: { width: 18, height: 18, borderRadius: 9 },
    gridUsername: { color: '#666', fontSize: 10, flex: 1 },
    gridName: { color: '#fff', fontSize: 12, fontWeight: '600', lineHeight: 16 },
    gridMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
    gridMetaText: { color: '#555', fontSize: 10 },
    gridMetaDot: { color: '#333', fontSize: 10 },
});
