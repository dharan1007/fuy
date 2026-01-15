
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, TouchableWithoutFeedback, RefreshControl, Image, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Bell, LayoutDashboard, MoreHorizontal, Plus, Check, MessageCircle, User, Globe, Play, Pause, Volume2, VolumeX } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import Svg, { Mask, Rect, Path, G, Defs, Image as SvgImage } from 'react-native-svg';
// Import Post Menu
import PostOptionsModal from '../../components/PostOptionsModal';
import { PanResponder } from 'react-native';
import DraggableSidebar from '../../components/DraggableSidebar';
import CommentsModal from '../../components/CommentsModal';
import ClockViewer from '../../components/ClockViewer';
import ClockRailItem from '../../components/ClockRailItem'; // Added
import { MediaUploadService } from '../../services/MediaUploadService';
import { getSafetyFilters, applySafetyFilters } from '../../services/SafetyService';
import { getApiUrl } from '../../lib/api';

const API_URL = getApiUrl();

// Viewability Config Constant
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60 };

const { width } = Dimensions.get('window');

interface PostUser {
    id: string;
    name: string;
    profile: {
        displayName: string;
        avatarUrl: string | null;
        location: string | null;
    } | null;
}

interface PostMedia {
    url: string;
    type: 'IMAGE' | 'VIDEO';
    variant: 'xray-top' | 'xray-bottom' | null;
}

interface FeedPost {
    id: string;
    content: string;
    createdAt: string;
    user: PostUser;
    postMedia: PostMedia[];
    slashes?: { tag: string }[];
    postType?: string;
    reactionCounts?: { W: number; L: number; CAP: number };
    topBubbles?: any[];
    commentCount: number;
    likeCount: number;
    shareCount: number;
    userReaction?: string | null;
}

interface ClockStory {
    id: string;
    user: { id: string; name: string; profile: { avatarUrl: string; displayName: string } };
    media: { url: string; type: string }[];
    createdAt: string;
    expiresAt?: string;
    clockData?: { expiresAt?: string; duration?: number };
    viewed?: boolean;
}

import XrayScratch from '../../components/XrayScratch';

