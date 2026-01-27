import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, FlatList, RefreshControl, Dimensions, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { useRouter } from 'expo-router';
import { ChevronLeft, Play, Clock, Eye, TrendingUp, Flame, Sparkles, Filter, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { useIsFocused } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FillData {
    id: string;
    postId: string;
    title: string;
    description: string;
    mediaUrl: string;
    mediaType: 'video' | 'image';
    thumbnailUrl?: string;
    username: string;
    avatar: string;
    userId: string;
    views: number;
    likes: number;
    duration?: string;
    createdAt: string;
    category?: string;
}

const FILL_CATEGORIES = ['All', 'New', 'Trending', 'Music', 'Gaming', 'Comedy', 'Art', 'Tech'];

interface FillsTabProps {
    onBack?: () => void;
}

export default function FillsTab({ onBack }: FillsTabProps) {
    const router = useRouter();
    const { mode } = useTheme();
    const isFocused = useIsFocused();
    const isDark = mode === 'dark';

    const colors = {
        bg: isDark ? '#000000' : '#FFFFFF',
        surface: isDark ? '#0A0A0A' : '#F8F8F8',
        card: isDark ? '#111111' : '#FFFFFF',
        border: isDark ? '#1A1A1A' : '#E5E5E5',
        text: isDark ? '#FFFFFF' : '#000000',
        textSecondary: isDark ? '#666666' : '#888888',
        accent: '#FFFFFF',
    };

    const [fills, setFills] = useState<FillData[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeCategory, setActiveCategory] = useState('All');
    const [playerVisible, setPlayerVisible] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        fetchFills();
    }, []);

    const fetchFills = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('Post')
                .select(`
                    id,
                    content,
                    createdAt,
                    viewCount,
                    userId,
                    user:User(id, name, profile:Profile(displayName, avatarUrl)),
                    postMedia:PostMedia(media:Media(url, type))
                `)
                .eq('postType', 'FILL')
                .eq('visibility', 'PUBLIC')
                .order('createdAt', { ascending: false })
                .limit(50);

            if (error) {
                console.error('[FillsTab] Error:', error);
                setFills([]);
                return;
            }

            const formatted = (data || []).map((post: any) => {
                const media = (post.postMedia || []).map((pm: any) => pm.media).filter(Boolean);
                let mediaUrl = '';
                let mediaType: 'video' | 'image' = 'image';

                if (media.length > 0) {
                    mediaUrl = media[0].url;
                    mediaType = media[0].type?.toUpperCase() === 'VIDEO' ? 'video' : 'image';
                }

                const user = Array.isArray(post.user) ? post.user[0] : post.user;

                return {
                    id: post.id,
                    postId: post.id,
                    title: post.content?.slice(0, 50) || 'Untitled',
                    description: post.content || '',
                    mediaUrl,
                    mediaType,
                    username: user?.profile?.displayName || user?.name || 'User',
                    avatar: user?.profile?.avatarUrl || '',
                    userId: post.userId,
                    views: post.viewCount || 0,
                    likes: Math.floor(Math.random() * 500), // Placeholder until count implementation
                    createdAt: post.createdAt,
                    category: FILL_CATEGORIES[Math.floor(Math.random() * FILL_CATEGORIES.length)],
                };
            }).filter((f: FillData) => f.mediaUrl);

            setFills(formatted);
        } catch (e) {
            console.error('[FillsTab] Fetch error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchFills();
    }, []);

    const openPlayer = (index: number) => {
        setSelectedIndex(index);
        setPlayerVisible(true);
    };

    const formatViews = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const formatTimeAgo = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days > 30) return Math.floor(days / 30) + ' mo ago';
        if (days > 0) return days + 'd ago';
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours > 0) return hours + 'h ago';
        return 'Just now';
    };

    const filteredFills = useMemo(() => {
        if (activeCategory === 'All') return fills;
        return fills.filter(f => f.category === activeCategory);
    }, [fills, activeCategory]);

    const featuredFills = useMemo(() => fills.slice(0, 5), [fills]);
    const trendingFills = useMemo(() => [...fills].sort((a, b) => b.views - a.views).slice(0, 10), [fills]);
    const newFills = useMemo(() => fills.slice(0, 8), [fills]);

    if (loading && fills.length === 0) {
        return (
            <View style={[styles.container, { backgroundColor: colors.bg }]}>
                <SafeAreaView style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.text} />
                </SafeAreaView>
            </View>
        );
    }

    const renderFeaturedItem = ({ item, index }: { item: FillData; index: number }) => (
        <TouchableOpacity
            onPress={() => openPlayer(fills.findIndex(f => f.id === item.id))}
            style={styles.featuredCard}
            activeOpacity={0.9}
        >
            <View style={styles.featuredMedia}>
                {item.mediaUrl ? (
                    <Image source={{ uri: item.mediaUrl }} style={styles.featuredImage} />
                ) : (
                    <View style={[styles.featuredImage, { backgroundColor: '#1a1a1a' }]} />
                )}
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.featuredGradient} />
                <View style={styles.playBadge}>
                    <Play size={16} color="#fff" fill="#fff" />
                </View>
            </View>
            <View style={styles.featuredInfo}>
                <Text style={styles.featuredTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.featuredMeta}>
                    <Text style={styles.featuredUsername}>@{item.username}</Text>
                    <View style={styles.statBadge}>
                        <Eye size={10} color="#888" />
                        <Text style={styles.statText}>{formatViews(item.views)}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderTrendingItem = ({ item, index }: { item: FillData; index: number }) => (
        <TouchableOpacity
            onPress={() => openPlayer(fills.findIndex(f => f.id === item.id))}
            style={styles.trendingCard}
            activeOpacity={0.9}
        >
            <Text style={styles.trendingRank}>#{index + 1}</Text>
            <View style={styles.trendingMedia}>
                {item.mediaUrl && <Image source={{ uri: item.mediaUrl }} style={styles.trendingImage} />}
                <View style={styles.trendingPlayIcon}>
                    <Play size={12} color="#fff" fill="#fff" />
                </View>
            </View>
            <View style={styles.trendingInfo}>
                <Text style={styles.trendingTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.trendingMeta}>{formatViews(item.views)} views</Text>
            </View>
        </TouchableOpacity>
    );

    const renderGridItem = ({ item, index }: { item: FillData; index: number }) => (
        <TouchableOpacity
            onPress={() => openPlayer(index)}
            style={styles.gridCard}
            activeOpacity={0.9}
        >
            <View style={styles.gridMedia}>
                {item.mediaUrl ? (
                    <Image source={{ uri: item.mediaUrl }} style={styles.gridImage} />
                ) : (
                    <View style={[styles.gridImage, { backgroundColor: '#1a1a1a' }]} />
                )}
                <View style={styles.gridPlayIcon}>
                    <Play size={14} color="#fff" fill="#fff" />
                </View>
            </View>
            <View style={styles.gridInfo}>
                <View style={styles.gridAvatarRow}>
                    {item.avatar ? (
                        <Image source={{ uri: item.avatar }} style={styles.gridAvatar} />
                    ) : (
                        <View style={[styles.gridAvatar, { backgroundColor: '#333' }]} />
                    )}
                    <Text style={styles.gridUsername} numberOfLines={1}>@{item.username}</Text>
                </View>
                <Text style={styles.gridTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.gridMeta}>
                    <Text style={styles.gridMetaText}>{formatViews(item.views)} views</Text>
                    <Text style={styles.gridMetaText}> - </Text>
                    <Text style={styles.gridMetaText}>{formatTimeAgo(item.createdAt)}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => onBack ? onBack() : router.back()} style={styles.backBtn}>
                        <ChevronLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>FILLS</Text>
                    <TouchableOpacity style={styles.filterBtn}>
                        <Filter size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <ScrollView
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
                        {FILL_CATEGORIES.map(cat => (
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

                    {/* Featured Section */}
                    {featuredFills.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Flame size={18} color="#FF4500" />
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>FEATURED</Text>
                            </View>
                            <FlatList
                                horizontal
                                data={featuredFills}
                                renderItem={renderFeaturedItem}
                                keyExtractor={item => item.id}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.featuredList}
                            />
                        </View>
                    )}

                    {/* Trending Section */}
                    {trendingFills.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <TrendingUp size={18} color="#00D4FF" />
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>TRENDING</Text>
                            </View>
                            <FlatList
                                horizontal
                                data={trendingFills}
                                renderItem={renderTrendingItem}
                                keyExtractor={item => item.id + '-trending'}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.trendingList}
                            />
                        </View>
                    )}

                    {/* New Releases */}
                    {newFills.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Sparkles size={18} color="#FFD700" />
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>NEW RELEASES</Text>
                            </View>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.newList}
                            >
                                {newFills.map((item, idx) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        onPress={() => openPlayer(fills.findIndex(f => f.id === item.id))}
                                        style={styles.newCard}
                                    >
                                        {item.mediaUrl && <Image source={{ uri: item.mediaUrl }} style={styles.newImage} />}
                                        <View style={styles.newBadge}>
                                            <Text style={styles.newBadgeText}>NEW</Text>
                                        </View>
                                        <Text style={styles.newTitle} numberOfLines={1}>{item.title}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* All Fills Grid */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>ALL FILLS</Text>
                            <Text style={styles.sectionCount}>{filteredFills.length} videos</Text>
                        </View>
                        <View style={styles.gridContainer}>
                            {filteredFills.map((item, index) => (
                                <View key={item.id} style={styles.gridItemWrapper}>
                                    {renderGridItem({ item, index })}
                                </View>
                            ))}
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>

            {/* Player Modal */}
            <Modal visible={playerVisible} animationType="fade" presentationStyle="fullScreen">
                <View style={styles.playerContainer}>
                    <SafeAreaView style={styles.playerHeader}>
                        <TouchableOpacity onPress={() => setPlayerVisible(false)} style={styles.closeBtn}>
                            <X size={28} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.playerCounter}>{selectedIndex + 1} / {filteredFills.length}</Text>
                    </SafeAreaView>

                    {filteredFills[selectedIndex] && (
                        <>
                            <View style={styles.playerMedia}>
                                {filteredFills[selectedIndex].mediaType === 'video' ? (
                                    <Video
                                        source={{ uri: filteredFills[selectedIndex].mediaUrl }}
                                        style={styles.playerVideo}
                                        resizeMode={ResizeMode.CONTAIN}
                                        shouldPlay={isFocused && playerVisible}
                                        isLooping
                                        useNativeControls
                                    />
                                ) : (
                                    <Image
                                        source={{ uri: filteredFills[selectedIndex].mediaUrl }}
                                        style={styles.playerVideo}
                                        resizeMode="contain"
                                    />
                                )}
                            </View>

                            <SafeAreaView style={styles.playerInfo}>
                                <Text style={styles.playerTitle}>{filteredFills[selectedIndex].title}</Text>
                                <View style={styles.playerMeta}>
                                    {filteredFills[selectedIndex].avatar && (
                                        <Image source={{ uri: filteredFills[selectedIndex].avatar }} style={styles.playerAvatar} />
                                    )}
                                    <Text style={styles.playerUsername}>@{filteredFills[selectedIndex].username}</Text>
                                </View>
                            </SafeAreaView>
                        </>
                    )}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingBottom: 100 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
    },
    backBtn: { padding: 4 },
    headerTitle: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 4,
        fontFamily: 'monospace',
    },
    filterBtn: { padding: 4 },

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

    featuredList: { paddingHorizontal: 16, gap: 16 },
    featuredCard: { width: 280, marginRight: 16 },
    featuredMedia: { width: '100%', aspectRatio: 16 / 9, borderRadius: 16, overflow: 'hidden', backgroundColor: '#111' },
    featuredImage: { width: '100%', height: '100%' },
    featuredGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' },
    playBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featuredInfo: { marginTop: 12 },
    featuredTitle: { color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 20 },
    featuredMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 12 },
    featuredUsername: { color: '#888', fontSize: 12 },
    statBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statText: { color: '#888', fontSize: 11 },

    trendingList: { paddingHorizontal: 16 },
    trendingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 260,
        backgroundColor: '#111',
        borderRadius: 12,
        padding: 12,
        marginRight: 12,
    },
    trendingRank: { color: '#555', fontSize: 20, fontWeight: '900', fontFamily: 'monospace', width: 32 },
    trendingMedia: { width: 60, height: 60, borderRadius: 8, overflow: 'hidden', backgroundColor: '#222' },
    trendingImage: { width: '100%', height: '100%' },
    trendingPlayIcon: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -8,
        marginLeft: -8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    trendingInfo: { flex: 1, marginLeft: 12 },
    trendingTitle: { color: '#fff', fontSize: 13, fontWeight: '600' },
    trendingMeta: { color: '#666', fontSize: 11, marginTop: 4 },

    newList: { paddingHorizontal: 16 },
    newCard: { width: 100, marginRight: 12 },
    newImage: { width: 100, height: 140, borderRadius: 12, backgroundColor: '#1a1a1a' },
    newBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: '#FFD700',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    newBadgeText: { color: '#000', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
    newTitle: { color: '#888', fontSize: 11, marginTop: 8 },

    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
    gridItemWrapper: { width: '50%', padding: 4 },
    gridCard: { backgroundColor: '#111', borderRadius: 12, overflow: 'hidden' },
    gridMedia: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#1a1a1a' },
    gridImage: { width: '100%', height: '100%' },
    gridPlayIcon: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gridInfo: { padding: 10 },
    gridAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    gridAvatar: { width: 18, height: 18, borderRadius: 9 },
    gridUsername: { color: '#666', fontSize: 10, flex: 1 },
    gridTitle: { color: '#fff', fontSize: 12, fontWeight: '600', lineHeight: 16 },
    gridMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
    gridMetaText: { color: '#555', fontSize: 10 },
    gridMetaDot: { color: '#333', fontSize: 10 },

    playerContainer: { flex: 1, backgroundColor: '#000' },
    playerHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    closeBtn: { padding: 8 },
    playerCounter: { color: '#fff', fontSize: 14, fontWeight: '600' },
    playerMedia: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    playerVideo: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * (9 / 16) },
    playerInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 },
    playerTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
    playerMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    playerAvatar: { width: 32, height: 32, borderRadius: 16 },
    playerUsername: { color: '#ccc', fontSize: 14 },
});
