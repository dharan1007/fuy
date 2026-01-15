import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Dimensions, TouchableOpacity, Image, StyleSheet, FlatList, ViewToken, ActivityIndicator, ScrollView, Animated, PanResponder, Share as RNShare, Modal, Switch, TouchableWithoutFeedback, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Heart, MessageCircle, Share2, MoreVertical, Play, Pause, Circle as DotIcon, X, Search, ChevronLeft, Send, Bookmark, Check, Plus, LayoutGrid as Grid, List, Maximize, Minimize, Menu, Volume2, VolumeX } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import ShareCardModal from '../../components/ShareCardModal';
import PostOptionsModal from '../../components/PostOptionsModal';
import CommentsModal from '../../components/CommentsModal';
import SharePostModal from '../../components/SharePostModal'; // Added
import { useRouter, useFocusEffect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useNavVisibility } from '../../context/NavContext';
import { getSafetyFilters, applySafetyFilters } from '../../services/SafetyService';
import XrayScratch from '../../components/XrayScratch';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ... (KEEPING REST unchanged if outside range, but I can target specific lines)
// Correcting logic below

const CATEGORIES = [
    { id: 'lills', label: 'Lills' },
    { id: 'fills', label: 'Fills' },
    { id: 'bloom', label: 'Bloom' },
    { id: 'auds', label: 'Auds' },
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
    likes: number; // Keeping for compatibility but relying on reactionCounts
    comments: number;
    mediaUrl: string;
    mediaType: 'video' | 'image' | 'audio';
    category: string;
    isSubscribed: boolean;
    followersCount: number;
    createdAt?: string;
    views?: string;
    reactionCounts: { W: number; L: number; CAP: number };
    userReaction: string | null;
    topBubbles: any[];
    postMedia?: { url: string; type: string; variant?: string }[];
}

const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

// Viewability Config Constant
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 50 };

interface DotItemProps {
    item: DotData;
    isActive: boolean;
    autoScroll: boolean;
    onVideoEnd: () => void;
    onToggleAutoScroll: () => void;
    onSubscribe: (targetUserId: string, currentStatus: boolean) => void;
    onMenuPress: (item: DotData) => void;
    onCommentPress: (postId: string) => void;
    onSharePress: (item: DotData) => void;
    isScreenFocused: boolean;
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

const DotItem = ({ item, isActive, autoScroll, onVideoEnd, onToggleAutoScroll, onSubscribe, onMenuPress, onCommentPress, onSharePress, isScreenFocused }: DotItemProps) => {
    const { colors } = useTheme();
    const { session } = useAuth();
    const [reactionCounts, setReactionCounts] = useState(item.reactionCounts);
    const [userReaction, setUserReaction] = useState(item.userReaction);
    const [isSubscribed, setIsSubscribed] = useState(item.isSubscribed);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);

    // Safety check
    if (!item) return null;

    // Video Refs
    const videoRef = useRef<Video>(null);
    const [status, setStatus] = useState<AVPlaybackStatus | null>(null);

    // Sync state if item changes
    useEffect(() => {
        setReactionCounts(item.reactionCounts);
        setUserReaction(item.userReaction);
        setIsSubscribed(item.isSubscribed); // Update optimistic toggle
    }, [item]);

    // Handle Follow
    const handleSubscribe = async () => {
        if (!session?.user) return;
        setIsSubscribed(true); // Optimistic UI update

        try {
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://www.fuymedia.org'}/api/users/follow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ targetUserId: item.userId })
            });

