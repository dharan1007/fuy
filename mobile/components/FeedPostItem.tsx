
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, TouchableWithoutFeedback, Modal, ActivityIndicator, Animated as RNAnimated } from 'react-native';
import { BlurView } from 'expo-blur';
import { MoreHorizontal, Plus, MessageCircle, Send, Play, Volume2, VolumeX, User, Slash, Maximize2, ChevronLeft, ChevronRight, Users } from 'lucide-react-native';
import SlashesModal from './SlashesModal';
import XrayScratch from './XrayScratch';
import { VerifiedBadge } from './VerifiedBadge';
import TaggedUsersModal from './TaggedUsersModal';
import ReactionBubblesModal from './ReactionBubblesModal';
import FloatingReactionBubbles from './FloatingReactionBubbles';
import { MediaUploadService } from '../services/MediaUploadService';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, Defs, ClipPath, G, Rect } from 'react-native-svg';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withSequence, withTiming, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Heart, Sparkles } from 'lucide-react-native';
import { PoopIcon, MagicCapIcon } from './ReactionIcons';
import FeedVideoPlayer from './FeedVideoPlayer';
import AudioIndicator from './AudioIndicator';
import SmallAudioCard from './SmallAudioCard';

// **NEW** Import the ExploreService for telemetry
import { ExploreService } from '../services/ExploreService';


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
    globalIsMuted?: boolean;
    setGlobalIsMuted?: (muted: boolean) => void;
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
    isScreenFocused,
    globalIsMuted = false,
    setGlobalIsMuted = () => { }
}: FeedPostItemProps) => {
    const hasMedia = item.postMedia && item.postMedia.length > 0;

    // Tap to Play/Pause Control
    const [isPaused, setIsPaused] = useState(false);
    const [slashesModalVisible, setSlashesModalVisible] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [taggedUsersModalVisible, setTaggedUsersModalVisible] = useState(false);
    const [bubblesModalVisible, setBubblesModalVisible] = useState(false);
    const [bubblesCollapsed, setBubblesCollapsed] = useState(false);
    const bubbleScale = useSharedValue(1);
    const bubbleOpacity = useSharedValue(1);

    const popBubbles = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Pop animation: scale up then shrink to 0
        bubbleScale.value = withSequence(
            withSpring(1.3, { damping: 4, stiffness: 300 }),
            withSpring(0, { damping: 8, stiffness: 200 })
        );
        bubbleOpacity.value = withTiming(0, { duration: 300 });
        setTimeout(() => {
            setBubblesCollapsed(true);
        }, 350);
    };

    const bubbleAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: bubbleScale.value }],
        opacity: bubbleOpacity.value,
    }));

    // Double tap to like
    const lastTapRef = useRef<number>(0);
    const heartAnim = useRef(new RNAnimated.Value(0)).current;
    const [showHeart, setShowHeart] = useState(false);

    // Carousel State
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

    const router = useRouter();

    // **NEW** Telemetry Tracking State
    const actionLogged = useRef<Record<string, boolean>>({});

    // Reset pause state when active item changes
    useEffect(() => {
        if (!isActive) {
            setIsPaused(false);

            // If the item became inactive quickly, log a QUICK_SCROLL (if we haven't already logged a FULL_WATCH)
            if (!actionLogged.current['FULL_WATCH'] && !actionLogged.current['QUICK_SCROLL']) {
                ExploreService.logRecommendationFeedback(item.id, 'POST', 'QUICK_SCROLL', item.slashes?.map((s: any) => s.tag));
                actionLogged.current['QUICK_SCROLL'] = true;
            }
        } else {
            // Reset logs when item becomes active again
            actionLogged.current = {};
        }
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
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;

        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            // Double tap - like with 'W'
            if (item.userReaction !== 'W') {
                onReact(item.id, 'W');
            }
            // Show heart animation
            setShowHeart(true);
            heartAnim.setValue(0);
            RNAnimated.sequence([
                RNAnimated.spring(heartAnim, { toValue: 1, useNativeDriver: true, friction: 3 }),
                RNAnimated.delay(400),
                RNAnimated.timing(heartAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]).start(() => setShowHeart(false));
            lastTapRef.current = 0;
        } else {
            lastTapRef.current = now;
            // Single tap after delay
            setTimeout(() => {
                if (lastTapRef.current === now) {
                    if (!isActive) {
                        onActivate();
                    } else {
                        setIsPaused(prev => !prev);
                    }
                }
            }, DOUBLE_TAP_DELAY);
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
    const handle = `@${(item.user?.profile?.displayName || item.user?.name || 'anonymous').toLowerCase().replace(/ /g, '')}`;
    const avatar = item.user?.profile?.avatarUrl;
    const location = item.user?.profile?.location;

    // Adaptive aspect ratio
    let aspectRatio = 1 / 1.1; // Default
    if (item.postType === 'LILL') aspectRatio = 9 / 16;
    if (item.postType === 'FILL') aspectRatio = 16 / 9;
    if (!aspectRatio) aspectRatio = undefined as any;

    return (
        <View className="mb-8 w-full border-b border-white/5 pb-4">

            {/* 1. Header Row (Above Media) */}
            <View className="flex-row items-center justify-between mb-3 px-4">
                <View className="flex-row items-center flex-1">
                    <View className="flex-row items-center bg-white/5 rounded-[24px] p-1 border border-white/20" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3 }}>
                        {/* Avatar */}
                        <TouchableOpacity onPress={() => {
                            handleProfilePress();
                            // **NEW** Telemetry: Profile Visit
                            ExploreService.logRecommendationFeedback(item.id, 'POST', 'PROFILE_VISIT', item.slashes?.map((s: any) => s.tag));
                        }}>
                            {avatar ? (
                                <Image
                                    source={{ uri: avatar }}
                                    className="w-10 h-10 rounded-full bg-zinc-800 border border-white/20"
                                />
                            ) : (
                                <View className="w-10 h-10 rounded-full bg-zinc-800 border border-white/20 items-center justify-center">
                                    <User size={20} color={colors.text} />
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Meta */}
                        <View className="ml-2 mr-3 justify-center">
                            <View className="flex-row items-center">
                                <TouchableOpacity onPress={() => {
                                    handleProfilePress();
                                    ExploreService.logRecommendationFeedback(item.id, 'POST', 'PROFILE_VISIT', item.slashes?.map((s: any) => s.tag));
                                }}>
                                    <Text className="text-[13px] mr-1 font-bold shadow-sm" style={{ color: colors.text }}>
                                        {name}
                                    </Text>
                                </TouchableOpacity>
                                <VerifiedBadge size={8} isHumanVerified={item.user?.isHumanVerified} />
                            </View>
                            <Text className="text-[9px] font-medium mt-0.5 opacity-70" style={{ color: colors.secondary }}>
                                {handle}{location ? ` • ${location}` : ''}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Right Header Actions */}
                <View className="flex-row items-center gap-3">
                    {/* Audio Card centered between Name and Post Type */}
                    {item.audioInfo && (
                        <SmallAudioCard 
                            audioInfo={item.audioInfo} 
                            containerStyle={{ width: 100, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: 'rgba(255,255,255,0.05)' }} 
                        />
                    )}
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

                        // 1. Existing Pan Gesture (Swipe left/right to change media)
                        const panGesture = Gesture.Pan()
                            .activeOffsetX([-20, 20])
                            .onEnd((e) => {
                                if (e.translationX < -50) {
                                    runOnJS(handleNextMedia)();
                                } else if (e.translationX > 50) {
                                    runOnJS(handlePrevMedia)();
                                }
                            });

                        // 2. New Long Press Gesture (2x Speed)
                        const [isFastForwarding, setIsFastForwarding] = useState(false);
                        const longPressGesture = Gesture.LongPress()
                            .minDuration(400) // 400ms hold to trigger
                            .onStart(() => {
                                // Only apply to video posts (Lills, Fills, or Video media)
                                if (media.type === 'VIDEO' || item.postType === 'LILL' || item.postType === 'FILL') {
                                    runOnJS(setIsFastForwarding)(true);
                                }
                            })
                            .onEnd(() => {
                                runOnJS(setIsFastForwarding)(false);
                            })
                            .onFinalize(() => {
                                runOnJS(setIsFastForwarding)(false);
                            });

                        // Combine gestures so both can exist (simultaneous because long press shouldn't block swiping if finger moves)
                        const combinedGestures = Gesture.Simultaneous(panGesture, longPressGesture);

                        return (
                            <GestureDetector gesture={combinedGestures}>
                                <View style={{ width: '100%', height: '100%' }}>
                                    {/* 
                                     * OPTIMIZATION: Always render the video component so it shows the first frame.
                                     * The 'shouldPlay' prop handles playing/pausing.
                                     */}
                                    <TouchableWithoutFeedback onPress={handlePress}>
                                        <View style={{ width: '100%', height: '100%', backgroundColor: '#111' }}>
                                            <View style={{ flex: 1 }}>
                                                <FeedVideoPlayer
                                                    key={media.url}
                                                    url={media.url}
                                                    isActive={isActive}
                                                    isPaused={isPaused}
                                                    isMuted={globalIsMuted}
                                                    isScreenFocused={isScreenFocused}
                                                    posterUrl={media.thumbnailUrl || media.url}
                                                    playbackRate={isFastForwarding ? 2.0 : 1.0}
                                                />
                                                
                                                {/* 2x Speed Indicator Overlay */}
                                                {isFastForwarding && (
                                                    <View style={{
                                                        position: 'absolute',
                                                        top: 20,
                                                        alignSelf: 'center',
                                                        backgroundColor: 'rgba(0,0,0,0.6)',
                                                        paddingHorizontal: 16,
                                                        paddingVertical: 8,
                                                        borderRadius: 20,
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        zIndex: 20,
                                                        borderWidth: 1,
                                                        borderColor: 'rgba(255,255,255,0.2)'
                                                    }}>
                                                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13, marginRight: 4 }}>
                                                            2x Speed
                                                        </Text>
                                                        <Text style={{ color: 'white', fontSize: 13 }}>{`>>`}</Text>
                                                    </View>
                                                )}

                                                {/* Audio Toggle Overlay */}
                                                <TouchableOpacity
                                                    onPress={(e) => { e.stopPropagation(); setGlobalIsMuted(!globalIsMuted); }}
                                                    style={{ position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.4)', padding: 6, borderRadius: 20, zIndex: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
                                                >
                                                    {globalIsMuted ? <VolumeX color="white" size={14} /> : <Volume2 color="white" size={14} />}
                                                </TouchableOpacity>

                                                {/* Double-tap heart animation */}
                                                {showHeart && (
                                                    <RNAnimated.View style={{
                                                        position: 'absolute', top: '50%', left: '50%',
                                                        marginLeft: -40, marginTop: -40,
                                                        opacity: heartAnim,
                                                        transform: [{ scale: heartAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.2] }) }],
                                                    }}>
                                                        <Heart size={80} color="#ef4444" fill="#ef4444" />
                                                    </RNAnimated.View>
                                                )}

                                                {/* Floating SWIPEABLE Bubbles Over Media */}
                                                {(item.topBubbles && item.topBubbles.length > 0 && !bubblesCollapsed) && (
                                                    <View style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
                                                        <GestureDetector gesture={
                                                            Gesture.Pan()
                                                                .activeOffsetX([-10, 10])
                                                                .onEnd((e) => {
                                                                    if (e.translationX > 20 || e.translationX < -20) {
                                                                        runOnJS(popBubbles)();
                                                                    }
                                                                })
                                                        }>
                                                            <Animated.View style={[{ flexDirection: 'row-reverse' }, bubbleAnimStyle]}>
                                                                {item.topBubbles.slice(0, 3).map((bubble: any, i: number) => (
                                                                    <TouchableOpacity key={bubble.id || i} onPress={(e) => { e.stopPropagation(); setBubblesModalVisible(true); }} style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.6)', marginLeft: i > 0 ? -6 : 0, zIndex: 10 - i }}>
                                                                        <Image source={{ uri: bubble.mediaUrl }} style={{ width: '100%', height: '100%', backgroundColor: '#222' }} />
                                                                    </TouchableOpacity>
                                                                ))}
                                                            </Animated.View>
                                                        </GestureDetector>
                                                    </View>
                                                )}
                                            </View>
                                            {/* Play Overlay */}
                                            {isActive && isPaused && (
                                                <View className="absolute inset-0 items-center justify-center bg-black/20 pointer-events-none">
                                                    <View className="bg-black/40 rounded-full p-3 backdrop-blur-sm">
                                                        <Play size={24} color="white" fill="white" />
                                                    </View>
                                                </View>
                                            )}


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
                <View className="px-4 mb-3">
                    <View className="p-4 rounded-2xl border border-white/10 bg-white/5">
                        <Text className="text-base font-medium leading-6" style={{ color: colors.text }}>
                            {item.content}
                        </Text>
                    </View>
                </View>
            )}

            {/* Caption */}
            {hasMedia && item.content && (
                <View className="px-4 mb-4">
                    <View className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                        <Text className="text-[13px] font-medium leading-5" style={{ color: colors.text }} numberOfLines={3}>
                            <Text style={{ fontWeight: '900', color: colors.primary, opacity: 0.8 }}>&gt; </Text>
                            {item.content}
                            {item.slashes && item.slashes.length > 0 && (
                                <Text className="text-sm font-bold opacity-40 ml-1" style={{ color: colors.text }}>
                                    {' ' + item.slashes.map((s: any) => `/${s.tag}`).join(' ')}
                                </Text>
                            )}
                        </Text>
                    </View>
                </View>
            )}

            {/* Audio Indicator */}
            {item.audioInfo && (
                <AudioIndicator audioInfo={item.audioInfo} />
            )}

            {/* Product Pill */}
            {item.taggedProduct && (
                <View className="px-4">
                    <TouchableOpacity
                        onPress={() => router.push(`/shop/product/${item.taggedProduct.id}`)}
                        className="flex-row items-center bg-white/10 self-start rounded-full pl-1 pr-3 py-1 mb-3 border border-white/20"
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
                </View>
            )}


            {/* 3. Action Row (Reactions & Interactions) */}
            <View className="flex-row items-center justify-between px-4 pb-2">

                {/* Left: Aesthetic Compact Reactions - GROUPED */}
                <View className="flex-row items-center gap-1 bg-white/5 rounded-full px-2 py-1.5 border border-white/20">
                    {/* W Button (Heart) */}
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onReact(item.id, 'W');
                            ExploreService.logRecommendationFeedback(item.id, 'POST', 'LIKE', item.slashes?.map((s: any) => s.tag));
                        }}
                        className="flex-row items-center px-2 py-1 rounded-full"
                    >
                        <Heart
                            size={14}
                            color={item.userReaction === 'W' ? '#ef4444' : 'white'}
                            fill={item.userReaction === 'W' ? '#ef4444' : 'transparent'}
                        />
                        <Text className="text-[10px] ml-1.5 font-bold tracking-wider" style={{ color: 'white' }}>
                            {formatCount((item.reactionCounts as any)?.['W'] || 0)}
                        </Text>
                    </TouchableOpacity>

                    {/* L Button */}
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onReact(item.id, 'L');
                            ExploreService.logRecommendationFeedback(item.id, 'POST', 'DISLIKE', item.slashes?.map((s: any) => s.tag));
                        }}
                        className="flex-row items-center px-2 py-1 rounded-full"
                    >
                        {item.userReaction === 'L' ? (
                            <PoopIcon color="#f97316" />
                        ) : (
                            <Text className="text-[10px] font-bold tracking-wider" style={{ color: 'white' }}>L</Text>
                        )}
                        <Text className="text-[10px] ml-1.5 font-bold tracking-wider" style={{ color: 'white' }}>
                            {formatCount((item.reactionCounts as any)?.['L'] || 0)}
                        </Text>
                    </TouchableOpacity>

                    {/* CAP Button */}
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onReact(item.id, 'CAP');
                            ExploreService.logRecommendationFeedback(item.id, 'POST', 'CAPPED', item.slashes?.map((s: any) => s.tag));
                        }}
                        className="flex-row items-center px-2 py-1 rounded-full"
                    >
                        {item.userReaction === 'CAP' ? (
                            <MagicCapIcon color="#14532d" />
                        ) : (
                            <Text className="text-[10px] font-bold tracking-wider" style={{ color: 'white' }}>CAP</Text>
                        )}
                        <Text className="text-[10px] ml-1.5 font-bold tracking-wider" style={{ color: 'white' }}>
                            {formatCount((item.reactionCounts as any)?.['CAP'] || 0)}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Right: Interactions - GROUPED */}
                <View className="flex-row items-center gap-3 bg-white/5 rounded-full px-4 py-1.5 border border-white/20">
                    {/* Tagged Users Icon */}
                    {item.taggedUsers && item.taggedUsers.length > 0 && (
                        <TouchableOpacity onPress={() => setTaggedUsersModalVisible(true)} className="opacity-80">
                            <Users size={16} color={colors.text} />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity onPress={() => onAddBubble(item.id)} className="opacity-80">
                        <Plus size={18} color={colors.text} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setSlashesModalVisible(true)} className="flex-row items-center gap-1 opacity-80">
                        <Slash size={16} color={colors.text} strokeWidth={2.5} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => onCommentPress(item.id)} className="flex-row items-center gap-1 opacity-80">
                        <MessageCircle size={18} color={colors.text} />
                        {item.commentCount > 0 && <Text className="text-[10px] font-bold tracking-wider" style={{ color: colors.text }}>{formatCount(item.commentCount)}</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => onSharePress(item)} className="opacity-80">
                        <Send size={18} color={colors.text} style={{ transform: [{ rotate: '-45deg' }, { translateX: 2 }] }} />
                    </TouchableOpacity>

                </View>
            </View>

            {/* FLOATING REACTION BUBBLES ON THE RIGHT */}
            {item.bubbles && item.bubbles.length > 0 && (
                <View style={{ position: 'absolute', right: 0, bottom: 120, zIndex: 50 }} pointerEvents="box-none">
                    <FloatingReactionBubbles bubbles={item.bubbles} />
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
                        <View style={{ flex: 1, width: '100%', height: '100%' }}>
                            <FeedVideoPlayer
                                url={item.postMedia[0].url}
                                isActive={isFullscreen}
                                contentFit="contain"
                                nativeControls={true}
                            />
                        </View>
                        <TouchableOpacity
                            onPress={() => setIsFullscreen(false)}
                            style={{ position: 'absolute', top: 40, right: 20, padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </Modal>
            )}

            <ReactionBubblesModal
                visible={bubblesModalVisible}
                postId={item.id}
                onClose={() => setBubblesModalVisible(false)}
            />

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
