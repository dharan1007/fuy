
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, TouchableWithoutFeedback, Modal, ActivityIndicator } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import { MoreHorizontal, Plus, MessageCircle, Send, Play, Volume2, VolumeX, User, Slash, Maximize2, ChevronLeft, ChevronRight, Users } from 'lucide-react-native';
import SlashesModal from './SlashesModal';
import XrayScratch from './XrayScratch';
import { VerifiedBadge } from './VerifiedBadge';
import TaggedUsersModal from './TaggedUsersModal';
import { MediaUploadService } from '../services/MediaUploadService';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, Defs, ClipPath, G, Rect } from 'react-native-svg';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withSequence, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Heart, Sparkles } from 'lucide-react-native';
import { PoopIcon, MagicCapIcon } from './ReactionIcons';


interface FeedPostItemProps {
    item: any;
    isActive: boolean;
    colors: any;
    mode: any;
    onReact: (id: string, type: string) => void;
    onAddBubble: (id: string, newBubble?: any) => void;
    onToggleScroll?: (enabled: boolean) => void;
    onActivate: () => void;
    onMenuPress: (post: any) => void;
    onCommentPress: (postId: string) => void;
    onSharePress: (post: any) => void;
    isScreenFocused: boolean;
}

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
    onSharePress,
    isScreenFocused
}: FeedPostItemProps) => {
    const hasMedia = item.postMedia && item.postMedia.length > 0;

    // Tap to Play/Pause Control
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [slashesModalVisible, setSlashesModalVisible] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [taggedUsersModalVisible, setTaggedUsersModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Carousel State
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

    const router = useRouter();

    // Reset pause state when active item changes
    useEffect(() => {
        if (!isActive) setIsPaused(false);
    }, [isActive]);

    // Reset carousel when item changes
    useEffect(() => {
        setCurrentMediaIndex(0);
    }, [item.id]);

    const handleNextMedia = (e?: any) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (item.postMedia && currentMediaIndex < item.postMedia.length - 1) {
            setCurrentMediaIndex(prev => prev + 1);
        }
    };

    const handlePrevMedia = (e?: any) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (currentMediaIndex > 0) {
            setCurrentMediaIndex(prev => prev - 1);
        }
    };

    const handlePress = () => {
        if (!isActive) {
            onActivate();
        } else {
            setIsPaused(prev => !prev);
        }
    };

    const handleProfilePress = () => {
        if (item.user?.id) {
            router.push(`/profile/${item.user.id}`);
        }
    };

    const formatCount = (count: number) => {
        if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
        return count.toString();
    };

    const name = item.user?.profile?.displayName || item.user?.name || 'Anonymous';
    const rawName = item.user?.name || 'anonymous';
    const handle = `@${rawName.toLowerCase().replace(/ /g, '')}`;
    const avatar = item.user?.profile?.avatarUrl;
    const location = item.user?.profile?.location;

    // Adaptive aspect ratio
    let aspectRatio = 1 / 1.1; // Default
    if (item.postType === 'LILL') aspectRatio = 9 / 16;
    if (item.postType === 'FILL') aspectRatio = 16 / 9;
    if (!aspectRatio) aspectRatio = 1; // Fallback
    if (!hasMedia) aspectRatio = undefined as any;

    return (
        <View className="mb-8 mx-4">

            {/* 1. Header Row (Above Media) */}
            <View className="flex-row items-center justify-between mb-3 px-1">
                <View className="flex-row items-center flex-1">
                    {/* Avatar */}
                    <TouchableOpacity onPress={handleProfilePress}>
                        {avatar ? (
                            <Image
                                source={{ uri: avatar }}
                                className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10"
                            />
                        ) : (
                            <View className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10 items-center justify-center">
                                <User size={16} color={colors.text} />
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Meta */}
                    <View className="ml-3 flex-1">
                        <View className="flex-row items-center">
                            <TouchableOpacity onPress={handleProfilePress}>
                                <Text className="font-bold text-sm mr-1" style={{ color: colors.text }}>
                                    {name}
                                </Text>
                            </TouchableOpacity>
                            <VerifiedBadge size={14} isHumanVerified={item.user?.isHumanVerified} />
                        </View>
                        <Text className="text-[11px] font-medium" style={{ color: colors.secondary }}>
                            {handle}{location ? ` • ${location}` : ''}
                        </Text>
                    </View>
                </View>

                {/* Right Header Actions */}
                <View className="flex-row items-center gap-3">
                    {item.postType && (
                        <View className="px-2 py-1 rounded-md border border-white/10 bg-white/5">
                            <Text className="text-[9px] font-bold tracking-widest uppercase" style={{ color: colors.text }}>
                                {item.postType}
                            </Text>
                        </View>
                    )}
                    <TouchableOpacity onPress={() => onMenuPress(item)} className="p-1">
                        <MoreHorizontal color={colors.secondary} size={20} />
                    </TouchableOpacity>
                </View>
            </View>


            {/* 2. Media Content */}
            {hasMedia && (
                <View className="rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 relative mb-3" style={{ aspectRatio }}>
                    {(() => {
                        if (item.postType === 'XRAY' && item.postMedia.length >= 2) {
                            // X-Ray Logic (Keep existing)
                            let cover = item.postMedia.find((m: any) => m.variant === 'xray-bottom');
                            let content = item.postMedia.find((m: any) => m.variant === 'xray-top');
                            if (!cover || !content) { cover = item.postMedia[0]; content = item.postMedia[1]; }

                            if (cover && content) {
                                return (
                                    <XrayScratch
                                        coverUrl={cover.url}
                                        coverType={cover.type}
                                        contentUrl={content.url}
                                        contentType={content.type}
                                        isActive={isActive}
                                        onToggleScroll={onToggleScroll || (() => { })}
                                    />
                                );
                            }
                        }

                        // Standard Carousel Logic
                        const media = item.postMedia[currentMediaIndex];
                        if (!media) return null;

                        const panGesture = Gesture.Pan()
                            .activeOffsetX([-20, 20])
                            .onEnd((e) => {
                                if (e.translationX < -50) {
                                    runOnJS(handleNextMedia)();
                                } else if (e.translationX > 50) {
                                    runOnJS(handlePrevMedia)();
                                }
                            });

                        return (
                            <GestureDetector gesture={panGesture}>
                                <View style={{ width: '100%', height: '100%' }}>
                                    {/* 
                                     * OPTIMIZATION: Always render the video component so it shows the first frame.
                                     * The 'shouldPlay' prop handles playing/pausing.
                                     */}
                                    <TouchableWithoutFeedback onPress={handlePress}>
                                        <View style={{ width: '100%', height: '100%', backgroundColor: '#111' }}>
                                            <Video
                                                source={{ uri: media.url }}
                                                style={{ width: '100%', height: '100%' }}
                                                resizeMode={ResizeMode.COVER}
                                                shouldPlay={isActive && !isPaused && isScreenFocused}
                                                isLooping
                                                isMuted={isMuted}
                                                useNativeControls={false}
                                                onLoadStart={() => setIsLoading(true)}
                                                onLoad={() => setIsLoading(false)}
                                                onError={(e) => console.log('Video Error:', e)}
                                            />
                                            {/* Loading Indicator */}
                                            {isLoading && (
                                                <View className="absolute inset-0 items-center justify-center bg-black/10">
                                                    <ActivityIndicator size="large" color="white" />
                                                </View>
                                            )}
                                            {/* Play Overlay */}
                                            {isActive && isPaused && !isLoading && (
                                                <View className="absolute inset-0 items-center justify-center bg-black/20 pointer-events-none">
                                                    <View className="bg-black/40 rounded-full p-3 backdrop-blur-sm">
                                                        <Play size={24} color="white" fill="white" />
                                                    </View>
                                                </View>
                                            )}

                                            {/* Volume Control */}
                                            <TouchableOpacity
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    setIsMuted(!isMuted);
                                                }}
                                                className="absolute bottom-3 right-3 p-2 bg-black/40 rounded-full backdrop-blur-sm"
                                                style={{ zIndex: 10 }}
                                            >
                                                {isMuted ? (
                                                    <VolumeX size={16} color="white" />
                                                ) : (
                                                    <Volume2 size={16} color="white" />
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableWithoutFeedback>
                                    {/* 
                                     * OPTIMIZATION NOTE: 
                                     * Ideally we render an <Image> as thumbnail. 
                                     * Since we lack thumb URLs, we are forced to use <Video> component even for inactive items to show the first frame.
                                     * To prevent crashes, we MUST rely on FlatList `windowSize` and `maxToRenderPerBatch` in the parent.
                                     * AND ensure we don't have OTHER video instances (like bubbles) running.
                                     */}
                                </View>
                            </GestureDetector>
                        );
                    })()}
                </View>
            )
            }

            {/* Content Text */}
            {!hasMedia && (
                <View className="p-4 rounded-2xl border border-white/10 mb-3 bg-white/5">
                    <Text className="text-base font-medium leading-6" style={{ color: colors.text }}>
                        {item.content}
                    </Text>
                </View>
            )}

            {/* Caption */}
            {hasMedia && item.content && (
                <Text className="text-sm font-medium leading-5 mb-3 px-1" style={{ color: colors.text }} numberOfLines={3}>
                    {item.content}
                    {item.slashes && item.slashes.length > 0 && (
                        <Text className="text-sm font-bold opacity-50" style={{ color: colors.text }}>
                            {item.slashes.map((s: any) => ` /${s.tag}`).join('')}
                        </Text>
                    )}
                </Text>
            )}

            {/* Product Pill */}
            {item.taggedProduct && (
                <TouchableOpacity
                    onPress={() => router.push(`/shop/product/${item.taggedProduct.id}`)}
                    className="flex-row items-center bg-white/10 self-start rounded-full pl-1 pr-3 py-1 mb-3 ml-1 border border-white/20"
                >
                    <Image
                        source={{ uri: item.taggedProduct.image }}
                        className="w-6 h-6 rounded-full bg-zinc-800"
                    />
                    <View className="ml-2">
                        <Text className="text-[10px] font-bold text-white leading-3">{item.taggedProduct.name}</Text>
                        <Text className="text-[9px] text-white/60 leading-3">${item.taggedProduct.price}</Text>
                    </View>
                </TouchableOpacity>
            )}


            {/* 3. Action Row (Reactions & Interactions) */}
            <View className="flex-row items-center justify-between px-1">

                {/* Left: Aesthetic Compact Reactions */}
                <View className="flex-row items-center gap-2">
                    {/* W Button (Heart) */}
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onReact(item.id, 'W');
                        }}
                        className="flex-row items-center px-3 py-1.5 rounded-full"
                    >
                        <Heart
                            size={16}
                            color={item.userReaction === 'W' ? '#ef4444' : 'white'}
                            fill={item.userReaction === 'W' ? '#ef4444' : 'transparent'}
                        />
                        <Text className="text-[11px] ml-1.5 font-medium" style={{ color: 'white' }}>
                            {formatCount((item.reactionCounts as any)?.['W'] || 0)}
                        </Text>
                    </TouchableOpacity>

                    {/* L Button (L Text -> Poop Icon) */}
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onReact(item.id, 'L');
                        }}
                        className="flex-row items-center px-3 py-1.5 rounded-full"
                    >
                        {item.userReaction === 'L' ? (
                            <PoopIcon color="#f97316" />
                        ) : (
                            <Text className="text-[11px] font-bold" style={{ color: 'white' }}>L</Text>
                        )}
                        <Text className="text-[11px] ml-1.5 font-medium" style={{ color: 'white' }}>
                            {formatCount((item.reactionCounts as any)?.['L'] || 0)}
                        </Text>
                    </TouchableOpacity>

                    {/* CAP Button (CAP Text -> Magic Cap Icon) */}
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onReact(item.id, 'CAP');
                        }}
                        className="flex-row items-center px-3 py-1.5 rounded-full"
                    >
                        {item.userReaction === 'CAP' ? (
                            <MagicCapIcon color="#14532d" />
                        ) : (
                            <Text className="text-[11px] font-bold" style={{ color: 'white' }}>CAP</Text>
                        )}
                        <Text className="text-[11px] ml-1.5 font-medium" style={{ color: 'white' }}>
                            {formatCount((item.reactionCounts as any)?.['CAP'] || 0)}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Right: Interactions (Comments, Share, Slash, Tags) */}
                <View className="flex-row items-center gap-4">
                    {/* Tagged Users Icon */}
                    {item.taggedUsers && item.taggedUsers.length > 0 && (
                        <TouchableOpacity onPress={() => setTaggedUsersModalVisible(true)} className="opacity-80">
                            <Users size={18} color={colors.text} />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity onPress={() => onAddBubble(item.id)} className="opacity-80">
                        <Plus size={20} color={colors.text} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => onCommentPress(item.id)} className="flex-row items-center gap-1 opacity-80">
                        <MessageCircle size={20} color={colors.text} />
                        {item.commentCount > 0 && <Text className="text-xs font-medium" style={{ color: colors.text }}>{formatCount(item.commentCount)}</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => onSharePress(item)} className="opacity-80">
                        <Send size={20} color={colors.text} style={{ transform: [{ rotate: '-45deg' }, { translateX: 2 }] }} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Reaction Bubbles - OPTIMIZED: Remove Video components to prevent OOM */}
            {(item.topBubbles && item.topBubbles.length > 0) && (
                <View className="flex-row items-center mt-3 px-1">
                    <View className="flex-row -space-x-2">
                        {item.topBubbles.map((bubble: any, i: number) => (
                            <View key={i} className="w-6 h-6 rounded-full border border-black overflow-hidden bg-zinc-800">
                                {/* Use Image even for videos (might need thumb, but prevents crash) */}
                                <Image
                                    source={{ uri: bubble.mediaUrl }}
                                    className="w-full h-full"
                                    style={{ backgroundColor: '#333' }}
                                />
                            </View>
                        ))}
                    </View>
                    <Text className="text-[10px] ml-2 font-medium" style={{ color: colors.secondary }}>
                        reacted
                    </Text>
                </View>
            )}


            {/* Fullscreen Video Modal for FILL posts */}
            {item.postType === 'FILL' && (
                <Modal
                    visible={isFullscreen}
                    animationType="fade"
                    statusBarTranslucent
                    onRequestClose={() => setIsFullscreen(false)}
                >
                    <View style={{ flex: 1, backgroundColor: 'black' }}>
                        <Video
                            source={{ uri: item.postMedia[0].url }}
                            style={{ flex: 1, width: '100%', height: '100%' }}
                            resizeMode={ResizeMode.CONTAIN}
                            shouldPlay={isFullscreen}
                            isLooping
                            useNativeControls
                        />
                        <TouchableOpacity
                            onPress={() => setIsFullscreen(false)}
                            style={{ position: 'absolute', top: 40, right: 20, padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </Modal>
            )}

            <SlashesModal
                visible={slashesModalVisible}
                onClose={() => setSlashesModalVisible(false)}
                slashes={item.slashes || []}
            />

            <TaggedUsersModal
                visible={taggedUsersModalVisible}
                users={item.taggedUsers || []}
                onClose={() => setTaggedUsersModalVisible(false)}
                onUserPress={(userId) => {
                    setTaggedUsersModalVisible(false);
                    router.push(`/profile/${userId}`);
                }}
            />
        </View>
    );
});

export default FeedPostItem;