            if (!response.ok) {
                console.error('Follow error:', await response.json());
                setIsSubscribed(false); // Revert on failure
            }
        } catch (e) {
            console.error('Follow error:', e);
            setIsSubscribed(false); // Revert on failure
        }
    };
    const handleReaction = async (type: string) => {
        if (!session?.user) return;

        // Optimistic Update
        const isRemoving = userReaction === type;
        const newReaction = isRemoving ? null : type;

        setUserReaction(newReaction);
        setReactionCounts(prev => ({
            ...prev,
            [type]: isRemoving ? Math.max(0, prev[type as keyof typeof prev] - 1) : prev[type as keyof typeof prev] + 1,
            ...(userReaction && userReaction !== type ? { [userReaction]: Math.max(0, prev[userReaction as keyof typeof prev] - 1) } : {})
        }));

        try {
            if (isRemoving) {
                await supabase.from('Reaction').delete().eq('postId', item.postId).eq('userId', session.user.id);
            } else {
                // Remove existing if switching
                if (userReaction) {
                    await supabase.from('Reaction').delete().eq('postId', item.postId).eq('userId', session.user.id);
                }
                await supabase.from('Reaction').insert({ postId: item.postId, userId: session.user.id, type });
            }
        } catch (e) {
            console.error('Reaction error:', e);
            // Revert on error (could implement revert logic here)
        }
    };

    const handleShare = async () => {
        onSharePress(item);
    };

    // Resize Mode Logic
    const resizeMode = item.category === 'fills' ? ResizeMode.CONTAIN : ResizeMode.COVER;

    const handleTogglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    return (
        <View style={[styles.dotContainer, { height: SCREEN_HEIGHT }]}>
            {item.category === 'xray' && item.postMedia && item.postMedia.length >= 2 ? (
                (() => {
                    // Intelligent Media Assignment - SWAPPED
                    let cover = item.postMedia.find(m => m.variant === 'xray-bottom' || (m as any).variant === 'xray-bottom');
                    let content = item.postMedia.find(m => m.variant === 'xray-top' || (m as any).variant === 'xray-top');

                    if (!cover || !content) {
                        cover = item.postMedia[0];
                        content = item.postMedia[1];
                    }

                    return (
                        <XrayScratch
                            coverUrl={cover.url}
                            contentUrl={content.url}
                            coverType={cover.type}
                            contentType={content.type}
                            isActive={isActive && isScreenFocused}
                            onToggleScroll={onToggleAutoScroll}
                        />
                    );
                })()
            ) : (
                <TouchableWithoutFeedback onPress={handleTogglePlay}>
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'black' }]}>
                        {item.mediaType === 'video' && item.mediaUrl ? (
                            <Video
                                ref={videoRef}
                                source={{ uri: item.mediaUrl }}
                                style={StyleSheet.absoluteFill}
                                resizeMode={resizeMode}
                                shouldPlay={isActive && isScreenFocused && isPlaying}
                                isLooping={!autoScroll}
                                isMuted={isMuted}
                                onPlaybackStatusUpdate={(s) => {
                                    setStatus(s);
                                    if (s.isLoaded && s.didJustFinish && autoScroll) {
                                        onVideoEnd();
                                    }
                                }}
                            />
                        ) : (
                            <Image
                                source={{ uri: item.mediaUrl }}
                                style={StyleSheet.absoluteFill}
                                resizeMode={resizeMode === ResizeMode.CONTAIN ? 'contain' : 'cover'}
                            />
                        )}

                        {/* Gradient Overlay for text readability */}
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)']}
                            style={StyleSheet.absoluteFill}
                            pointerEvents="none"
                        />

                        {/* Play Icon Overlay */}
                        {!isPlaying && item.mediaType === 'video' && (
                            <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                                <Play size={64} color="rgba(255,255,255,0.8)" fill="rgba(255,255,255,0.8)" />
                            </View>
                        )}
                    </View>
                </TouchableWithoutFeedback>
            )}

            {/* Main Overlay UI - Pushed Down */}
            <SafeAreaView style={{ flex: 1, pointerEvents: 'box-none' }}>
                <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 20 }} pointerEvents="box-none">

                    {/* Right Side Actions (Share, Bookmark, More) */}
                    {/* Right Side Actions (Share, Bookmark, More) */}
                    {/* Right Side Actions: NOW REACTIONS (W, L, CAP, Bubbles) */}
                    {/* Right Side Actions: NOW REACTIONS (W, L, CAP, Bubbles) */}
                    <View style={{ position: 'absolute', right: 8, bottom: 90, alignItems: 'center', gap: 8 }}>
                        {/* Reaction Bubbles (Vertical Stack) */}
                        <View style={{ alignItems: 'center', marginBottom: 6 }}>
                            {(item.topBubbles || []).slice(0, 3).map((bubble, i) => (
                                <View key={i} style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: '#121212', marginTop: -8, zIndex: 3 - i, overflow: 'hidden', backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }}>
                                    {bubble.mediaType === 'VIDEO' ? (
                                        <Video
                                            source={{ uri: bubble.mediaUrl }}
                                            style={{ width: '100%', height: '100%' }}
                                            resizeMode={ResizeMode.COVER}
                                            shouldPlay={isActive && isScreenFocused}
                                            isLooping
                                            isMuted={true}
                                        />
                                    ) : (
                                        <Image source={{ uri: bubble.mediaUrl }} style={{ width: '100%', height: '100%' }} />
                                    )}
                                </View>
                            ))}
                            <TouchableOpacity style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', marginTop: -4, zIndex: 0 }}>
                                <Plus size={10} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        {/* W Button */}
                        <TouchableOpacity
                            onPress={() => handleReaction('W')}
                            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: userReaction === 'W' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: userReaction === 'W' ? '#ef4444' : 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}
                        >
                            <Text style={{ color: userReaction === 'W' ? '#fff' : 'rgba(255,255,255,0.9)', fontWeight: '900', fontSize: 13 }}>W</Text>
                            <Text style={{ color: 'white', fontWeight: '700', fontSize: 8, position: 'absolute', bottom: -10 }}>{formatNumber(reactionCounts.W)}</Text>
                        </TouchableOpacity>
                        <View style={{ height: 6 }} />

                        {/* L Button */}
                        <TouchableOpacity
                            onPress={() => handleReaction('L')}
                            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: userReaction === 'L' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: userReaction === 'L' ? '#ffffff' : 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}
                        >
                            <Text style={{ color: userReaction === 'L' ? '#fff' : 'rgba(255,255,255,0.9)', fontWeight: '900', fontSize: 13 }}>L</Text>
                            <Text style={{ color: 'white', fontWeight: '700', fontSize: 8, position: 'absolute', bottom: -10 }}>{formatNumber(reactionCounts.L)}</Text>
                        </TouchableOpacity>
                        <View style={{ height: 6 }} />

                        {/* CAP Button */}
                        <TouchableOpacity
                            onPress={() => handleReaction('CAP')}
                            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: userReaction === 'CAP' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: userReaction === 'CAP' ? '#3b82f6' : 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}
                        >
                            <Text style={{ color: userReaction === 'CAP' ? '#fff' : 'rgba(255,255,255,0.9)', fontWeight: '900', fontSize: 9 }}>CAP</Text>
                            <Text style={{ color: 'white', fontWeight: '700', fontSize: 8, position: 'absolute', bottom: -10 }}>{formatNumber(reactionCounts.CAP)}</Text>
                        </TouchableOpacity>
                        <View style={{ height: 6 }} />
                    </View>

                    {/* Bottom Content: User Info & Captions & Reactions */}
                    <View style={{ paddingHorizontal: 12, marginBottom: 8, paddingRight: 60 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            {item.avatar ? (
                                <Image source={{ uri: item.avatar }} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#fff' }} />
                            ) : (
                                <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#fff', backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{item.username?.charAt(0)?.toUpperCase() || '?'}</Text>
                                </View>
                            )}
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14, marginLeft: 8, textShadowColor: 'black', textShadowRadius: 2 }}>{item.username}</Text>

                            {!isSubscribed && (
                                <TouchableOpacity
                                    onPress={handleSubscribe}
                                    style={{ marginLeft: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }}
                                >
                                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>Follow</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <Text style={{ color: '#fff', fontSize: 12, marginBottom: 8, lineHeight: 16, textShadowColor: 'black', textShadowRadius: 1 }} numberOfLines={3}>
                            {item.description}
                        </Text>

                        {/* Horizontal Reaction Row (W, L, CAP, Bubbles) - Scale 70% */}
                        {/* NOW BOTTOM ACTIONS: Message, Save, Share, More - Scale 70% */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 16 }}>
                            <TouchableOpacity onPress={() => onCommentPress(item.postId)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <MessageCircle size={18} color="#fff" />
                                <Text style={{ color: 'white', fontSize: 11, fontWeight: '600', textShadowColor: 'black', textShadowRadius: 2 }}>{formatNumber(item.comments)}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleShare}>
                                <Share2 size={18} color="#fff" />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => onMenuPress(item)}>
                                <MoreVertical size={18} color="#fff" />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setIsMuted(!isMuted)}>
                                {isMuted ? <VolumeX size={18} color="#fff" /> : <Volume2 size={18} color="#fff" />}
                            </TouchableOpacity>
                        </View>

                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
};

// ============= FILLS PLAYER COMPONENT =============
interface FillsPlayerProps {
    dots: DotData[];
    activeIndex: number;
    setActiveIndex: (index: number) => void;
    isScreenFocused: boolean;
    onBack: () => void;
}

