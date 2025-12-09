import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Dimensions, TouchableOpacity, Image, StyleSheet, FlatList, ViewToken, ActivityIndicator, ScrollView, Animated, PanResponder, Share as RNShare } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MessageCircle, Share2, MoreVertical, Play, Pause, Circle as DotIcon } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import ShareCardModal from '../../components/ShareCardModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Category types for content filtering
const CATEGORIES = [
    { id: 'mix', label: 'Mix' },
    { id: 'fills', label: 'Fills' },
    { id: 'lills', label: 'Lills' },
    { id: 'auds', label: 'Auds' },
    { id: 'channels', label: 'Channels' },
    { id: 'chapters', label: 'Chapters' },
    { id: 'xrays', label: 'X Rays' },
    { id: 'pupds', label: 'Pupds' },
];

// Fallback mock data
const MOCK_DOTS = [
    {
        id: '1',
        username: 'traveler_jane',
        avatar: 'https://api.dicebear.com/7.x/avataaars/png?seed=jane',
        description: 'Beautiful sunset at the beach 🌅 #travel #sunset #vibes',
        likes: 12400,
        comments: 234,
        mediaUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600',
        category: 'mix',
    },
    {
        id: '2',
        username: 'foodie_mike',
        avatar: 'https://api.dicebear.com/7.x/avataaars/png?seed=mike',
        description: 'Made this amazing pasta today! Recipe in bio 🍝',
        likes: 8900,
        comments: 156,
        mediaUrl: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600',
        category: 'fills',
    },
    {
        id: '3',
        username: 'fitness_guru',
        avatar: 'https://api.dicebear.com/7.x/avataaars/png?seed=guru',
        description: 'Morning workout routine 💪 Stay consistent!',
        likes: 23100,
        comments: 567,
        mediaUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600',
        category: 'lills',
    },
    {
        id: '4',
        username: 'nature_lover',
        avatar: 'https://api.dicebear.com/7.x/avataaars/png?seed=nature',
        description: 'Found this hidden waterfall 🌊 #nature #explore',
        likes: 45000,
        comments: 890,
        mediaUrl: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=600',
        category: 'auds',
    },
    {
        id: '5',
        username: 'city_explorer',
        avatar: 'https://api.dicebear.com/7.x/avataaars/png?seed=city',
        description: 'City lights never get old ✨ #urban #nightlife',
        likes: 18700,
        comments: 312,
        mediaUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=600',
        category: 'channels',
    },
];

interface DotData {
    id: string;
    username: string;
    avatar: string;
    description: string;
    likes: number;
    comments: number;
    mediaUrl: string;
    category: string;
}

interface DotItemProps {
    item: DotData;
    isActive: boolean;
}