const FeedPostItem = React.memo(({
    item,
    isActive,
    colors,
    mode,
    onReact,
    onAddBubble,
    onToggleScroll,
    onActivate,
    onMenuPress,
    onCommentPress,
    isScreenFocused
}: {
    item: FeedPost,
    isActive: boolean,
    colors: any,
    mode: any,
    onReact: (id: string, type: string) => void,
    onAddBubble: (id: string) => void,
    onToggleScroll: (enabled: boolean) => void,
    onActivate: () => void,
    onMenuPress: (post: any) => void,
    onCommentPress: (postId: string) => void,
    isScreenFocused: boolean
}) => {
    const hasMedia = item.postMedia && item.postMedia.length > 0;

    // Tap to Play/Pause Control
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // Reset pause state when active item changes
    useEffect(() => {
        if (!isActive) setIsPaused(false);
    }, [isActive]);

    const handlePress = () => {
        if (!isActive) {
            onActivate();
        } else {
            setIsPaused(prev => !prev);
        }
    };

    const formatCount = (count: number) => {
        if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
        return count.toString();
    };

    const name = item.user?.profile?.displayName || item.user?.name || 'Anonymous';
    const rawName = item.user?.name || 'anonymous';
    const handle = `@${rawName.toLowerCase().replace(/ /g, '')} `;
    const avatar = item.user?.profile?.avatarUrl;
    const location = item.user?.profile?.location;

    // Adaptive aspect ratio
    let aspectRatio = 1 / 1.1;
    if (item.postType === 'LILL') aspectRatio = 9 / 16; // Vertical short video
    if (item.postType === 'FILL') aspectRatio = 16 / 9; // Horizontal long video
    if (!hasMedia) aspectRatio = undefined as any;

    return (
        <View className="mb-10 mx-4">
            {/* Main Media Card */}
            {hasMedia && (
                <View className="rounded-[40px] overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl relative">
                    <View className="w-full bg-black relative" style={{ aspectRatio }}>
                        {(() => {
                            if (item.postType === 'XRAY' && item.postMedia.length >= 2) {
                                // Intelligent Media Assignment - SWAPPED per user request
                                let cover = item.postMedia.find(m => m.variant === 'xray-bottom'); // Was xray-top
                                let content = item.postMedia.find(m => m.variant === 'xray-top'); // Was xray-bottom

                                // Fallback: If variants are missing, assume index 0 is cover (Top), 1 is content (Bottom)
                                if (!cover || !content) {
                                    cover = item.postMedia[0];
                                    content = item.postMedia[1];
                                }

                                if (cover && content) {
                                    return (
                                        <XrayScratch
                                            coverUrl={cover.url}
                                            coverType={cover.type}
                                            contentUrl={content.url}
                                            contentType={content.type}
                                            isActive={isActive}
                                            onToggleScroll={onToggleScroll}
                                        />
                                    );
                                }
                            }

                            const media = item.postMedia[0];
                            if (media.type === 'VIDEO') {
                                return (
                                    <TouchableWithoutFeedback onPress={handlePress}>
                                        <View style={{ width: '100%', height: '100%' }}>
                                            <Video
                                                source={{ uri: media.url }}
                                                style={{ width: '100%', height: '100%' }}
                                                resizeMode={ResizeMode.COVER}
                                                shouldPlay={isActive && !isPaused && isScreenFocused}
                                                isLooping
                                                isMuted={isMuted}
                                                useNativeControls={false}
                                            />
                                            {isActive && isPaused && (
                                                <View className="absolute inset-0 items-center justify-center bg-black/20">
                                                    <View className="bg-black/40 rounded-full p-4">
                                                        <Play size={40} color="white" fill="white" />
                                                    </View>
                                                </View>
                                            )}
                                            {/* Volume Toggle */}
                                            <TouchableOpacity
                                                onPress={() => setIsMuted(!isMuted)}
                                                style={{ position: 'absolute', bottom: 16, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                {isMuted ? <VolumeX size={18} color="#fff" /> : <Volume2 size={18} color="#fff" />}
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableWithoutFeedback>
                                );
                            }

                            return (
                                <Image
                                    source={{ uri: media.url }}
                                    className="w-full h-full"
                                    resizeMode="cover"
                                />
                            );
                        })()}

                        {/* Top Floating Pill */}
                        <View className="absolute top-4 left-4 right-4 flex-row justify-between items-start z-[2000]" style={{ elevation: 100 }}>
                            <BlurView intensity={80} tint="dark" className="rounded-full overflow-hidden flex-row items-center p-1 border border-white/20">
                                {avatar ? (
                                    <Image
                                        source={{ uri: avatar }}
                                        className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-white/20"
                                    />
                                ) : (
                                    <View className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-white/20 items-center justify-center">
                                        <User size={20} color="white" />
                                    </View>
                                )}
                                <View className="ml-3 mr-6">
                                    <View className="flex-row items-center">
                                        <Text className="font-bold text-sm text-white mr-1">
                                            {name}
                                        </Text>
                                        <View className="bg-blue-500 rounded-full p-0.5">
                                            <Check color="white" size={6} strokeWidth={4} />
                                        </View>
                                    </View>
                                    <Text className="text-[10px] text-white/60 font-medium">
                                        {handle}{location ? ` • ${location} ` : ''}
                                    </Text>
                                </View>
                            </BlurView>

                            <View className="flex-row items-center gap-2">
                                {item.postType && (
                                    <BlurView intensity={80} tint="dark" className="px-3 py-1.5 rounded-full border border-white/20 overflow-hidden">
                                        <Text className="text-[10px] text-white font-bold tracking-widest uppercase">{item.postType}</Text>
                                    </BlurView>
                                )}
                                <TouchableOpacity
                                    onPress={() => onMenuPress(item)}
                                    className="w-10 h-10 rounded-full border border-white/20 overflow-hidden items-center justify-center"
                                >
                                    <BlurView intensity={80} tint="dark" className="absolute inset-0" />
                                    <MoreHorizontal color="white" size={20} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Floating Reaction Bubbles (Bottom Right) */}
                        <View className="absolute bottom-4 right-16 flex-row items-end z-[2000]">
                            <View className="flex-row -space-x-3 mr-2">
                                {(item.topBubbles || []).map((bubble, i) => (
                                    <View key={i} className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden bg-black/50 items-center justify-center">
                                        {bubble.mediaType === 'VIDEO' ? (
                                            <Video
                                                source={{ uri: bubble.mediaUrl }}
                                                style={{ width: '100%', height: '100%' }}
                                                resizeMode={ResizeMode.COVER}
                                                shouldPlay={isActive && !isPaused}
                                                isLooping
                                                isMuted={true}
                                            />
                                        ) : (
                                            <Image source={{ uri: bubble.mediaUrl }} className="w-full h-full" />
                                        )}
                                    </View>
                                ))}
                            </View>
                            <TouchableOpacity
                                onPress={() => onAddBubble(item.id)}
                                className="w-10 h-10 rounded-full border-2 border-dashed border-white/40 items-center justify-center bg-black/30 backdrop-blur-md"
                            >
                                <Plus size={18} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {/* Content & User Info if no media */}
            {!hasMedia && (
                <View className="p-4 rounded-[40px] border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <View className="flex-row items-center mb-3">
                        {avatar ? (
                            <Image
                                source={{ uri: avatar }}
                                className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-white/10"
                            />
                        ) : (
                            <View className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-white/10 items-center justify-center">
                                <User size={20} color={colors.text} />
                            </View>
                        )}
                        <View className="ml-3">
                            <View className="flex-row items-center">
                                <Text className="font-bold text-sm mr-1" style={{ color: colors.text }}>{name}</Text>
                                <View className="bg-blue-500 rounded-full p-0.5">
                                    <Check color="white" size={6} strokeWidth={4} />
                                </View>
                            </View>
                            <Text className="text-[10px] font-medium" style={{ color: colors.secondary }}>{handle}</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Caption & Slashes */}
            <View className="mt-4 px-2">
                <Text className="text-base font-medium leading-6 mb-2" style={{ color: colors.text }}>
                    {item.content}
                </Text>
                {item.slashes && item.slashes.length > 0 && (
                    <View className="flex-row flex-wrap gap-2 mb-3">
                        {item.slashes.map((s, i) => (
                            <Text key={i} className="text-sm font-bold tracking-tight opacity-40" style={{ color: colors.text }}>
                                /{s.tag}
                            </Text>
                        ))}
                    </View>
                )}
            </View>

            {/* Secondary Feature Row (Reactions & Bubbles) */}
            <View className="mt-2 flex-row items-center justify-between px-1">
                <View className="flex-row items-center">
                    {/* Bubbles Moved to Floating Overlay */}
                </View>

                <View className="flex-row gap-2">
                    <TouchableOpacity
                        onPress={() => onReact(item.id, 'W')}
                        className="px-4 py-2 rounded-full border"
                        style={{
                            backgroundColor: item.userReaction === 'W' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                            borderColor: item.userReaction === 'W' ? 'rgba(239, 68, 68, 0.5)' : colors.border
                        }}
                    >
                        <Text className={`text - xs font - black ${item.userReaction === 'W' ? 'text-red-500' : 'text-red-500/60'} `}>
                            W <Text className="font-bold ml-1" style={{ color: colors.secondary }}>{(item.reactionCounts as any)?.['W'] || 0}</Text>
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => onReact(item.id, 'L')}
                        className="px-4 py-2 rounded-full border"
                        style={{
                            backgroundColor: item.userReaction === 'L' ? (mode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)') : 'transparent',
                            borderColor: item.userReaction === 'L' ? (mode === 'light' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)') : colors.border
                        }}
                    >
                        <Text className={`text - xs font - black ${item.userReaction === 'L' ? (mode === 'light' ? 'text-black' : 'text-white') : (mode === 'light' ? 'text-black/40' : 'text-white/40')} `}>
                            L <Text className="font-bold ml-1" style={{ color: colors.secondary }}>{(item.reactionCounts as any)?.['L'] || 0}</Text>
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => onReact(item.id, 'CAP')}
                        className="px-4 py-2 rounded-full border"
                        style={{
                            backgroundColor: item.userReaction === 'CAP' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                            borderColor: item.userReaction === 'CAP' ? 'rgba(59, 130, 246, 0.5)' : colors.border
                        }}
                    >
                        <Text className={`text - xs font - black ${item.userReaction === 'CAP' ? 'text-blue-500' : 'text-blue-500/60'} `}>
                            CAP <Text className="font-bold ml-1" style={{ color: colors.secondary }}>{(item.reactionCounts as any)?.['CAP'] || 0}</Text>
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => onCommentPress(item.id)}
                        className="px-4 py-2 rounded-full border flex-row items-center"
                        style={{ borderColor: colors.border }}
                    >
                        <MessageCircle size={14} color={colors.secondary} />
                        <Text className="font-bold ml-1.5 text-xs" style={{ color: colors.secondary }}>{formatCount(item.commentCount)}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
});



export default function FeedScreen() {
    const { colors, mode } = useTheme();
    const router = useRouter();
    const { session } = useAuth(); // Use Auth Context
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [clocks, setClocks] = useState<ClockStory[]>([]);
    const [selectedClock, setSelectedClock] = useState<ClockStory | null>(null); // Added state
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [userProfile, setUserProfile] = useState<{ avatarUrl: string | null } | null>(null); // Profile state
    const [scrollEnabled, setScrollEnabled] = useState(true);
    const isScreenFocused = useIsFocused();

    // Menu State
    const [menuVisible, setMenuVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState<any>(null);

    // Comments State
    const [commentsVisible, setCommentsVisible] = useState(false);
    const [commentPostId, setCommentPostId] = useState<string | null>(null);

    const handleMenuPress = useCallback((post: any) => {
        setSelectedPost(post);
        setMenuVisible(true);
    }, []);

    const handleCommentPress = useCallback((postId: string) => {
        setCommentPostId(postId);
        setCommentsVisible(true);
    }, []);

    useEffect(() => {
        const checkUser = async () => {
            if (session?.user) {
                setCurrentUserId(session.user.id);
                // Fetch Profile
                const { data } = await supabase
                    .from('Profile')
                    .select('avatarUrl')
                    .eq('userId', session.user.id)
                    .single();
                if (data) setUserProfile(data);
            }
        };
        // fetchClocks(); // Moved to useFocusEffect
        checkUser();
    }, [session]);

    // Use useFocusEffect to refresh clocks whenever the screen comes into focus (e.g. after posting)
    useFocusEffect(
        React.useCallback(() => {
            fetchClocks();
        }, [])
    );

    const fetchClocks = async () => {
        try {
            const { data, error } = await supabase
                .from('Post')
                .select(`id, content, createdAt, postType, expiresAt, postMedia: PostMedia(media: Media(url, type)), user: User(id, name, profile: Profile(displayName, avatarUrl))`)
                .eq('postType', 'CLOCK')
                .order('createdAt', { ascending: false })
                .limit(50);

            if (error) {
                console.error("Fetch clocks error (Supabase):", error);
                return;
            }

            if (data) {
                console.log("[fetchClocks] Raw Data Count:", data.length);
                const uniqueUsers = new Map();
                const stories: ClockStory[] = [];
                const now = new Date();

                data.forEach((post: any) => {
                    // Check expiry
                    let expiresAt = post.expiresAt;
                    console.log(`[fetchClocks] Post ${post.id} expiry raw:`, expiresAt);

                    // Compatibility: If older post lacks expiresAt, assume 24h from createdAt
                    if (!expiresAt) {
                        const created = new Date(post.createdAt).getTime();
                        expiresAt = new Date(created + 24 * 60 * 60 * 1000).toISOString();
                    }

                    const isExpired = new Date(expiresAt) <= now;
                    console.log(`[fetchClocks] Post ${post.id} isExpired:`, isExpired, "ExpiresAt:", expiresAt, "Now:", now.toISOString());

                    if (!isExpired) {
                        const userObj = Array.isArray(post.user) ? post.user[0] : post.user;

                        // Flatten media
                        const media = post.postMedia?.map((pm: any) => pm.media) || [];

                        if (userObj) {
                            if (!uniqueUsers.has(userObj.id)) {
                                uniqueUsers.set(userObj.id, true);
                                stories.push({
                                    id: post.id,
                                    user: userObj,
                                    media: media,
                                    createdAt: post.createdAt,
                                    expiresAt: expiresAt,
                                });
                            } else {
                                console.log(`[fetchClocks] Skipping duplicate user ${userObj.id}`);
                            }
                        } else {
                            console.log(`[fetchClocks] Missing user for post ${post.id}`);
                        }
                    }
                });
                console.log("[fetchClocks] Final Stories Count:", stories.length);
                setClocks(stories);
            }
        } catch (e) {
            console.error("Fetch clocks error:", e);
        }
    };

    // REDEFINED fetchFeed to use session if needed or keep using currentUserId state
    const fetchFeed = useCallback(async () => {
        setLoading(true);
        try {
            // Get current user directly to avoid race condition
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            const userId = user?.id;

            console.log('[Feed] User ID:', userId, userError ? `Error: ${userError.message} ` : '');

            let filters = { excludedUserIds: [], hiddenPostIds: [] };
            if (userId) {
                filters = await getSafetyFilters(userId);
                setCurrentUserId(userId);
            }



            let query = supabase
                .from('Post')
                .select(`
                    id, 
                    content, 
                    postType, 
                    createdAt, 
                    userId, 
                    viewCount, 
                    shareCount, 
                    user:User(id, name, profile:Profile(avatarUrl, displayName, location)), 
                    postMedia:PostMedia(media:Media(url, type, variant)), 
                    reactions:Reaction(type, userId), 
                    reactionBubbles:ReactionBubble(id, mediaUrl, mediaType, user:User(profile:Profile(avatarUrl))), 
                    slashes:Slash(tag), 
                    comments:PostComment(id), 
                    likes:PostLike(id)
                `)
                .eq('visibility', 'PUBLIC')
                .neq('postType', 'CLOCK') // Exclude Clocks from main feed
                .order('createdAt', { ascending: false })
                .limit(20);

            if (userId) {
                query = applySafetyFilters(query, filters);
            }

            const { data, error } = await query;

            console.log('[Feed] Query result:', {
                postsCount: data?.length || 0,
                error: error?.message,
                firstPostId: data?.[0]?.id
            });

            if (error) {
                console.error("Error fetching feed:", error);
                setPosts([]);
                return;
            }

            const transformedPosts = (data || []).map((p: any) => {
                const userObj = Array.isArray(p.user) ? p.user[0] : p.user;
                const profileObj = userObj && Array.isArray(userObj.profile) ? userObj.profile[0] : userObj?.profile;

                const reactions = p.reactions || [];
                const counts = {
                    W: reactions.filter((r: any) => r.type === 'W').length,
                    L: reactions.filter((r: any) => r.type === 'L').length,
                    CAP: reactions.filter((r: any) => r.type === 'CAP').length,
                };

                const userReaction = currentUserId ? reactions.find((r: any) => r.userId === currentUserId)?.type || null : null;

                return {
                    id: p.id,
                    content: p.content,
                    postType: p.postType,
                    createdAt: p.createdAt,
                    user: {
                        ...userObj,
                        profile: profileObj
                    },
                    postMedia: (p.postMedia || []).map((pm: any) => pm.media).filter(Boolean),
                    slashes: p.slashes || [],
                    reactionCounts: counts,
                    topBubbles: (p.reactionBubbles || []).slice(0, 3),
                    commentCount: p.comments?.length || 0,
                    likeCount: p.likes?.length || 0,
                    shareCount: p.shareCount || 0,
                    userReaction
                };
            }) as FeedPost[];

            setPosts(transformedPosts);

        } catch (error) {
            console.error("Error fetching feed:", error);
            setPosts([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [currentUserId]);

    const [activePostId, setActivePostId] = useState<string | null>(null);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

        if (viewableItems && viewableItems.length > 0) {
            // Wait until user stops scrolling briefly to activate video
            scrollTimeout.current = setTimeout(() => {
                setActivePostId(viewableItems[0].item.id);
            }, 150);
        }
    }).current;

    useEffect(() => {
        fetchFeed();
        return () => {
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        };
    }, [fetchFeed]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchFeed();
        fetchClocks();
    };

    const handleReact = useCallback(async (postId: string, type: string) => {
        setPosts(prev => prev.map(post => {
            if (post.id === postId) {
                const isRemoving = post.userReaction === type;
                const newReaction = isRemoving ? null : type;
                const newCounts = { ...post.reactionCounts as any };

                if (post.userReaction) {
                    newCounts[post.userReaction] = Math.max(0, newCounts[post.userReaction] - 1);
                }
                if (!isRemoving) {
                    newCounts[type] = (newCounts[type] || 0) + 1;
                }

                return { ...post, userReaction: newReaction, reactionCounts: newCounts };
            }
            return post;
        }));

        try {
            await fetch(`${API_URL}/api/posts/react`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postId, type }),
            });
        } catch (error) {
            console.error("Failed to react:", error);
        }
    }, []);

    const handleAddBubble = useCallback(async (postId: string) => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission", "Permission to access camera was denied");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images', 'videos'], // Fix deprecated enum
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            videoMaxDuration: 3,
        });

        if (!result.canceled && result.assets[0].uri) {
            const asset = result.assets[0];

            // Enforce duration locally if picker ignores it
            if (asset.type === 'video' && asset.duration && asset.duration > 4000) {
                Alert.alert("Video too long", "Please record a video under 3 seconds.");
                return;
            }

            // Optimistic Update: Add bubble locally immediately
            const tempBubble = {
                mediaUrl: asset.uri,
                mediaType: asset.type === 'video' ? 'VIDEO' : 'IMAGE',
            };

            setPosts(prev => prev.map(p => {
                if (p.id === postId) {
                    return { ...p, topBubbles: [...(p.topBubbles || []), tempBubble] };
                }
                return p;
            }));

            // Don't set global loading(true) to avoid blocking UI
            // setLoading(true); 

            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) throw new Error("Not authenticated");

                // Upload using Service
                const uploadResult = await MediaUploadService.uploadMedia(
                    asset.uri,
                    asset.type === 'video' ? 'VIDEO' : 'IMAGE'
                );

                const uploadUrl = uploadResult.url;

                const res = await fetch(`${API_URL}/api/posts/bubble`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify({
                        postId,
                        mediaUrl: uploadUrl,
                        mediaType: asset.type === 'video' ? 'VIDEO' : 'IMAGE'
                    }),
                });

                if (res.ok) {
                    // Success: Refresh feed silently to get real data (optional, or just keep optimistic)
                    // fetchFeed(); 
                    // We can skip fetchFeed to avoid redraw flicker, or call it later. 
                    // Given reported "loading" issues, let's NOT call fetchFeed immediately but let strict update happen next refresh.
                    // Actually, getting the real ID/Url is better. I'll call it but NO LOADING spinner.
                    fetchFeed();
                } else {
                    const error = await res.json();
                    Alert.alert("Upload Failed", error.error || "Failed to upload reaction");
                    // Revert optimistic update? (Complex, skip for now or trigger refresh)
                    fetchFeed();
                }
            } catch (error) {
                console.error("Bubble upload failed:", error);
                Alert.alert("Error", "Failed to upload bubble.");
                fetchFeed(); // Revert state
            }
        }
    }, [fetchFeed]);

    // ... (renderClockRail unchanged)
    const renderClockRail = () => {
        return (
            <View className="py-3 mb-2" style={{ borderBottomWidth: 1, borderBottomColor: mode === 'light' ? '#f0f0f0' : '#222' }}>
                <Text style={{ paddingHorizontal: 16, marginBottom: 12, fontWeight: 'bold', color: colors.text, fontSize: 13, letterSpacing: 0.5 }}>CLOCKS</Text>
                <FlatList
                    horizontal
                    data={[{ id: 'add-story' }, ...clocks]}
                    keyExtractor={(item: any) => item.id}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
                    renderItem={({ item, index }: { item: any, index: number }) => {
                        if (item.id === 'add-story') {
                            return (
                                <TouchableOpacity onPress={() => router.push('/(tabs)/create?type=CLOCK')} className="items-center gap-1">
                                    <View className="relative w-[60px] h-[60px] rounded-full border-2 border-dashed border-white/30 items-center justify-center bg-white/5">
                                        <Plus size={20} color={colors.text} />
                                        <View className="absolute bottom-0 right-0 bg-white rounded-full p-1 border border-black">
                                            <Plus size={10} color="black" />
                                        </View>
                                    </View>
                                    <Text style={{ color: colors.text, fontSize: 11, marginTop: 4 }}>Add Clock</Text>
                                </TouchableOpacity>
                            );
                        }

                        // Show seconds for the first 2 actual clocks (indices 1 and 2, since 0 is add button)
                        const showSeconds = index >= 1 && index <= 2;

                        return (
                            <ClockRailItem
                                item={item}
                                showSeconds={showSeconds}
                                onPress={() => setSelectedClock(item)}
                                mode={mode as any}
                                colors={colors}
                            />
                        );
                    }}
                />
            </View>
        );
    };

    const renderHeader = () => (
        <View className="px-6 pt-4 pb-2 flex-row justify-between items-center">
            {/* Left: App Name */}
            <Text className="text-3xl font-bold" style={{ color: colors.text }}>Fuy</Text>

            {/* Right Group: Notification -> Hopin -> Profile (Corner) */}
            <View className="flex-row gap-4 items-center">
                {/* Notification */}
                <TouchableOpacity onPress={() => router.push('/notifications')} className="p-2 rounded-full" style={{ backgroundColor: colors.card }}>
                    <Bell color={colors.text} size={24} />
                    {/* Notification Red Dot logic needs AuthContext access or separate hook */}
                </TouchableOpacity>

                {/* Hopin Icon (Globe) */}
                <TouchableOpacity onPress={() => router.push('/hopin')} className="p-2 rounded-full" style={{ backgroundColor: colors.card }}>
                    <Globe color={colors.text} size={24} />
                </TouchableOpacity>

                {/* Profile Icon - User Avatar */}
                <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} className="rounded-full overflow-hidden border border-white/20">
                    {userProfile?.avatarUrl ? (
                        <Image
                            source={{ uri: userProfile.avatarUrl }}
                            style={{ width: 40, height: 40 }}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={{ width: 40, height: 40, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
                            <User color={colors.text} size={24} />
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderItem = useCallback(({ item }: { item: FeedPost }) => (
        <FeedPostItem
            item={item}
            isActive={activePostId === item.id && !selectedClock}
            colors={colors}
            mode={mode}
            onReact={handleReact}
            onAddBubble={handleAddBubble}
            onToggleScroll={setScrollEnabled}
            onActivate={() => setActivePostId(item.id)}
            onMenuPress={handleMenuPress}
            onCommentPress={handleCommentPress}
            isScreenFocused={isScreenFocused}
        />
    ), [activePostId, colors, mode, handleReact, handleAddBubble, setScrollEnabled, isScreenFocused, handleMenuPress, handleCommentPress, selectedClock]);

    return (
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
            <SafeAreaView className="flex-1" edges={['top']}>
                {renderHeader()}
                {loading && !refreshing ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={posts}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        scrollEnabled={scrollEnabled}
                        contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                        onViewableItemsChanged={onViewableItemsChanged}
                        viewabilityConfig={VIEWABILITY_CONFIG}
                        initialNumToRender={2}
                        maxToRenderPerBatch={2}
                        windowSize={3}
                        removeClippedSubviews={true}
                        ListHeaderComponent={renderClockRail}
                        ListEmptyComponent={<View className="flex-1 items-center justify-center py-20"><Text style={{ color: colors.secondary }}>No posts yet. Be the first!</Text></View>}
                    />
                )}
            </SafeAreaView>

            <DraggableSidebar />

            <PostOptionsModal
                visible={menuVisible}
                onClose={() => setMenuVisible(false)}
                post={selectedPost}
                onReport={() => Alert.alert("Reported", "Thanks for letting us know.")}
                onBlock={() => {
                    setPosts(prev => prev.filter(p => p.user.id !== selectedPost?.user?.id));
                    fetchFeed();
                }}
                onDelete={() => {
                    setPosts(prev => prev.filter(p => p.id !== selectedPost?.id));
                }}
                onHide={() => {
                    setPosts(prev => prev.filter(p => p.id !== selectedPost?.id));
                }}
                onMute={() => {
                    setPosts(prev => prev.filter(p => p.user.id !== selectedPost?.user?.id));
                    fetchFeed();
                }}
            />

            <CommentsModal
                visible={commentsVisible}
                onClose={() => setCommentsVisible(false)}
                postId={commentPostId}
            />

            {/* Clock Viewer */}
            <ClockViewer
                visible={!!selectedClock}
                clock={selectedClock}
                onClose={() => setSelectedClock(null)}
            />
        </View>
    );
}
