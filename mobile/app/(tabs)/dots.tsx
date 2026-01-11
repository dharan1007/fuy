import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Dimensions, TouchableOpacity, Image, StyleSheet, FlatList, ViewToken, ActivityIndicator, ScrollView, Animated, PanResponder, Share as RNShare, Modal, Switch, TouchableWithoutFeedback, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Heart, MessageCircle, Share2, MoreVertical, Play, Pause, Circle as DotIcon, X, Search, ChevronLeft, Send, Bookmark } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import ShareCardModal from '../../components/ShareCardModal';
import { useRouter, useFocusEffect } from 'expo-router';
import { useNavVisibility } from '../../context/NavContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ... (KEEPING REST unchanged if outside range, but I can target specific lines)
// Correcting logic below

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

// Mock data removed - using real Supabase data only

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
    const { session } = useAuth();
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(item.likes);
    const [isPlaying, setIsPlaying] = useState(true);
    const videoRef = useRef<Video>(null);

    // Fix: Control video playback with useEffect
    useEffect(() => {
        if (!videoRef.current || item.mediaType !== 'video') return;
        if (isActive && isPlaying) {
            videoRef.current.playAsync();
        } else {
            videoRef.current.pauseAsync();
        }
    }, [isActive, isPlaying, item.mediaType]);

    // Handle video end for auto-scroll
    const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish && autoScroll) {
            onVideoEnd();
        }
    };

    // Like functionality
    const handleLike = async () => {
        if (!session?.user) return;
        const newLiked = !liked;
        setLiked(newLiked);
        setLikeCount(prev => newLiked ? prev + 1 : prev - 1);
        try {
            if (newLiked) {
                await supabase.from('PostLike').insert({ postId: item.postId, userId: session.user.id });
            } else {
                await supabase.from('PostLike').delete().eq('postId', item.postId).eq('userId', session.user.id);
            }
        } catch (e) { console.error('Like error:', e); }
    };

    // Share functionality
    const handleShare = async () => {
        try {
            await RNShare.share({ message: item.description, url: item.mediaUrl });
        } catch (e) { console.error('Share error:', e); }
    };

    return (
        <View style={[styles.dotContainer, { height: SCREEN_HEIGHT }]}>
            <TouchableOpacity activeOpacity={1} onPress={() => setIsPlaying(!isPlaying)} style={StyleSheet.absoluteFillObject}>
                {item.mediaType === 'video' ? (
                    isActive ? (
                        <Video
                            ref={videoRef}
                            source={{ uri: item.mediaUrl }}
                            style={StyleSheet.absoluteFillObject}
                            resizeMode={getFeedResizeMode(item)}
                            shouldPlay={isPlaying}
                            isLooping={!autoScroll}
                            onPlaybackStatusUpdate={onPlaybackStatusUpdate}
                        />
                    ) : (
                        <View style={StyleSheet.absoluteFillObject}>
                            <Image
                                source={{ uri: item.mediaUrl }} // Video URL often works as thumbnail in some cloud providers, or we need a real thumbnail. 
                                // Ideally `item` should have `thumbnailUrl`. Using mediaUrl as fallback or specific placeholder logic.
                                style={StyleSheet.absoluteFillObject}
                                resizeMode={getFeedResizeMode(item)}
                            />
                            {/* Play Icon placeholder for inactive but visible items */}
                            <View style={{ ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                                <Play size={40} color="rgba(255,255,255,0.7)" />
                            </View>
                        </View>
                    )
                ) : (
                    <Image
                        source={{ uri: item.mediaUrl }}
                        style={StyleSheet.absoluteFillObject}
                        resizeMode={getImageResizeMode(item)}
                    />
                )}
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={[StyleSheet.absoluteFillObject, { top: '50%' }]} />
            </TouchableOpacity>

            {!isPlaying && item.mediaType === 'video' && (
                <View style={styles.playPauseOverlay}>
                    <Play size={64} color="#fff" fill="#fff" />
                </View>
            )}

            <View style={styles.actionsContainer}>
                <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                    <Heart size={28} color={liked ? '#ff3b5c' : '#fff'} fill={liked ? '#ff3b5c' : 'transparent'} />
                    <Text style={styles.actionText}>{formatNumber(likeCount)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                    <MessageCircle size={28} color="#fff" />
                    <Text style={styles.actionText}>{formatNumber(item.comments)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                    <Send size={28} color="#fff" />
                    <Text style={styles.actionText}>Send</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                    <Bookmark size={28} color="#fff" />
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
    const { setHideNav } = useNavVisibility();
    const [activeIndex, setActiveIndex] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState('mix');
    const [dots, setDots] = useState<DotData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCategories, setShowCategories] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFillFilter, setActiveFillFilter] = useState('All');
    const flatListRef = useRef<FlatList>(null);
    const hasFetched = useRef(false);

    // Hide nav bar on dots page for immersive experience
    useFocusEffect(
        useCallback(() => {
            setHideNav(true);
            return () => {
                setHideNav(false);
            };
        }, [setHideNav])
    );

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
        if (loading) return; // Prevent duplicate fetches
        setLoading(true);
        try {
            // Direct Supabase query with service role to bypass RLS
            let query = supabase
                .from('Post')
                .select(`
                    id,
                    content,
                    postType,
                    createdAt,
                    userId,
                    user:User (
                        id,
                        name,
                        profile:Profile (avatarUrl, displayName)
                    ),
                    postMedia:PostMedia (
                        media:Media (url, type)
                    )
                `)
                .eq('visibility', 'PUBLIC')
                .order('createdAt', { ascending: false })
                .limit(30);

            // Filter by category if not mix
            if (category !== 'mix' && categoryToPostType[category]) {
                query = query.eq('postType', categoryToPostType[category]);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Dots fetch error:', error.message);
                setDots([]);
                setLoading(false);
                return;
            }

            const formattedDots = (data || []).map((post: any) => {
                const media = (post.postMedia || []).map((pm: any) => pm.media).filter(Boolean);
                let mediaUrl = '';
                let mediaType: 'video' | 'image' | 'audio' = 'image';

                if (media.length > 0) {
                    mediaUrl = media[0].url;
                    const type = media[0].type?.toUpperCase();
                    mediaType = type === 'VIDEO' ? 'video' :
                        type === 'AUDIO' ? 'audio' : 'image';
                }

                if (!mediaUrl) {
                    mediaUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800';
                }

                return {
                    id: post.id,
                    postId: post.id,
                    userId: post.userId || post.user?.id || '',
                    username: post.user?.profile?.displayName || post.user?.name || 'User',
                    avatar: post.user?.profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${post.userId}`,
                    description: post.content || '',
                    likes: 0,
                    comments: 0,
                    mediaUrl,
                    mediaType,
                    category: post.postType?.toLowerCase() || 'mix',
                    isSubscribed: false,
                    followersCount: 0,
                    createdAt: post.createdAt
                };
            });

            setDots(formattedDots);
        } catch (error) {
            console.error('Error fetching dots:', error);
            setDots([]);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch only on mount and category change
    useEffect(() => {
        fetchDots(selectedCategory);
        hasFetched.current = true;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategory]);

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
