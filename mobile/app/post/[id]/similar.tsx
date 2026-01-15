import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Dimensions, StyleSheet, ViewToken } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { ArrowLeft, Heart, MessageCircle, Share2, Play } from 'lucide-react-native';
import { useIsFocused } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';

const { width } = Dimensions.get('window');

// Data Types
interface SimilarPost {
    id: string;
    content: string;
    user: {
        id: string;
        name: string;
        profile: { displayName: string; avatarUrl: string };
    };
    postMedia: { url: string; type: string }[];
    postType?: string;
    matchReason?: string;
    slashes?: { tag: string }[];

    overlap?: number;
    topBubbles?: { mediaUrl: string; mediaType: string }[];
}

// Card Component mimicking FloatingCard style
const SimilarPostCard = React.memo(({ item, isActive, onPress }: { item: SimilarPost; isActive: boolean; onPress: () => void }) => {
    const isFocused = useIsFocused();
    const shouldPlay = isActive && isFocused;

    let coverUrl: string | null = null;
    let videoUrl: string | null = null;

    if (item.postMedia && item.postMedia.length > 0) {
        const firstMedia = item.postMedia[0];
        if (firstMedia.type?.toUpperCase() === 'VIDEO') {
            videoUrl = firstMedia.url;
            // Try finding a cover image
            const img = item.postMedia.find(m => m.type?.toUpperCase() === 'IMAGE');
            coverUrl = img ? img.url : null; // Logic: specific cover or nothing (video handles poster if needed or we use fallback)
        } else {
            coverUrl = firstMedia.url;
        }
    }

    return (
        <View style={styles.cardContainer}>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={onPress}
                style={styles.cardInner}
            >
                {/* Media Layer */}
                <View style={styles.mediaContainer}>
                    {shouldPlay && videoUrl ? (
                        <Video
                            source={{ uri: videoUrl }}
                            style={styles.media}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={true}
                            isLooping
                            isMuted={true}
                        />
                    ) : (
                        <>
                            {coverUrl ? (
                                <Image source={{ uri: coverUrl }} style={styles.media} resizeMode="cover" />
                            ) : videoUrl ? (
                                // Fallback if no cover but video exists (paused)
                                <Video
                                    source={{ uri: videoUrl }}
                                    style={styles.media}
                                    resizeMode={ResizeMode.COVER}
                                    shouldPlay={false}
                                    isMuted={true}
                                />
                            ) : (
                                <View style={[styles.media, { backgroundColor: '#1a1a1a' }]} />
                            )}

                            {/* Play Icon Overlay for Video when not playing */}
                            {videoUrl && !isActive && (
                                <View style={styles.centerOverlay}>
                                    <View style={styles.playIconContainer}>
                                        <Play size={20} color="white" fill="white" />
                                    </View>
                                </View>
                            )}
                        </>
                    )}

                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.gradient}
                    />
                </View>

                {/* Content Overlay */}
                <View style={styles.contentOverlay}>
                    {/* Header: User & Badge */}
                    <View style={styles.cardHeader}>
                        <View style={styles.userInfo}>
                            <Image
                                source={{ uri: item.user.profile?.avatarUrl }}
                                style={styles.avatar}
                            />
                            <View style={{ marginLeft: 8 }}>
                                <Text style={styles.userName}>{item.user.profile?.displayName || item.user.name}</Text>
                                {item.matchReason && (
                                    <Text style={styles.matchReason}>{item.matchReason}</Text>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Text Content */}
                    {item.content ? (
                        <Text style={styles.postContent} numberOfLines={2}>
                            {item.content}
                        </Text>
                    ) : null}

                    {/* Slashes/Tags */}
                    {item.slashes && item.slashes.length > 0 && (
                        <View style={styles.tagsContainer}>
                            {item.slashes.slice(0, 3).map((slash, i) => (
                                <Text key={i} style={styles.tag}>#{slash.tag}</Text>
                            ))}
                        </View>
                    )}
                </View>

                {/* Reaction Bubbles (Overlay) */}
                {item.topBubbles && item.topBubbles.length > 0 && (
                    <View style={{ position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', zIndex: 20 }}>
                        <View style={{ flexDirection: 'row', marginLeft: 4 }}>
                            {item.topBubbles.slice(0, 3).map((bubble, i) => (
                                <View
                                    key={i}
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 14,
                                        borderWidth: 1.5,
                                        borderColor: '#1a1a1a',
                                        backgroundColor: '#333',
                                        overflow: 'hidden',
                                        marginLeft: -10,
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {bubble.mediaType === 'VIDEO' ? (
                                        <Video
                                            source={{ uri: bubble.mediaUrl }}
                                            style={{ width: '100%', height: '100%' }}
                                            resizeMode={ResizeMode.COVER}
                                            shouldPlay={isActive}
                                            isLooping
                                            isMuted={true}
                                        />
                                    ) : (
                                        <Image source={{ uri: bubble.mediaUrl }} style={{ width: '100%', height: '100%' }} />
                                    )}
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
});

export default function SimilarPostsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { session } = useAuth();
    const [posts, setPosts] = useState<SimilarPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Viewability Config
    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 80, // High threshold to ensure focus
        waitForInteraction: false,
    });

    const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            // Auto-play the first fully visible item
            setActiveId(viewableItems[0].key);
        }
    }, []);

    useEffect(() => {
        if (id) fetchSimilarPosts();
    }, [id]);

    const fetchSourcePost = async () => {
        const { data } = await supabase
            .from('Post')
            .select('id, postType, content')
            .eq('id', id)
            .single();
        return data;
    };

    const fetchSimilarPosts = async () => {
        try {
            setLoading(true);
            const source = await fetchSourcePost();

            // --- Safety Filtering ---
            let excludedUserIds: string[] = [];
            let hiddenPostIds: string[] = [];

            // Get current user directly to avoid race condition
            const { data: { user } } = await supabase.auth.getUser();
            const myId = user?.id;

            if (myId) {
                const [muted, blocked, hidden] = await Promise.all([
                    supabase.from('MutedUser').select('mutedUserId').eq('muterId', myId),
                    supabase.from('BlockedUser').select('blockedId').eq('blockerId', myId),
                    supabase.from('HiddenPost').select('postId').eq('userId', myId)
                ]);

                if (muted.data) excludedUserIds.push(...muted.data.map(m => m.mutedUserId));
                if (blocked.data) excludedUserIds.push(...blocked.data.map(b => b.blockedId));
                if (hidden.data) hiddenPostIds.push(...hidden.data.map(h => h.postId));
            }

            let query = supabase
                .from('Post')
                .select(`
                    id,
                    content,
                    postType,
                    createdAt,
                    user:User (
                        id,
                        name,
                        profile:Profile (displayName, avatarUrl)
                    ),
                    postMedia:PostMedia (
                        media:Media (url, type, variant)
                    ),
                    topBubbles:ReactionBubble (
                        mediaUrl,
                        mediaType
                    )
                `)
                .neq('id', id)
                .eq('visibility', 'PUBLIC')
                .order('createdAt', { ascending: false })
                .limit(50);

            // Apply safety filters
            if (excludedUserIds.length > 0) {
                query = query.not('userId', 'in', `(${excludedUserIds.join(',')})`);
            }
            if (hiddenPostIds.length > 0) {
                query = query.not('id', 'in', `(${hiddenPostIds.join(',')})`);
            }

            const { data, error } = await query;
            if (error) throw error;

            let mapped: SimilarPost[] = (data || []).map((post: any) => {
                const isSameType = source?.postType === post.postType;
                return {
                    id: post.id,
                    content: post.content,
                    user: {
                        id: post.user?.id,
                        name: post.user?.name || 'User',
                        profile: post.user?.profile || { displayName: 'User', avatarUrl: '' }
                    },
                    postMedia: (post.postMedia || []).map((pm: any) => pm.media).filter(Boolean),
                    postType: post.postType,
                    matchReason: isSameType ? 'Similar Vibe' : 'Recent',
                    slashes: [],

                    overlap: isSameType ? 1 : 0,
                    topBubbles: post.topBubbles || []
                };
            });

            mapped = mapped.sort((a, b) => b.overlap - a.overlap);
            setPosts(mapped);

            // Set initial active
            if (mapped.length > 0) setActiveId(mapped[0].id);

        } catch (error) {
            console.error('Error fetching similar posts:', error);
            setPosts([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft color="white" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Similar Vibes</Text>
                </View>

                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color="#fff" />
                    </View>
                ) : (
                    <FlatList
                        data={posts}
                        renderItem={({ item }) => (
                            <SimilarPostCard
                                item={item}
                                isActive={item.id === activeId}
                                onPress={() => router.push(`/post/${item.id}` as any)}
                            />
                        )}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        onViewableItemsChanged={onViewableItemsChanged}
                        viewabilityConfig={viewabilityConfig.current}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
        backgroundColor: 'black',
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    // Card Styles
    cardContainer: {
        marginBottom: 24,
        borderRadius: 24,
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 5,
    },
    cardInner: {
        backgroundColor: '#1a1a1a',
        borderRadius: 24,
        overflow: 'hidden',
        width: '100%',
        aspectRatio: 0.8, // Tall-ish Card ratio
    },
    mediaContainer: {
        flex: 1,
        position: 'relative',
    },
    media: {
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a1a',
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '50%',
    },
    centerOverlay: {
        position: 'absolute',
        inset: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    playIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: 'white',
    },
    userName: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    matchReason: {
        color: '#ccc',
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    postContent: {
        color: 'white',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    tag: {
        color: '#aaa',
        fontSize: 12,
        fontWeight: '600',
    },
});