const DotItem = ({ item, isActive }: DotItemProps) => {
    const { colors } = useTheme();
    const { session } = useAuth();
    const [liked, setLiked] = useState(false);
    const [isPlaying, setIsPlaying] = useState(true);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [showShareModal, setShowShareModal] = useState(false);
    const [dbUserId, setDbUserId] = useState<string | null>(null);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                const isInCorner = (locationX < 100 || locationX > SCREEN_WIDTH - 100) &&
                    (locationY < 100 || locationY > SCREEN_HEIGHT - 100);
                if (isInCorner) {
                    setPlaybackSpeed(2);
                }
            },
            onPanResponderMove: (evt, gestureState) => {
                if (Math.abs(gestureState.dx) > 10) {
                    console.log('Seeking:', gestureState.dx);
                }
            },
            onPanResponderRelease: () => {
                setPlaybackSpeed(1);
            },
        })
    ).current;

    useEffect(() => {
        const resolveUser = async () => {
            if (session?.user?.email) {
                const { data } = await supabase
                    .from('User')
                    .select('id')
                    .eq('email', session.user.email)
                    .single();
                if (data) setDbUserId(data.id);
            }
        };
        resolveUser();
    }, [session?.user?.email]);

    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const togglePlayPause = () => {
        setIsPlaying(!isPlaying);
    };

    const handleShare = () => {
        setShowShareModal(true);
    };

    return (
        <View style={[styles.dotContainer, { height: SCREEN_HEIGHT }]} {...panResponder.panHandlers}>
            <TouchableOpacity
                activeOpacity={1}
                onPress={togglePlayPause}
                style={StyleSheet.absoluteFillObject}
            >
                <Image
                    source={{ uri: item.mediaUrl }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={[StyleSheet.absoluteFillObject, { top: '50%' }]}
                />
            </TouchableOpacity>

            {!isPlaying && (
                <TouchableOpacity
                    style={styles.playPauseOverlay}
                    onPress={togglePlayPause}
                >
                    <Play size={64} color="#fff" fill="#fff" />
                </TouchableOpacity>
            )}

            {playbackSpeed > 1 && (
                <View style={styles.speedIndicator}>
                    <Text style={styles.speedText}>{playbackSpeed}x</Text>
                </View>
            )}

            <View style={styles.actionsContainer}>
                <TouchableOpacity style={styles.actionButton} onPress={togglePlayPause}>
                    {isPlaying ? (
                        <Pause size={22} color="#fff" />
                    ) : (
                        <Play size={22} color="#fff" />
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={() => setLiked(!liked)}>
                    <Heart
                        size={22}
                        color={liked ? '#ff3b5c' : '#fff'}
                        fill={liked ? '#ff3b5c' : 'transparent'}
                    />
                    <Text style={styles.actionText}>{formatNumber(item.likes + (liked ? 1 : 0))}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton}>
                    <MessageCircle size={22} color="#fff" />
                    <Text style={styles.actionText}>{formatNumber(item.comments)}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                    <Share2 size={22} color="#fff" />
                    <Text style={styles.actionText}>Share</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton}>
                    <MoreVertical size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.bottomContainer}>
                <View style={styles.userInfo}>
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                    <Text style={styles.username}>{item.username}</Text>
                    <TouchableOpacity style={styles.followButton}>
                        <Text style={styles.followText}>Follow</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.description} numberOfLines={2}>
                    {item.description}
                </Text>
            </View>

            {showShareModal && dbUserId && (
                <ShareCardModal
                    visible={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    cardCode={item.id}
                    cardOwnerName={item.username}
                />
            )}
        </View>
    );
};

