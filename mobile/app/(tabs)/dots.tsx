import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Dimensions, TouchableOpacity, Image, StyleSheet, FlatList, ViewToken, ActivityIndicator, ScrollView, Animated, PanResponder, Share as RNShare, Modal, Switch, TouchableWithoutFeedback, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { Heart, MessageCircle, Share2, MoreVertical, Play, Pause, Circle as DotIcon, X, Search, ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import ShareCardModal from '../../components/ShareCardModal';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CATEGORIES = [
    { id: 'mix', label: 'Mix' },
    { id: 'bloom', label: 'Bloom' },
    { id: 'lills', label: 'Lills' },
    { id: 'fills', label: 'Fills' },
    { id: 'auds', label: 'Auds' },
    { id: 'channels', label: 'Channels' },
    { id: 'chapters', label: 'Chapters' },
    { id: 'xrays', label: 'X Rays' },
    { id: 'pupds', label: 'Pupds' },
];

const FILL_FILTERS = ['All', 'New to you', 'Live', 'Stand-Up', 'Gaming', 'Music', 'Cartoons'];

const MOCK_DOTS: DotData[] = [
    {
        id: '1',
        username: 'traveler_jane',
        avatar: 'https://api.dicebear.com/7.x/avataaars/png?seed=jane',
        description: 'Beautiful sunset at the beach 🌅',
        likes: 12400,
        comments: 234,
        mediaUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600',
        mediaType: 'image',
        category: 'mix',
        postId: 'mock-1',
        userId: 'mock-user-1',
        isSubscribed: false,
        followersCount: 15600,
    },
];

interface DotData {
    id: string;
    postId: string;
    userId: string;
    username: string;
    avatar: string;
    description: string;
    likes: number;
    comments: number;
    mediaUrl: string;
    mediaType: 'video' | 'image' | 'audio';
    category: string;
    isSubscribed: boolean;
    followersCount: number;
    createdAt?: string;
    views?: string;
}

const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

interface DotItemProps {
    item: DotData;
    isActive: boolean;
    autoScroll: boolean;
    onVideoEnd: () => void;
    onToggleAutoScroll: () => void;
    onSubscribe: (targetUserId: string, currentStatus: boolean) => void;
}

// Helper to get resize mode for Feed
const getFeedResizeMode = (item: DotData): ResizeMode => {
    if (item.category === 'fills') return ResizeMode.CONTAIN; // 16:9
    if (item.mediaType === 'image') return ResizeMode.CONTAIN; // 4:3 usually
    return ResizeMode.COVER; // Lills (9:16)
};

const getImageResizeMode = (item: DotData): 'contain' | 'cover' => {
    if (item.category === 'fills') return 'contain';
    if (item.mediaType === 'image') return 'contain';
    return 'cover';
};

const DotItem = ({ item, isActive, autoScroll, onVideoEnd, onToggleAutoScroll, onSubscribe }: DotItemProps) => {
    const { colors } = useTheme();
    const [liked, setLiked] = useState(false);
    const [isPlaying, setIsPlaying] = useState(true);
    const videoRef = useRef<Video>(null);

    return (
        <View style={[styles.dotContainer, { height: SCREEN_HEIGHT }]}>
            <TouchableOpacity activeOpacity={1} onPress={() => setIsPlaying(!isPlaying)} style={StyleSheet.absoluteFillObject}>
                {item.mediaType === 'video' ? (
                    <Video
                        ref={videoRef}
                        source={{ uri: item.mediaUrl }}
                        style={StyleSheet.absoluteFillObject}
                        resizeMode={getFeedResizeMode(item)}
                        shouldPlay={isActive && isPlaying}
                        isLooping={!autoScroll}
                    />
                ) : (
                    <Image
                        source={{ uri: item.mediaUrl }}
                        style={StyleSheet.absoluteFillObject}
                        resizeMode={getImageResizeMode(item)}
                    />
                )}
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={[StyleSheet.absoluteFillObject, { top: '50%' }]} />
            </TouchableOpacity>

            {!isPlaying && (
                <View style={styles.playPauseOverlay}>
                    <Play size={64} color="#fff" fill="#fff" />
                </View>
            )}

            <View style={styles.actionsContainer}>
                <TouchableOpacity style={styles.actionButton} onPress={() => setLiked(!liked)}>
                    <Heart size={28} color={liked ? '#ff3b5c' : '#fff'} fill={liked ? '#ff3b5c' : 'transparent'} />
                    <Text style={styles.actionText}>{formatNumber(item.likes)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                    <MessageCircle size={28} color="#fff" />
                    <Text style={styles.actionText}>{formatNumber(item.comments)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                    <Share2 size={28} color="#fff" />
                    <Text style={styles.actionText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                    <MoreVertical size={28} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.bottomContainer}>
                <View style={styles.userInfo}>
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                    <Text style={styles.username}>{item.username}</Text>
                    <TouchableOpacity style={[styles.followButton, item.isSubscribed && { backgroundColor: 'transparent', borderWidth: 0 }]}>
                        <Text style={styles.followText}>{item.isSubscribed ? 'Subscribed' : 'Subscribe'}</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.description}>{item.description}</Text>
            </View>
        </View>
    );
};

export default function DotsScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const [activeIndex, setActiveIndex] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState('mix');
    const [dots, setDots] = useState<DotData[]>(MOCK_DOTS);
    const [loading, setLoading] = useState(false);
    const [showCategories, setShowCategories] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFillFilter, setActiveFillFilter] = useState('All');
    const flatListRef = useRef<FlatList>(null);

    // Map category to postType
    const categoryToPostType: Record<string, string> = {
        lills: 'LILL',
        fills: 'FILL',
        auds: 'AUD',
        channels: 'CHAN',
        chapters: 'CHAPTER',
        xrays: 'XRAY',
        pupds: 'PULLUPDOWN',
        bts: 'BTS',
    };

    const fetchDots = useCallback(async (category: string) => {
        setLoading(true);
        try {
            let query = supabase
                .from('Post')
                .select(`
                    id,
                    content,
                    postType,
                    createdAt,
                    likes,
                    comments,
                    userId,
                    user:User (
                        id,
                        name,
                        followersCount,
                        profile:Profile (avatarUrl)
                    ),
                    media:Media (url, type),
                    lillData:Lill (videoUrl, thumbnailUrl),
                    fillData:Fill (videoUrl, thumbnailUrl),
                    audData:Aud (audioUrl, coverImageUrl),
                    xrayData:Xray (topLayerUrl, bottomLayerUrl),
                    chanData:Chan (coverImageUrl)
                `)
                .eq('visibility', 'PUBLIC')
                .order('createdAt', { ascending: false })
                .limit(20);

            if (category === 'bloom') {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: subs } = await supabase.from('Subscription').select('subscribedToId').eq('subscriberId', user.id);
                    if (subs && subs.length > 0) {
                        query = query.in('userId', subs.map(s => s.subscribedToId));
                    } else {
                        setDots([]);
                        setLoading(false);
                        return;
                    }
                }
            } else if (category !== 'mix' && categoryToPostType[category]) {
                query = query.eq('postType', categoryToPostType[category]);
            }

            const { data, error } = await query;

            if (data && data.length > 0) {
                const formattedDots = data.map((post: any) => {
                    let mediaUrl = '';
                    let mediaType: 'video' | 'image' | 'audio' = 'image';

                    if (post.lillData?.videoUrl) {
                        mediaUrl = post.lillData.videoUrl;
                        mediaType = 'video';
                    } else if (post.fillData?.videoUrl) {
                        mediaUrl = post.fillData.videoUrl;
                        mediaType = 'video';
                    } else if (post.xrayData?.topLayerUrl) {
                        mediaUrl = post.xrayData.topLayerUrl;
                        mediaType = 'image';
                    } else if (post.chanData?.coverImageUrl) {
                        mediaUrl = post.chanData.coverImageUrl;
                        mediaType = 'image';
                    } else if (post.audData?.audioUrl) {
                        mediaUrl = post.audData.coverImageUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800';
                        mediaType = 'audio';
                    } else if (post.media?.[0]?.url) {
                        mediaUrl = post.media[0].url;
                        mediaType = post.media[0].type === 'VIDEO' ? 'video' : 'image';
                    }

                    // Fallback for demo if no real media found
                    if (!mediaUrl) mediaUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800';

                    return {
                        id: post.id,
                        postId: post.id,
                        userId: post.userId,
                        username: post.user?.name || 'User',
                        avatar: post.user?.profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${post.userId}`,
                        description: post.content || '',
                        likes: post.likes || 0,
                        comments: post.comments || 0,
                        mediaUrl,
                        mediaType,
                        category: post.postType?.toLowerCase() || 'mix',
                        isSubscribed: false, // simplified for now due to complexity of join
                        followersCount: post.user?.followersCount || 0,
                        createdAt: post.createdAt
                    };
                });
                setDots(formattedDots);
            } else {
                setDots(MOCK_DOTS); // Fallback to mock if empty response (e.g. no internet or empty db) to show UI
            }
        } catch (error) {
            console.error('Error fetching dots:', error);
            setDots(MOCK_DOTS);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDots(selectedCategory);
    }, [selectedCategory, fetchDots]);

    const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0 && viewableItems[0].index !== null) {
            setActiveIndex(viewableItems[0].index);
        }
    }, []);

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
    const isFills = selectedCategory === 'fills';

    // Featured Hero Item (Best from the current list or first)
    // Avoid reduce on empty array
    const featuredItem = dots.length > 0
        ? dots.reduce((prev, current) => (prev.likes > current.likes) ? prev : current)
        : (dots.length > 0 ? dots[0] : null);

    const FillItem = ({ item }: { item: DotData }) => (
        <TouchableOpacity style={{ marginBottom: 24, paddingHorizontal: 0 }} activeOpacity={0.9}>
            {/* Thumbnail - 16:9 Aspect Ratio enforced for Fills */}
            <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#1a1a1a', borderRadius: 0 }}>
                {item.mediaType === 'video' ? (
                    <Video
                        source={{ uri: item.mediaUrl }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay={false}
                    />
                ) : (
                    <Image source={{ uri: item.mediaUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                )}
                <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>4:20</Text>
                </View>
            </View>

            {/* Meta */}
            <View style={{ flexDirection: 'row', paddingTop: 12, paddingHorizontal: 12, gap: 12 }}>
                <Image source={{ uri: item.avatar }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#333' }} />
                <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '500', lineHeight: 22 }} numberOfLines={2}>
                        {item.description || "No Title"}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: '#aaa', fontSize: 12 }}>{item.username}</Text>
                    </View>
                    <Text style={{ color: '#aaa', fontSize: 12 }}>
                        {formatNumber(item.likes)} likes • {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Just now'}
                    </Text>
                </View>
                <TouchableOpacity style={{ padding: 4 }}>
                    <MoreVertical size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    const renderHeader = () => {
        if (!isFills) return null;
        return (
            <View style={{ paddingTop: 140, paddingBottom: 10 }}>
                {/* Hero Section Mobile */}
                {featuredItem && (
                    <View style={{ marginBottom: 20, paddingHorizontal: 12 }}>
                        <View style={{ height: 200, borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
                            <Image
                                source={{ uri: featuredItem.mediaUrl }}
                                style={StyleSheet.absoluteFillObject}
                                resizeMode="cover"
                            />
                            <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFillObject} />
                            <View style={{ position: 'absolute', bottom: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 24, lineHeight: 28 }}>Featured Content</Text>
                                    <Text style={{ color: '#ddd', fontSize: 14, marginTop: 4 }} numberOfLines={2}>{featuredItem.description}</Text>
                                </View>
                                <TouchableOpacity style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FF0050', justifyContent: 'center', alignItems: 'center' }}>
                                    <Play fill="#fff" size={20} style={{ marginLeft: 2 }} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}

                {/* Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
                    {FILL_FILTERS.map((opt, i) => (
                        <TouchableOpacity
                            key={opt}
                            style={{
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                                backgroundColor: activeFillFilter === opt ? '#fff' : '#222',
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: activeFillFilter === opt ? '#fff' : '#333'
                            }}
                            onPress={() => setActiveFillFilter(opt)}
                        >
                            <Text style={{ color: activeFillFilter === opt ? '#000' : '#fff', fontSize: 13, fontWeight: '600' }}>{opt}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={[styles.header, isFills && { backgroundColor: '#0f0f0f' }]}>
                {showCategories ? (
                    <>
                        <View style={styles.headerRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                                    <ChevronLeft size={28} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.headerTitle}>Dots</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowCategories(false)} style={styles.closeButton}>
                                <Text style={styles.closeText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Categories */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    onPress={() => setSelectedCategory(cat.id)}
                                    style={[styles.categoryTab, selectedCategory === cat.id && styles.categoryTabActive]}
                                >
                                    <Text style={[styles.categoryText, selectedCategory === cat.id && styles.categoryTextActive]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {isFills && (
                            /* Search bar */
                            <View style={{ paddingHorizontal: 16 }}>
                                <View style={styles.searchContainer}>
                                    <Search size={18} color="rgba(255,255,255,0.5)" style={{ marginRight: 8 }} />
                                    <TextInput
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        placeholder="Search"
                                        placeholderTextColor="rgba(255,255,255,0.5)"
                                        style={styles.searchInput}
                                    />
                                    <View style={{ backgroundColor: '#FF0050', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: -4 }}>
                                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>Search</Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </>
                ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16 }}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.collapsedCategoryDot}>
                            <ChevronLeft size={20} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowCategories(true)} style={styles.collapsedCategoryDot}>
                            <DotIcon size={14} color="#fff" fill="#fff" />
                        </TouchableOpacity>
                    </View>
                )}
            </SafeAreaView>

            <FlatList
                ref={flatListRef}
                data={dots}
                renderItem={({ item, index }) => isFills ? <FillItem item={item} /> : <DotItem item={item} isActive={index === activeIndex} autoScroll={false} onVideoEnd={() => { }} onToggleAutoScroll={() => { }} onSubscribe={() => { }} />}
                ListHeaderComponent={renderHeader()}
                keyExtractor={(item) => item.id}
                pagingEnabled={!isFills}
                showsVerticalScrollIndicator={false}
                snapToInterval={!isFills ? SCREEN_HEIGHT : undefined}
                decelerationRate={!isFills ? "fast" : "normal"}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                contentContainerStyle={isFills ? { paddingBottom: 100 } : undefined}
                style={{ backgroundColor: '#000' }}
                ListEmptyComponent={
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 }}>
                        {loading ? <ActivityIndicator size="large" color="#FF0050" /> : <Text style={{ color: '#fff' }}>No items found</Text>}
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, paddingBottom: 8 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 16, paddingTop: 8 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    backButton: {},
    closeButton: {},
    closeText: { color: '#fff', fontSize: 20 },
    categoryTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)' },
    categoryTabActive: { backgroundColor: '#fff' },
    categoryText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
    categoryTextActive: { color: '#000' },
    collapsedCategoryDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },

    // Dot Items
    dotContainer: { width: SCREEN_WIDTH, justifyContent: 'flex-end', backgroundColor: '#000' },
    playPauseOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
    actionsContainer: { position: 'absolute', right: 10, bottom: 100, alignItems: 'center', gap: 16 },
    actionButton: { alignItems: 'center' },
    actionText: { color: '#fff', fontSize: 10, marginTop: 4, fontWeight: '600' },
    bottomContainer: { position: 'absolute', left: 0, bottom: 0, right: 60, padding: 16, paddingBottom: 24, justifyContent: 'flex-end' },
    userInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#fff' },
    username: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginLeft: 10 },
    followButton: { marginLeft: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#fff', borderRadius: 4 },
    followText: { color: '#fff', fontWeight: '600', fontSize: 12 },
    description: { color: '#fff', fontSize: 13, lineHeight: 18 },

    // Search
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 24, paddingLeft: 12, paddingRight: 4, height: 44, borderWidth: 1, borderColor: '#333' },
    searchInput: { flex: 1, color: '#fff', fontSize: 14, height: '100%' },
});