const FillsPlayer = ({ dots, activeIndex, setActiveIndex, isScreenFocused, onBack }: FillsPlayerProps) => {
    const { colors, mode } = useTheme();
    const { session } = useAuth();
    const videoRef = useRef<Video>(null);
    const flatListRef = useRef<FlatList>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());
    const [reactionCounts, setReactionCounts] = useState(dots[activeIndex]?.reactionCounts || { W: 0, L: 0, CAP: 0 });
    const [userReaction, setUserReaction] = useState<string | null>(dots[activeIndex]?.userReaction || null);
    const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Comments state
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);

    // Reaction bubbles state
    const [reactionBubbles, setReactionBubbles] = useState<any[]>([]);

    // Report/Block state
    const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);
    const [showReportActions, setShowReportActions] = useState(false);

    const currentItem = dots[activeIndex];

    // Filter suggested items based on search and hidden
    const suggestedItems = dots
        .filter((item, i) => i !== activeIndex && !hiddenItems.has(item.id))
        .filter(item => !searchQuery || item.description?.toLowerCase().includes(searchQuery.toLowerCase()) || item.username?.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 10);

    // Featured item (first in list that's not current)
    const featuredItem = dots.find((d, i) => i !== activeIndex && !hiddenItems.has(d.id));

    // Fetch comments and bubbles when item changes
    useEffect(() => {
        if (currentItem) {
            setReactionCounts(currentItem.reactionCounts || { W: 0, L: 0, CAP: 0 });
            setUserReaction(currentItem.userReaction || null);
            fetchComments();
            fetchReactionBubbles();
        }
    }, [activeIndex, currentItem?.postId]);

    const fetchComments = async () => {
        if (!currentItem?.postId) return;
        setLoadingComments(true);
        try {
            const { data, error } = await supabase
                .from('PostComment')
                .select('id, content, createdAt, user:User(name, profile:Profile(displayName, avatarUrl))')
                .eq('postId', currentItem.postId)
                .order('createdAt', { ascending: false })
                .limit(20);
            if (!error && data) {
                setComments(data);
            }
        } catch (e) {
            console.log('Fetch comments error:', e);
        }
        setLoadingComments(false);
    };

    const fetchReactionBubbles = async () => {
        if (!currentItem?.postId) return;
        try {
            const { data, error } = await supabase
                .from('ReactionBubble')
                .select('id, mediaUrl, mediaType, user:User(name, profile:Profile(avatarUrl))')
                .eq('postId', currentItem.postId)
                .limit(5);
            if (!error && data) {
                setReactionBubbles(data);
            }
        } catch (e) {
            console.log('Fetch bubbles error:', e);
        }
    };

    const postComment = async () => {
        if (!session?.user || !currentItem?.postId || !newComment.trim()) return;
        const content = newComment.trim();
        setNewComment('');

        // Optimistic update
        const tempComment = {
            id: 'temp-' + Date.now(),
            content,
            createdAt: new Date().toISOString(),
            user: { name: 'You', profile: { displayName: 'You', avatarUrl: '' } }
        };
        setComments(prev => [tempComment, ...prev]);

        try {
            const { error } = await supabase.from('PostComment').insert({
                userId: session.user.id,
                postId: currentItem.postId,
                content
            });
            if (!error) {
                fetchComments(); // Refresh to get real comment
            }
        } catch (e) {
            console.error('Post comment error:', e);
        }
    };

    // Auto-hide controls
    useEffect(() => {
        if (showControls && isPlaying) {
            if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
            controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
        }
        return () => {
            if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
        };
    }, [showControls, isPlaying]);

    const togglePlay = async () => {
        if (videoRef.current) {
            if (isPlaying) {
                await videoRef.current.pauseAsync();
            } else {
                await videoRef.current.playAsync();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleSeek = async (value: number) => {
        if (videoRef.current && status?.isLoaded && status.durationMillis) {
            await videoRef.current.setPositionAsync(value * status.durationMillis);
        }
    };

    const toggleFullscreen = async () => {
        if (videoRef.current) {
            try {
                if (!isFullscreen) {
                    await videoRef.current.presentFullscreenPlayer();
                } else {
                    await videoRef.current.dismissFullscreenPlayer();
                }
                setIsFullscreen(!isFullscreen);
            } catch (e) {
                console.log('Fullscreen error:', e);
            }
        }
    };

    const handleReaction = async (type: string) => {
        if (!session?.user || !currentItem) return;
        const isRemoving = userReaction === type;

        // Optimistic update
        setUserReaction(isRemoving ? null : type);
        setReactionCounts(prev => ({
            ...prev,
            [type]: isRemoving ? Math.max(0, (prev[type as keyof typeof prev] || 0) - 1) : (prev[type as keyof typeof prev] || 0) + 1,
            ...(userReaction && userReaction !== type ? { [userReaction]: Math.max(0, (prev[userReaction as keyof typeof prev] || 0) - 1) } : {})
        }));

        try {
            if (isRemoving) {
                await supabase.from('Reaction').delete().eq('postId', currentItem.postId).eq('userId', session.user.id);
            } else {
                await supabase.from('Reaction').upsert({ postId: currentItem.postId, userId: session.user.id, type }, { onConflict: 'postId,userId' });
            }
        } catch (e) {
            console.error('Reaction error:', e);
        }
    };

    const removeFromUpNext = (itemId: string) => {
        // Use functional state update to ensure latest state and prevent race conditions
        setHiddenItems(prev => {
            const newSet = new Set(prev);
            newSet.add(itemId);
            return newSet;
        });
    };

    const handleReportAction = (commentId: string, userId: string) => {
        Alert.alert(
            "Report or Block",
            "Select an action for this user",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Report User",
                    onPress: async () => {
                        try {
                            await supabase.from('Report').insert({
                                reporterId: session?.user?.id,
                                reason: 'Inappropriate Content',
                                status: 'PENDING',
                                target: 'COMMENT',
                                details: `Reported comment ${commentId}`
                            });
                            Alert.alert("Report Submitted", "Thank you for making the community safer.");
                        } catch (e) {
                            Alert.alert("Error", "Failed to submit report.");
                        }
                    }
                },
                {
                    text: "Block User",
                    style: "destructive",
                    onPress: () => {
                        Alert.alert("User Blocked", "You will no longer see content from this user.");
                        // TODO: Implement actual block logic
                    }
                }
            ]
        );
    };

    const goToNext = () => {
        if (dots && dots.length > 0 && activeIndex < dots.length - 1) {
            setActiveIndex(activeIndex + 1);
        }
    };

    const goToPrev = () => {
        if (activeIndex > 0) {
            setActiveIndex(activeIndex - 1);
        }
    };

    const formatTime = (millis: number) => {
        const totalSeconds = Math.floor(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const progress = status?.isLoaded && status.durationMillis
        ? (status.positionMillis || 0) / status.durationMillis
        : 0;


    // Safety check for crash prevention
    if (!currentItem) {
        return (
            <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <TouchableOpacity onPress={onBack} style={{ marginTop: 20, padding: 10 }}>
                    <Text style={{ color: '#fff' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            {/* Header */}
            <SafeAreaView style={{ backgroundColor: 'transparent' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 }}>
                    <TouchableOpacity onPress={onBack} style={{ padding: 8 }}>
                        <ChevronLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Fills</Text>
                    <TouchableOpacity onPress={() => setIsSidebarOpen(!isSidebarOpen)} style={{ padding: 8 }}>
                        <Menu size={24} color={isSidebarOpen ? colors.primary : "#fff"} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Main Content */}
            <View style={{ flex: 1, flexDirection: 'row' }}>
                {/* Video Section */}
                <View style={{ flex: isSidebarOpen ? 2.5 : 1 }}>
                    {/* Video Player with Swipe */}
                    <TouchableWithoutFeedback onPress={() => setShowControls(!showControls)}>
                        <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#111' }}>
                            {currentItem.mediaType === 'video' && currentItem.mediaUrl ? (
                                <Video
                                    ref={videoRef}
                                    source={{ uri: currentItem.mediaUrl }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode={ResizeMode.CONTAIN}
                                    shouldPlay={isScreenFocused && isPlaying}
                                    isLooping
                                    isMuted={isMuted}
                                    onPlaybackStatusUpdate={setStatus}
                                    onFullscreenUpdate={({ fullscreenUpdate }) => {
                                        if (fullscreenUpdate === 3) setIsFullscreen(false);
                                    }}
                                />
                            ) : currentItem.mediaUrl ? (
                                <Image source={{ uri: currentItem.mediaUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                            ) : (
                                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ color: '#666' }}>No Media</Text>
                                </View>
                            )}

                            {/* Nav Arrows */}
                            <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8 }]} pointerEvents="box-none">
                                <TouchableOpacity onPress={goToPrev} style={{ padding: 12, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20 }}>
                                    <ChevronLeft size={24} color="#fff" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={goToNext} style={{ padding: 12, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20 }}>
                                    <ChevronLeft size={24} color="#fff" style={{ transform: [{ rotate: '180deg' }] }} />
                                </TouchableOpacity>
                            </View>

                            {/* Center Play/Pause */}
                            {showControls && currentItem.mediaType === 'video' && (
                                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }]} pointerEvents="box-none">
                                    <TouchableOpacity onPress={togglePlay} style={{ padding: 20 }}>
                                        {isPlaying ? <Pause size={48} color="#fff" fill="#fff" /> : <Play size={48} color="#fff" fill="#fff" />}
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Volume Control Overlay for Fills */}
                            <TouchableOpacity
                                onPress={() => setIsMuted(!isMuted)}
                                style={{ position: 'absolute', top: 10, right: 10, padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }}
                            >
                                {isMuted ? <VolumeX size={16} color="#fff" /> : <Volume2 size={16} color="#fff" />}
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>

                    {/* Video Controls Bar */}
                    {currentItem.mediaType === 'video' && (
                        <View style={{ backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 6 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ color: '#888', fontSize: 11, width: 40 }}>{status?.isLoaded ? formatTime(status.positionMillis || 0) : '0:00'}</Text>
                                <TouchableOpacity style={{ flex: 1, height: 16, justifyContent: 'center', marginHorizontal: 6 }} onPress={(e) => { const { locationX } = e.nativeEvent; handleSeek(locationX / (SCREEN_WIDTH * 0.6)); }}>
                                    <View style={{ height: 3, backgroundColor: '#333', borderRadius: 2 }}>
                                        <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: '#fff', borderRadius: 2 }} />
                                    </View>
                                </TouchableOpacity>
                                <Text style={{ color: '#888', fontSize: 11, width: 40 }}>{status?.isLoaded && status.durationMillis ? formatTime(status.durationMillis) : '0:00'}</Text>
                                <TouchableOpacity onPress={toggleFullscreen} style={{ marginLeft: 8, padding: 4 }}>
                                    {isFullscreen ? (
                                        <Minimize size={16} color="#fff" />
                                    ) : (
                                        <Maximize size={16} color="#fff" />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Video Info + Reactions + Comments */}
                    <ScrollView style={{ flex: 1, backgroundColor: mode === 'light' ? '#fff' : '#0a0a0a' }} contentContainerStyle={{ padding: 12 }}>
                        {/* Title & User */}
                        <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold', marginBottom: 6 }}>{currentItem.description || 'Untitled Fill'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            {currentItem.avatar ? (
                                <Image source={{ uri: currentItem.avatar }} style={{ width: 28, height: 28, borderRadius: 14 }} />
                            ) : (
                                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>{currentItem.username?.charAt(0)?.toUpperCase() || '?'}</Text>
                                </View>
                            )}
                            <Text style={{ color: colors.text, fontWeight: '600', marginLeft: 8, fontSize: 13 }}>@{currentItem.username}</Text>
                        </View>

                        {/* Reaction Buttons */}
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                            {[
                                { type: 'W', label: 'W', emoji: 'w' },
                                { type: 'L', label: 'L', emoji: 'l' },
                                { type: 'CAP', label: 'Cap', emoji: 'cap' }
                            ].map(r => (
                                <TouchableOpacity
                                    key={r.type}
                                    onPress={() => handleReaction(r.type)}
                                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: userReaction === r.type ? '#333' : 'transparent', borderWidth: 1, borderColor: '#444' }}
                                >
                                    <Text style={{ color: userReaction === r.type ? '#fff' : colors.secondary, fontSize: 12, fontWeight: '600' }}>{r.label}</Text>
                                    <Text style={{ color: colors.secondary, fontSize: 11, marginLeft: 4 }}>{formatNumber(reactionCounts[r.type as keyof typeof reactionCounts] || 0)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Reaction Bubbles */}
                        {reactionBubbles.length > 0 && (
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ color: colors.secondary, fontSize: 11, marginBottom: 8, fontWeight: '600' }}>Reactions</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                    {reactionBubbles.map((bubble) => (
                                        <TouchableOpacity key={bubble.id} style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.primary }}>
                                            {bubble.mediaType === 'VIDEO' ? (
                                                <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Play size={12} color="#fff" fill="#fff" />
                                                </View>
                                            ) : (
                                                <Image source={{ uri: bubble.mediaUrl }} style={{ width: '100%', height: '100%' }} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* Comments Section */}
                        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
                            <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>Comments ({comments.length})</Text>

                            {/* Comment Input */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                <TextInput
                                    placeholder="Add a comment..."
                                    placeholderTextColor={colors.secondary}
                                    value={newComment}
                                    onChangeText={setNewComment}
                                    onSubmitEditing={postComment}
                                    style={{
                                        flex: 1,
                                        backgroundColor: mode === 'light' ? '#f0f0f0' : '#1a1a1a',
                                        borderRadius: 20,
                                        paddingHorizontal: 12,
                                        paddingVertical: 8,
                                        color: colors.text,
                                        fontSize: 12,
                                        marginRight: 8
                                    }}
                                />
                                <TouchableOpacity onPress={postComment} disabled={!newComment.trim()}>
                                    <Send size={20} color={newComment.trim() ? colors.primary : colors.secondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Comments List */}
                            <View style={{ gap: 12 }}>
                                {loadingComments ? (
                                    <View style={{ padding: 12, alignItems: 'center' }}>
                                        <Text style={{ color: colors.secondary, fontSize: 12 }}>Loading comments...</Text>
                                    </View>
                                ) : comments.length === 0 ? (
                                    <View style={{ padding: 12, backgroundColor: mode === 'light' ? '#f0f0f0' : '#1a1a1a', borderRadius: 8 }}>
                                        <Text style={{ color: colors.secondary, fontSize: 12, textAlign: 'center' }}>No comments yet. Be the first!</Text>
                                    </View>
                                ) : (
                                    comments.map((comment) => (
                                        <View key={comment.id} style={{ flexDirection: 'row', marginBottom: 12 }}>
                                            {comment.user?.profile?.avatarUrl ? (
                                                <Image source={{ uri: comment.user.profile.avatarUrl }} style={{ width: 24, height: 24, borderRadius: 12 }} />
                                            ) : (
                                                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{(comment.user?.name || 'U').charAt(0).toUpperCase()}</Text>
                                                </View>
                                            )}
                                            <View style={{ marginLeft: 8, flex: 1 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                                                        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 12 }}>{comment.user?.name || 'User'}</Text>
                                                        <Text style={{ color: colors.secondary, fontSize: 10, marginLeft: 6 }}>{new Date(comment.createdAt).toLocaleDateString()}</Text>
                                                    </View>
                                                    <TouchableOpacity onPress={() => handleReportAction(comment.id, comment.userId)} style={{ padding: 4 }}>
                                                        <MoreVertical size={14} color={colors.secondary} />
                                                    </TouchableOpacity>
                                                </View>
                                                <Text style={{ color: colors.text, fontSize: 12 }}>{comment.content}</Text>
                                            </View>
                                        </View>
                                    ))
                                )}
                            </View>

                            {/* Suggested Fills (Below Comments) */}
                            <View style={{ marginTop: 24, marginBottom: 40 }}>
                                <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 14, marginBottom: 12 }}>More Fills</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                                    {suggestedItems.map((item) => (
                                        <TouchableOpacity key={item.id} onPress={() => setActiveIndex(dots.findIndex(d => d.id === item.id))} style={{ width: 140 }}>
                                            <View style={{ aspectRatio: 16 / 9, backgroundColor: '#222', borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}>
                                                {item.mediaType === 'image' && item.mediaUrl ? (
                                                    <Image source={{ uri: item.mediaUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                                ) : (
                                                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a' }}>
                                                        <Play size={24} color="#888" fill="#888" />
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={{ color: colors.text, fontSize: 11, fontWeight: '600' }} numberOfLines={2}>{item.description || 'Untitled'}</Text>
                                            <Text style={{ color: colors.secondary, fontSize: 10, marginTop: 2 }}>@{item.username}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>
                    </ScrollView>
                </View>

                {/* Suggestions Sidebar */}
                {isSidebarOpen && (
                    <View style={{ flex: 1, backgroundColor: mode === 'light' ? '#f5f5f5' : '#0a0a0a', borderLeftWidth: 1, borderLeftColor: colors.border }}>
                        {/* Search Bar */}
                        <View style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: mode === 'light' ? '#e0e0e0' : '#1a1a1a', borderRadius: 8, paddingHorizontal: 8, height: 32 }}>
                                <Search size={14} color={colors.secondary} />
                                <TextInput
                                    placeholder="Search..."
                                    placeholderTextColor={colors.secondary}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    style={{ flex: 1, marginLeft: 6, color: colors.text, fontSize: 12, padding: 0 }}
                                />
                            </View>
                        </View>

                        {/* Featured */}
                        {featuredItem && (
                            <View style={{ paddingHorizontal: 8, marginBottom: 8 }}>
                                <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 11, marginBottom: 6 }}>Featured</Text>
                                <TouchableOpacity onPress={() => setActiveIndex(dots.findIndex(d => d.id === featuredItem.id))}>
                                    <View style={{ aspectRatio: 16 / 9, backgroundColor: '#222', borderRadius: 6, overflow: 'hidden' }}>
                                        {featuredItem.mediaType === 'image' && featuredItem.mediaUrl ? (
                                            <Image source={{ uri: featuredItem.mediaUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                        ) : (
                                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a' }}>
                                                <Play size={24} color="#888" fill="#888" />
                                                <Text style={{ color: '#666', fontSize: 9, marginTop: 4 }}>Video</Text>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            </View>
                        )}

                        <Text style={{ color: colors.text, fontWeight: 'bold', paddingHorizontal: 8, fontSize: 11, marginBottom: 4 }}>Up Next</Text>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
                            {suggestedItems.map((item) => {
                                const realIndex = dots.findIndex(d => d.id === item.id);
                                return (
                                    <View key={item.id} style={{ marginBottom: 8 }}>
                                        <TouchableOpacity onPress={() => setActiveIndex(realIndex)}>
                                            <View style={{ aspectRatio: 16 / 9, backgroundColor: '#1a1a1a', borderRadius: 6, overflow: 'hidden', marginBottom: 4 }}>
                                                {item.mediaType === 'image' && item.mediaUrl ? (
                                                    <Image source={{ uri: item.mediaUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                                ) : (
                                                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                                        <Play size={18} color="#888" fill="#888" />
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={{ color: colors.text, fontSize: 10, fontWeight: '600' }} numberOfLines={1}>{item.description || 'Untitled'}</Text>
                                        </TouchableOpacity>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={{ color: colors.secondary, fontSize: 9 }}>@{item.username}</Text>
                                            <TouchableOpacity onPress={() => removeFromUpNext(item.id)} style={{ padding: 4 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                                <X size={12} color={colors.secondary} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}
            </View>
        </View>
    );
};
// ============= END FILLS PLAYER =============


export default function DotsScreen() {
    const { colors } = useTheme();
    const { session } = useAuth();
    const router = useRouter();
    const { setHideNav } = useNavVisibility();
    const isScreenFocused = useIsFocused();

    // State matching Web - Default to 'lills' as requested
    const [activeCategory, setActiveCategory] = useState('lills');
    // Bloom State
    const [bloomMode, setBloomMode] = useState<'selection' | 'feed'>('selection');
    const [availableSlashes, setAvailableSlashes] = useState<{ tag: string, count: number }[]>([]);
    const [selectedSlashes, setSelectedSlashes] = useState<string[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [selectedPosts, setSelectedPosts] = useState<any[]>([]);
    const [bloomSearchQuery, setBloomSearchQuery] = useState('');
    const [bloomSearchResults, setBloomSearchResults] = useState<{ users: any[], posts: any[] }>({ users: [], posts: [] });

    // Feed/Grid State
    const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed'); // Start in Feed for Lills
    const [dots, setDots] = useState<DotData[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFillFilter, setActiveFillFilter] = useState('All');
    const [showCategories, setShowCategories] = useState(true);

    const [showTabs, setShowTabs] = useState(true);

    // Fills Modal State (must be before any conditional returns)
    const [fillsPlayerVisible, setFillsPlayerVisible] = useState(false);
    const [selectedFillIndex, setSelectedFillIndex] = useState(0);

    // Menu Modal State
    const [menuVisible, setMenuVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState<any>(null);

    // Comments Modal State
    const [commentsVisible, setCommentsVisible] = useState(false);
    const [commentPostId, setCommentPostId] = useState<string | null>(null);

    // Share Modal State
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [postToShare, setPostToShare] = useState<any>(null);

    const flatListRef = useRef<FlatList>(null);

    // Menu/Comment Handlers
    const handleMenuPress = useCallback((item: DotData) => {
        setSelectedPost({ id: item.postId, user: { id: item.userId, name: item.username } });
        setMenuVisible(true);
    }, []);

    const handleCommentPress = useCallback((postId: string) => {
        setCommentPostId(postId);
        setCommentsVisible(true);
    }, []);

    const handleSharePress = useCallback((item: DotData) => {
        // Convert DotData to FeedPost format for SharePostModal
        setPostToShare({
            id: item.postId,
            content: item.description,
            user: {
                id: item.userId,
                name: item.username,
                profile: { displayName: item.username, avatarUrl: item.avatar }
            },
            postMedia: [{ url: item.mediaUrl, type: (item.mediaType === 'video' ? 'VIDEO' : 'IMAGE') as any }] // Type assertion for compatibility
        });
        setShareModalVisible(true);
    }, []);

    // Hide nav bar
    useFocusEffect(
        useCallback(() => {
            setHideNav(true);
            return () => setHideNav(false);
        }, [setHideNav])
    );

    // Initial Fetch Slashes for Bloom
    useEffect(() => {
        if (activeCategory === 'bloom') {
            fetchAvailableSlashes();
        } else {
            // Reset state when switching categories to prevent crashes and mixed content
            setDots([]);
            setActiveIndex(0);
        }
    }, [activeCategory]);

    // Switch View Mode based on Category
    useEffect(() => {
        if (activeCategory === 'fills') {
            setViewMode('grid');
        } else if (activeCategory === 'bloom') {
            setViewMode('feed');
            setBloomMode('selection');
        } else {
            setViewMode('feed');
        }

        if (activeCategory !== 'bloom') {
            fetchDots(activeCategory);
        }
    }, [activeCategory]);

    // MOVED: Top-level definition to avoid Hook Order Error
    const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0 && viewableItems[0].index !== null) {
            setActiveIndex(viewableItems[0].index);
        }
    }, []);

    const fetchAvailableSlashes = async () => {
        try {
            const { data } = await supabase.from('Slash').select('tag, count').order('count', { ascending: false }).limit(20);
            if (data) setAvailableSlashes(data);
        } catch (e) { console.error("Failed to load slashes", e); }
    };

    // Bloom Search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!bloomSearchQuery.trim()) {
                setBloomSearchResults({ users: [], posts: [] });
                return;
            }
            // Search Users
            const { data: users } = await supabase.from('Profile').select('userId, displayName, avatarUrl').ilike('displayName', `%${bloomSearchQuery}%`).limit(5);
            // Search Posts
            const { data: posts } = await supabase.from('Post').select('id, content, user:User(name)').ilike('content', `%${bloomSearchQuery}%`).limit(5);

            setBloomSearchResults({
                users: users?.map(u => ({ id: u.userId, name: u.displayName, avatar: u.avatarUrl, handle: '@' + u.displayName })) || [],
                posts: posts?.map((p: any) => ({ id: p.id, content: p.content, author: Array.isArray(p.user) ? p.user[0]?.name : p.user?.name })) || []
            });

        }, 500);
        return () => clearTimeout(timer);
    }, [bloomSearchQuery]);


    const categoryToPostType: Record<string, string> = {
        lills: 'LILL',
        fills: 'FILL',
        auds: 'AUD',
        channels: 'CHAN',
        chapters: 'CHAPTER',
        xrays: 'XRAY',
        pupds: 'PULLUPDOWN',
    };

    const fetchDots = async (category: string) => {
        setLoading(true);
        try {
            const postType = categoryToPostType[category];
            if (!postType) {
                console.log('[Dots] No postType for category:', category);
                setDots([]);
                setLoading(false);
                return;
            }

            // Simplified query - just get posts with media
            let query = supabase
                .from('Post')
                .select(`
                    id, 
                    content, 
                    postType, 
                    createdAt, 
                    userId, 
                    user:User(id, name, profile:Profile(avatarUrl, displayName)), 
                    postMedia:PostMedia(media:Media(url, type, variant))
                `)
                .eq('postType', postType)
                .eq('visibility', 'PUBLIC')
                .order('createdAt', { ascending: false })
                .limit(20);

            if (session?.user?.id) {
                const filters = await getSafetyFilters(session.user.id);
                query = applySafetyFilters(query, filters);
            }

            const { data, error } = await query;

            if (error) {
                console.error('[Dots] Query error:', error);
                setDots([]);
                setLoading(false);
                return;
            }

            console.log(`[Dots] Fetched ${data?.length || 0} posts for ${category}`);

            const formattedDots = (data || []).map((post: any) => {
                const media = (post.postMedia || []).map((pm: any) => pm.media).filter(Boolean);
                let mediaUrl = '';
                let mediaType: 'video' | 'image' | 'audio' = 'image';

                if (media.length > 0) {
                    mediaUrl = media[0].url;
                    const type = media[0].type?.toUpperCase();
                    mediaType = type === 'VIDEO' ? 'video' : type === 'AUDIO' ? 'audio' : 'image';
                }

                return {
                    id: post.id,
                    postId: post.id,
                    userId: post.userId || '',
                    username: post.user?.profile?.displayName || post.user?.name || 'User',
                    avatar: post.user?.profile?.avatarUrl || '',
                    description: post.content || '',
                    likes: 0,
                    comments: 0,
                    mediaUrl,
                    mediaType,
                    category: post.postType?.toLowerCase() || 'mix',
                    isSubscribed: false,
                    followersCount: 0,
                    createdAt: post.createdAt,
                    reactionCounts: { W: 0, L: 0, CAP: 0 },
                    userReaction: null,
                    topBubbles: [],
                    postMedia: media
                };
            });

            setDots(formattedDots);
        } catch (error) {
            console.error('[Dots] Error fetching dots:', error);
            setDots([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleSlashSelection = (tag: string) => {
        setSelectedSlashes(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    const startBloom = () => {
        setBloomMode('feed');
        fetchDots('bloom');
    };

    const renderBloomSelection = () => (
        <ScrollView style={{ flex: 1, backgroundColor: '#000' }} contentContainerStyle={{ padding: 20, paddingTop: 100 }}>
            <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 8 }}>Bloom Your Feed</Text>
            <Text style={{ color: '#888', marginBottom: 24 }}>Select topics and users to curate your feed.</Text>

            <View style={{ marginBottom: 24 }}>
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginBottom: 12 }}># Topics</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {availableSlashes.map(slash => (
                        <TouchableOpacity
                            key={slash.tag}
                            onPress={() => toggleSlashSelection(slash.tag)}
                            style={{
                                paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
                                backgroundColor: selectedSlashes.includes(slash.tag) ? 'white' : 'transparent',
                                borderColor: selectedSlashes.includes(slash.tag) ? 'white' : '#333'
                            }}
                        >
                            <Text style={{ color: selectedSlashes.includes(slash.tag) ? 'black' : '#ccc', fontWeight: '600' }}>#{slash.tag} <Text style={{ fontSize: 10 }}>({slash.count})</Text></Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={{ marginBottom: 24 }}>
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginBottom: 12 }}>@ Add Users</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#333', marginBottom: 12 }}>
                    <Search size={18} color="#666" />
                    <TextInput
                        placeholder="Search users..."
                        placeholderTextColor="#666"
                        value={bloomSearchQuery}
                        onChangeText={setBloomSearchQuery}
                        style={{ flex: 1, height: 44, color: 'white', marginLeft: 8 }}
                    />
                </View>

                {/* Results */}
                {bloomSearchResults.users.length > 0 && (
                    <View style={{ gap: 8 }}>
                        {bloomSearchResults.users.map(user => (
                            <TouchableOpacity key={user.id} onPress={() => { setSelectedUsers(prev => [...prev, user.id]); setBloomSearchQuery(''); }} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', padding: 8, borderRadius: 8 }}>
                                <Image source={{ uri: user.avatar }} style={{ width: 32, height: 32, borderRadius: 16 }} />
                                <Text style={{ color: 'white', marginLeft: 12, flex: 1 }}>{user.name}</Text>
                                {selectedUsers.includes(user.id) && <Check size={16} color="#0f0" />}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            <TouchableOpacity
                onPress={startBloom}
                disabled={selectedSlashes.length === 0 && selectedUsers.length === 0}
                style={{
                    marginTop: 20, backgroundColor: 'white', padding: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
                    opacity: (selectedSlashes.length === 0 && selectedUsers.length === 0) ? 0.5 : 1
                }}
            >
                <Text style={{ color: 'black', fontWeight: 'bold', fontSize: 16, marginRight: 8 }}>Start Bloom</Text>
                <Check size={20} color="black" />
            </TouchableOpacity>

            <View style={{ height: 100 }} />
        </ScrollView>
    );

    const renderGridItem = ({ item, index }: { item: DotData; index: number }) => (
        <TouchableOpacity
            onPress={() => {
                setActiveIndex(index);
                setViewMode('feed');
            }}
            style={{ width: (SCREEN_WIDTH / 2) - 8, marginBottom: 8, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111' }}
        >
            <View style={{ width: '100%', aspectRatio: item.category === 'fills' ? 16 / 9 : 3 / 4 }}>
                {item.mediaUrl ? (
                    <Image source={{ uri: item.mediaUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                    <View style={{ width: '100%', height: '100%', backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#666' }}>No Media</Text>
                    </View>
                )}
            </View>
            <View style={{ padding: 8 }}>
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }} numberOfLines={2}>{item.description}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                    {item.avatar ? (
                        <Image source={{ uri: item.avatar }} style={{ width: 16, height: 16, borderRadius: 8 }} />
                    ) : (
                        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#333' }} />
                    )}
                    <Text style={{ color: '#888', fontSize: 11, marginLeft: 6 }} numberOfLines={1}>{item.username}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderHeader = () => {
        if (!showCategories) return null;
        return (
            <View style={{ paddingTop: 0, paddingBottom: 10 }}>
                {(activeCategory === 'fills' || viewMode === 'grid') && dots.length > 0 && (
                    <View style={{ marginBottom: 20, paddingHorizontal: 4 }}>
                        {/* Simple Featured Hero for Mobile Grid */}
                        <View style={{ height: 200, borderRadius: 12, overflow: 'hidden' }}>
                            <Image source={{ uri: dots[0].mediaUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />
                            <View style={{ position: 'absolute', bottom: 12, left: 12 }}>
                                <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>Featured</Text>
                                <Text style={{ color: '#eee', fontSize: 13 }}>{dots[0].description}</Text>
                            </View>
                        </View>
                    </View>
                )}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat.id}
                            onPress={() => setActiveCategory(cat.id)}
                            style={[styles.categoryTab, activeCategory === cat.id && styles.categoryTabActive]}
                        >
                            <Text style={[styles.categoryText, activeCategory === cat.id && styles.categoryTextActive]}>{cat.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    };

    // Main Render
    if (activeCategory === 'bloom' && bloomMode === 'selection') {
        return (
            <View style={styles.container}>
                {/* Header Back Button for Bloom Selection - Go back to Lills */}
                <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, zIndex: 100, padding: 16 }}>
                    <TouchableOpacity onPress={() => setActiveCategory('lills')} style={styles.backButton}>
                        <ChevronLeft size={28} color="#fff" />
                    </TouchableOpacity>
                </SafeAreaView>
                {renderBloomSelection()}
            </View>
        );
    }

    // Fills Tab - Grid View with Modal Player
    const openFillPlayer = (index: number) => {
        setSelectedFillIndex(index);
        setFillsPlayerVisible(true);
    };

    const renderFillsGridItem = ({ item, index }: { item: DotData; index: number }) => (
        <TouchableOpacity
            onPress={() => openFillPlayer(index)}
            style={{ width: (SCREEN_WIDTH / 2) - 12, marginBottom: 12, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111' }}
        >
            <View style={{ width: '100%', aspectRatio: 16 / 9 }}>
                {item.mediaUrl ? (
                    <Image source={{ uri: item.mediaUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                    <View style={{ width: '100%', height: '100%', backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#666' }}>No Media</Text>
                    </View>
                )}
                <View style={{ position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Play size={12} color="#fff" fill="#fff" />
                </View>
            </View>
            <View style={{ padding: 10 }}>
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }} numberOfLines={2}>{item.description || 'Untitled'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                    {item.avatar ? (
                        <Image source={{ uri: item.avatar }} style={{ width: 18, height: 18, borderRadius: 9 }} />
                    ) : (
                        <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#333' }} />
                    )}
                    <Text style={{ color: '#888', fontSize: 11, marginLeft: 6 }} numberOfLines={1}>{item.username}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderFillsPlayerModal = () => {
        if (!fillsPlayerVisible || dots.length === 0) return null;
        const currentFill = dots[selectedFillIndex];
        if (!currentFill) return null;

        return (
            <Modal visible={fillsPlayerVisible} animationType="fade" presentationStyle="fullScreen" onRequestClose={() => setFillsPlayerVisible(false)}>
                <View style={{ flex: 1, backgroundColor: '#000' }}>
                    <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
                        <TouchableOpacity onPress={() => setFillsPlayerVisible(false)} style={{ padding: 8 }}>
                            <X size={28} color="#fff" />
                        </TouchableOpacity>
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{selectedFillIndex + 1} / {dots.length}</Text>
                        <View style={{ width: 44 }} />
                    </SafeAreaView>

                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        {currentFill.mediaType === 'video' && currentFill.mediaUrl ? (
                            <Video
                                source={{ uri: currentFill.mediaUrl }}
                                style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * (9 / 16) }}
                                resizeMode={ResizeMode.CONTAIN}
                                shouldPlay={isScreenFocused}
                                isLooping
                                useNativeControls
                            />
                        ) : (
                            <Image source={{ uri: currentFill.mediaUrl }} style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * (9 / 16) }} resizeMode="contain" />
                        )}
                    </View>

                    <SafeAreaView style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 }}>
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>{currentFill.description || 'Untitled'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {currentFill.avatar ? (
                                <Image source={{ uri: currentFill.avatar }} style={{ width: 32, height: 32, borderRadius: 16 }} />
                            ) : (
                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#333' }} />
                            )}
                            <Text style={{ color: '#ccc', fontSize: 14, marginLeft: 10 }}>@{currentFill.username}</Text>
                        </View>
                    </SafeAreaView>
                </View>
            </Modal>
        );
    };

    // Fills Grid View
    if (activeCategory === 'fills') {
        return (
            <View style={styles.container}>
                <SafeAreaView style={{ backgroundColor: '#0a0a0a' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
                        <TouchableOpacity onPress={() => setActiveCategory('lills')} style={{ marginRight: 12 }}>
                            <ChevronLeft size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', flex: 1 }}>Fills</Text>
                    </View>
                </SafeAreaView>

                {loading ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator size="large" color="#fff" />
                    </View>
                ) : (
                    <FlatList
                        data={dots}
                        renderItem={renderFillsGridItem}
                        keyExtractor={item => item.id}
                        numColumns={2}
                        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 8 }}
                        contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
                        style={{ backgroundColor: '#000' }}
                    />
                )}

                {renderFillsPlayerModal()}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <SafeAreaView style={[styles.header, { backgroundColor: viewMode === 'grid' ? '#0f0f0f' : 'transparent', pointerEvents: 'box-none' }]}>
                <View style={[styles.headerRow, { marginBottom: 0, paddingLeft: 10 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <TouchableOpacity onPress={router.back} style={{ marginRight: 8, padding: 4 }}>
                            <ChevronLeft size={24} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowTabs(!showTabs)} style={{ marginRight: 12, padding: 4 }}>
                            {/* White Dot Icon as requested */}
                            {showTabs ? <X size={24} color="#fff" /> : <DotIcon size={24} color="#ffffff" fill="#ffffff" />}
                        </TouchableOpacity>

                        {showTabs && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                {CATEGORIES.map(cat => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        onPress={() => setActiveCategory(cat.id)}
                                        style={[styles.categoryTab, activeCategory === cat.id && styles.categoryTabActive]}
                                    >
                                        <Text style={[styles.categoryText, activeCategory === cat.id && styles.categoryTextActive]}>{cat.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
                {/* Featured Hero only for Grid view and Fills */}
                {viewMode === 'grid' && activeCategory === 'fills' && dots.length > 0 && (
                    <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 }}>
                        <View style={{ height: 200, borderRadius: 12, overflow: 'hidden' }}>
                            <Image source={{ uri: dots[0].mediaUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />
                            <View style={{ position: 'absolute', bottom: 12, left: 12 }}>
                                <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>Featured</Text>
                                <Text style={{ color: '#eee', fontSize: 13 }}>{dots[0].description}</Text>
                            </View>
                        </View>
                    </View>
                )}
            </SafeAreaView>

            {viewMode === 'grid' ? (
                <FlatList
                    key="grid-view"
                    data={dots}
                    renderItem={renderGridItem}
                    keyExtractor={item => item.id}
                    numColumns={2}
                    columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 4 }}
                    contentContainerStyle={{ paddingTop: activeCategory === 'fills' ? 280 : 80, paddingBottom: 100 }}
                    style={{ backgroundColor: '#000' }}
                />
            ) : (
                <FlatList
                    key="feed-view"
                    ref={flatListRef}
                    data={dots}
                    renderItem={({ item, index }) => <DotItem item={item} isActive={index === activeIndex} autoScroll={false} onVideoEnd={() => { }} onToggleAutoScroll={() => { }} onSubscribe={() => { }} isScreenFocused={isScreenFocused} onMenuPress={handleMenuPress} onCommentPress={handleCommentPress} onSharePress={handleSharePress} />}
                    pagingEnabled
                    showsVerticalScrollIndicator={false}
                    snapToInterval={SCREEN_HEIGHT}
                    decelerationRate="fast"
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={VIEWABILITY_CONFIG}
                    removeClippedSubviews={true}
                    initialNumToRender={1}
                    maxToRenderPerBatch={2}
                    windowSize={3}
                    style={{ backgroundColor: '#000' }}
                />
            )}


            <PostOptionsModal
                visible={menuVisible}
                onClose={() => setMenuVisible(false)}
                post={selectedPost ? {
                    id: selectedPost.id,
                    user: { id: selectedPost.userId, name: selectedPost.username },
                    content: selectedPost.description,
                    postType: selectedPost.category ? selectedPost.category.toUpperCase() : 'POST'
                } : null}
                onReport={() => Alert.alert("Reported", "Thanks for letting us know.")}
                onBlock={() => {
                    setDots(prev => prev.filter(p => p.userId !== selectedPost?.userId));
                }}
                onDelete={() => {
                    setDots(prev => prev.filter(p => p.id !== selectedPost?.id));
                }}
                onHide={() => {
                    setDots(prev => prev.filter(p => p.id !== selectedPost?.id));
                }}
                onMute={() => {
                    setDots(prev => prev.filter(p => p.userId !== selectedPost?.userId));
                }}
            />

            <CommentsModal
                visible={commentsVisible}
                onClose={() => setCommentsVisible(false)}
                postId={commentPostId}
            />

            {postToShare && (
                <SharePostModal
                    visible={shareModalVisible}
                    onClose={() => setShareModalVisible(false)}
                    post={postToShare}
                />
            )}
        </View >
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