export default function DotsScreen() {
    const { colors, mode } = useTheme();
    const [activeIndex, setActiveIndex] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState('mix');
    const [dots, setDots] = useState<DotData[]>(MOCK_DOTS);
    const [loading, setLoading] = useState(false);
    const [showCategories, setShowCategories] = useState(true);
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

    // Fetch posts from Supabase Post table
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
                    user:User (
                        name,
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

            // Filter by postType if not mix
            if (category !== 'mix' && categoryToPostType[category]) {
                query = query.eq('postType', categoryToPostType[category]);
            }

            const { data, error } = await query;

            if (error) {
                console.log('Supabase fetch error, using mock data:', error.message);
                const filtered = category === 'mix'
                    ? MOCK_DOTS
                    : MOCK_DOTS.filter(d => d.category === category);
                setDots(filtered.length > 0 ? filtered : MOCK_DOTS);
            } else if (data && data.length > 0) {
                const formattedDots = data.map((post: any) => {
                    // Get media URL based on post type
                    let mediaUrl = '';
                    if (post.lillData?.videoUrl) mediaUrl = post.lillData.thumbnailUrl || post.lillData.videoUrl;
                    else if (post.fillData?.videoUrl) mediaUrl = post.fillData.thumbnailUrl || post.fillData.videoUrl;
                    else if (post.xrayData?.topLayerUrl) mediaUrl = post.xrayData.topLayerUrl;
                    else if (post.chanData?.coverImageUrl) mediaUrl = post.chanData.coverImageUrl;
                    else if (post.audData?.coverImageUrl) mediaUrl = post.audData.coverImageUrl;
                    else if (post.media?.[0]?.url) mediaUrl = post.media[0].url;

                    return {
                        id: post.id,
                        username: post.user?.name || 'user',
                        avatar: post.user?.profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${post.id}`,
                        description: post.content || '',
                        likes: 0,
                        comments: 0,
                        mediaUrl: mediaUrl || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600',
                        category: post.postType?.toLowerCase() || 'mix',
                    };
                });
                setDots(formattedDots);
            } else {
                const filtered = category === 'mix'
                    ? MOCK_DOTS
                    : MOCK_DOTS.filter(d => d.category === category);
                setDots(filtered.length > 0 ? filtered : MOCK_DOTS);
            }
        } catch (e) {
            console.log('Network error, using mock data');
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

    const handleCategoryChange = (categoryId: string) => {
        setSelectedCategory(categoryId);
        setShowCategories(false);
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    };

    const toggleCategories = () => {
        setShowCategories(!showCategories);
    };

    const renderItem = useCallback(({ item, index }: { item: DotData; index: number }) => (
        <DotItem item={item} isActive={index === activeIndex} />
    ), [activeIndex]);

    return (
        <View style={[styles.container, { backgroundColor: '#000' }]}>
            {/* Header with Collapsible Category Tabs */}
            <SafeAreaView style={styles.header}>
                {showCategories ? (
                    <>
                        <View style={styles.headerRow}>
                            <Text style={styles.headerTitle}>Dots</Text>
                            <TouchableOpacity onPress={toggleCategories} style={styles.closeButton}>
                                <Text style={styles.closeText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.categoryScroll}
                            contentContainerStyle={styles.categoryContainer}
                        >
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    onPress={() => handleCategoryChange(cat.id)}
                                    style={[
                                        styles.categoryTab,
                                        selectedCategory === cat.id && styles.categoryTabActive
                                    ]}
                                >
                                    <Text style={[
                                        styles.categoryText,
                                        selectedCategory === cat.id && styles.categoryTextActive
                                    ]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </>
                ) : (
                    <TouchableOpacity
                        style={styles.collapsedCategoryDot}
                        onPress={toggleCategories}
                    >
                        <DotIcon size={14} color="#fff" fill="#fff" />
                    </TouchableOpacity>
                )}
            </SafeAreaView>

            {/* Loading Indicator */}
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            )}

            {/* Vertical Scrollable Dots */}
            <FlatList
                ref={flatListRef}
                data={dots}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                pagingEnabled
                showsVerticalScrollIndicator={false}
                snapToInterval={SCREEN_HEIGHT}
                decelerationRate="fast"
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                removeClippedSubviews
                maxToRenderPerBatch={2}
                windowSize={3}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    categoryScroll: {
        flexGrow: 0,
    },
    categoryContainer: {
        gap: 8,
        paddingRight: 16,
    },
    categoryTab: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    categoryTabActive: {
        backgroundColor: '#fff',
    },
    categoryText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
        fontWeight: '600',
    },
    categoryTextActive: {
        color: '#000',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 50,
    },
    dotContainer: {
        width: SCREEN_WIDTH,
        justifyContent: 'flex-end',
    },
    playPauseOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    speedIndicator: {
        position: 'absolute',
        top: 100,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    speedText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    actionsContainer: {
        position: 'absolute',
        right: 10,
        bottom: 90,
        alignItems: 'center',
        gap: 12,
    },
    actionButton: {
        alignItems: 'center',
    },
    actionText: {
        color: '#fff',
        fontSize: 10,
        marginTop: 2,
        fontWeight: '600',
    },
    bottomContainer: {
        paddingHorizontal: 12,
        paddingBottom: 80,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#fff',
    },
    username: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 13,
        marginLeft: 8,
    },
    followButton: {
        marginLeft: 8,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: '#fff',
        borderRadius: 4,
    },
    followText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 11,
    },
    description: {
        color: '#fff',
        fontSize: 12,
        lineHeight: 16,
    },
    collapsedCategoryDot: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    closeButton: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '300',
    },
});
