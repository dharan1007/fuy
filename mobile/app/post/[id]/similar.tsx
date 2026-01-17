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
import SharePostModal from '../../../components/SharePostModal';
import FeedPostItem from '../../../components/FeedPostItem';
import CommentsModal from '../../../components/CommentsModal';
import PostOptionsModal from '../../../components/PostOptionsModal';
import { useTheme } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { MediaUploadService } from '../../../services/MediaUploadService';
import { useColorScheme } from 'nativewind';
import CustomToast from '../../../components/CustomToast';

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

    // Add missing FeedPost fields
    reactionCounts?: Record<string, number>;
    userReaction?: string | null;
    commentCount?: number;
    shareCount?: number;
    views?: number;
}




export default function SimilarPostsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { session } = useAuth();
    const { colors } = useTheme();
    const { colorScheme } = useColorScheme();
    const isScreenFocused = useIsFocused(); // useIsFocused hook

    const [posts, setPosts] = useState<SimilarPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeId, setActiveId] = useState<string | null>(null);

    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [postToShare, setPostToShare] = useState<any>(null);

    // Interaction State
    const [commentsModalVisible, setCommentsModalVisible] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);
    const [postForOptions, setPostForOptions] = useState<any>(null);
    const [uploadingBubble, setUploadingBubble] = useState(false);

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

    const handleSharePress = useCallback((item: SimilarPost) => {
        setPostToShare({
            id: item.id,
            content: item.content,
            user: item.user,
            postMedia: item.postMedia.map(m => ({ url: m.url, type: m.type?.toUpperCase() as any }))
        });
        setShareModalVisible(true);
    }, []);

    useEffect(() => {
        if (id) fetchSimilarPosts();
    }, [id]);

    const fetchSourcePost = async () => {
        const { data } = await supabase
            .from('Post')
            .select(`
                id,
                content,
                postType,
                createdAt,
                shareCount,
                user:User (
                    id,
                    name,
                    profile:Profile (displayName, avatarUrl, location)
                ),
                postMedia:PostMedia (
                    media:Media (url, type, variant)
                ),
                topBubbles:ReactionBubble (
                    mediaUrl,
                    mediaType
                ),
                reactions:Reaction (
                    type,
                    userId
                ),
                comments:PostComment (
                    id
                ),
                likes:PostLike (
                    id
                )
            `)
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
                        media (url, type)
                    ),
                    topBubbles:ReactionBubble (
                        mediaUrl,
                        mediaType
                    ),
                    slashes:Slash(tag),
                    reactions:Reaction (
                        type,
                        user:User (name)
                    ),
                    comments:PostComment (
                        id
                    ),
                    likes:PostLike (
                        id
                    ),
                    shareCount
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



            const processPost = (post: any, isSameType: boolean): SimilarPost => {
                const reactions = post.reactions || [];
                const reactionCounts: Record<string, number> = {};
                reactions.forEach((r: any) => {
                    reactionCounts[r.type] = (reactionCounts[r.type] || 0) + 1;
                });
                const myReaction = reactions.find((r: any) => r.userId === myId);

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
                    slashes: post.slashes || [],

                    overlap: isSameType ? 1 : 0,
                    topBubbles: post.topBubbles || [],

                    reactionCounts,
                    userReaction: myReaction ? myReaction.type : null,
                    commentCount: post.comments?.length || 0, // In real app use count aggregate
                    shareCount: post.shareCount || 0,
                    views: 0
                };
            };

            let mapped: SimilarPost[] = (data || []).map((post: any) => {
                const isSameType = source?.postType === post.postType;
                return processPost(post, isSameType);
            });

            mapped = mapped.sort((a, b) => (b.overlap || 0) - (a.overlap || 0));

            // Prepend Source Post
            if (source) {
                const sourceUser = Array.isArray(source.user) ? source.user[0] : source.user;
                // Fix source user mapping for consistent usage
                const fixedSource = {
                    ...source,
                    user: sourceUser
                };

                const sourceMapped = processPost(fixedSource, true);
                sourceMapped.matchReason = 'Source';
                sourceMapped.overlap = 2; // Force top

                mapped.unshift(sourceMapped);
            }

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

    // --- Interaction Handlers ---

    const handleReact = async (postId: string, type: string) => {
        try {
            // Optimistic Update
            setPosts(prev => prev.map(p => {
                if (p.id !== postId) return p;

                const isRemoving = p.userReaction === type;
                const newType = isRemoving ? null : type;

                const newCounts = { ...p.reactionCounts };
                if (isRemoving) {
                    newCounts[type] = Math.max(0, (newCounts[type] || 1) - 1);
                } else {
                    if (p.userReaction) {
                        // Switch reaction
                        newCounts[p.userReaction] = Math.max(0, (newCounts[p.userReaction] || 1) - 1);
                    }
                    newCounts[type] = (newCounts[type] || 0) + 1;
                }

                return { ...p, userReaction: newType, reactionCounts: newCounts };
            }));

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // We need to check if we are removing or adding/switching
            // But simpler to just call an API or do DB calls.
            // For consistency with index.tsx let's assume direct DB access allowed here?
            // Or use the same logic as index.tsx (which uses direct DB calls for reactions unless migrated).
            // Based on index.tsx code (which I can't check right now but typically uses supabase), I will use supabase.

            // Check existing
            const { data: existing } = await supabase
                .from('Reaction')
                .select('id, type')
                .eq('userId', user.id)
                .eq('postId', postId)
                .single();

            if (existing) {
                if (existing.type === type) {
                    await supabase.from('Reaction').delete().eq('id', existing.id);
                } else {
                    await supabase.from('Reaction').update({ type }).eq('id', existing.id);
                }
            } else {
                await supabase.from('Reaction').insert({ userId: user.id, postId, type });
            }

        } catch (error) {
            console.error('Error reacting:', error);
        }
    };

    const handleAddBubble = async (postId: string) => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                alert('Permission denied');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images', 'videos'],
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setUploadingBubble(true);
                const asset = result.assets[0];
                const file = {
                    uri: asset.uri,
                    type: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
                    name: `bubble-${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
                } as any;

                const urlObj = await MediaUploadService.uploadMedia(file.uri, asset.type === 'video' ? 'VIDEO' : 'IMAGE');
                const url = urlObj.url;
                if (!url) throw new Error('Upload failed');

                const { error } = await supabase.from('ReactionBubble').insert({
                    postId,
                    userId: session?.user?.id,
                    mediaUrl: url,
                    mediaType: asset.type === 'video' ? 'VIDEO' : 'IMAGE'
                });

                if (error) throw error;



                setToast({ message: 'Bubble Added!', type: 'success' });
                // Refresh to show new bubble? Or optimistic?
                // Optimistic hard for array of bubbles without structure, but we can try refresh for now.
                fetchSimilarPosts();

            }
        } catch (e) {
            console.error(e);
            alert('Failed to add bubble');
        } finally {
            setUploadingBubble(false);
        }
    };

    const handleCommentPress = (postId: string) => {
        setSelectedPostId(postId);
        setCommentsModalVisible(true);
    };

    const handleMenuPress = (post: any) => {
        setPostForOptions(post);
        setOptionsModalVisible(true);
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
                    <View style={{ flex: 1 }}>
                        <FlatList
                            data={posts}
                            renderItem={({ item }) => (
                                <FeedPostItem
                                    item={item}
                                    isActive={item.id === activeId}
                                    onActivate={() => setActiveId(item.id)}
                                    onReact={handleReact}
                                    colors={colors}
                                    mode={colorScheme}
                                    onAddBubble={handleAddBubble}
                                    onMenuPress={handleMenuPress}
                                    onSharePress={handleSharePress}
                                    onCommentPress={handleCommentPress}
                                    isScreenFocused={isScreenFocused}
                                    onToggleScroll={() => { }}
                                />
                            )}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.listContent}
                            onViewableItemsChanged={onViewableItemsChanged}
                            viewabilityConfig={viewabilityConfig.current}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                )}
            </SafeAreaView>

            {postToShare && (
                <SharePostModal
                    visible={shareModalVisible}
                    onClose={() => setShareModalVisible(false)}
                    post={postToShare}
                />
            )}

            {
                selectedPostId && (
                    <CommentsModal
                        visible={commentsModalVisible}
                        onClose={() => setCommentsModalVisible(false)}
                        postId={selectedPostId}
                    />
                )
            }

            {
                postForOptions && (
                    <PostOptionsModal
                        visible={optionsModalVisible}
                        onClose={() => setOptionsModalVisible(false)}
                        post={postForOptions}
                        onDelete={() => {
                            // Optimistic delete
                            setPosts(prev => prev.filter(p => p.id !== postForOptions.id));
                            setOptionsModalVisible(false);
                        }}
                    />
                )
            }


            {toast && (
                <CustomToast
                    message={toast.message}
                    type={toast.type}
                    onHide={() => setToast(null)}
                />
            )}
        </View >
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
        justifyContent: 'space-between', // Added
        alignItems: 'center',
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
