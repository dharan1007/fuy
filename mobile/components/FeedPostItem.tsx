
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, TouchableWithoutFeedback, Modal } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import { MoreHorizontal, Plus, Check, MessageCircle, Send, Play, Volume2, VolumeX, User, Slash, Maximize2 } from 'lucide-react-native';
import SlashesModal from './SlashesModal';
import XrayScratch from './XrayScratch';
import { MediaUploadService } from '../services/MediaUploadService';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { getApiUrl } from '../lib/api';

const API_URL = getApiUrl();

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
                <View className="rounded-[40px] overflow-hidden bg-zinc-900 border-2 border-white/50 shadow-2xl relative">
                    <View className="w-full bg-black relative" style={{ aspectRatio }}>
                        {(() => {
                            if (item.postType === 'XRAY' && item.postMedia.length >= 2) {
                                // Intelligent Media Assignment - SWAPPED per user request
                                let cover = item.postMedia.find((m: any) => m.variant === 'xray-bottom'); // Was xray-top
                                let content = item.postMedia.find((m: any) => m.variant === 'xray-top'); // Was xray-bottom

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
                                            onToggleScroll={onToggleScroll || (() => { })}
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
                                            {/* Fullscreen Button for FILL posts */}
                                            {item.postType === 'FILL' && (
                                                <TouchableOpacity
                                                    onPress={() => setIsFullscreen(true)}
                                                    style={{ position: 'absolute', bottom: 16, right: 60, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <Maximize2 size={18} color="#fff" />
                                                </TouchableOpacity>
                                            )}
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
                            <BlurView intensity={80} tint="dark" className="rounded-full overflow-hidden flex-row items-center p-1 border border-white/50">
                                {avatar ? (
                                    <Image
                                        source={{ uri: avatar }}
                                        className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-white/50"
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
                                    <BlurView intensity={80} tint="dark" className="px-3 py-1.5 rounded-full border border-white/50 overflow-hidden">
                                        <Text className="text-[10px] text-white font-bold tracking-widest uppercase">{item.postType}</Text>
                                    </BlurView>
                                )}
                                <TouchableOpacity
                                    onPress={() => onMenuPress(item)}
                                    className="w-10 h-10 rounded-full border border-white/50 overflow-hidden items-center justify-center"
                                >
                                    <BlurView intensity={80} tint="dark" className="absolute inset-0" />
                                    <MoreHorizontal color="white" size={20} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Floating Reaction Bubbles (Bottom Right) - Shifted left to avoid Volume/Fullscreen */}
                        <View className="absolute bottom-4 right-28 flex-row items-end z-[2000]">
                            <View className="flex-row -space-x-3 mr-2">
                                {(item.topBubbles || []).map((bubble: any, i: number) => (
                                    <View key={i} className="w-10 h-10 rounded-full border-2 border-white/50 overflow-hidden bg-black/50 items-center justify-center">
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
                                className="w-10 h-10 rounded-full border-2 border-dashed border-white items-center justify-center bg-black/30 backdrop-blur-md"
                            >
                                <Plus size={18} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {/* Content & User Info if no media */}
            {!hasMedia && (
                <View className="p-4 rounded-[40px] border-2" style={{ backgroundColor: colors.card, borderColor: 'rgba(255,255,255,0.5)' }}>
                    <View className="flex-row items-center mb-3">
                        {avatar ? (
                            <Image
                                source={{ uri: avatar }}
                                className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-white/50"
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
                        {item.slashes.map((s: any, i: number) => (
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
                        className="px-4 py-2 rounded-full border-2"
                        style={{
                            backgroundColor: item.userReaction === 'W' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                            borderColor: item.userReaction === 'W' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255,255,255,0.5)'
                        }}
                    >
                        <Text className={`text - xs font - black ${item.userReaction === 'W' ? 'text-red-500' : 'text-red-500/60'} `}>
                            W <Text className="font-bold ml-1" style={{ color: colors.secondary }}>{(item.reactionCounts as any)?.['W'] || 0}</Text>
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => onReact(item.id, 'L')}
                        className="px-4 py-2 rounded-full border-2"
                        style={{
                            backgroundColor: item.userReaction === 'L' ? (mode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)') : 'transparent',
                            borderColor: item.userReaction === 'L' ? (mode === 'light' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)') : 'rgba(255,255,255,0.5)'
                        }}
                    >
                        <Text className={`text - xs font - black ${item.userReaction === 'L' ? (mode === 'light' ? 'text-black' : 'text-white') : (mode === 'light' ? 'text-black/40' : 'text-white/40')} `}>
                            L <Text className="font-bold ml-1" style={{ color: colors.secondary }}>{(item.reactionCounts as any)?.['L'] || 0}</Text>
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => onReact(item.id, 'CAP')}
                        className="px-4 py-2 rounded-full border-2"
                        style={{
                            backgroundColor: item.userReaction === 'CAP' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                            borderColor: item.userReaction === 'CAP' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255,255,255,0.5)'
                        }}
                    >
                        <Text className={`text - xs font - black ${item.userReaction === 'CAP' ? 'text-blue-500' : 'text-blue-500/60'} `}>
                            CAP <Text className="font-bold ml-1" style={{ color: colors.secondary }}>{(item.reactionCounts as any)?.['CAP'] || 0}</Text>
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => onCommentPress(item.id)}
                        className="px-4 py-2 rounded-full border-2 flex-row items-center"
                        style={{ borderColor: 'rgba(255,255,255,0.5)' }}
                    >
                        <MessageCircle size={14} color={colors.secondary} />
                        <Text className="font-bold ml-1.5 text-xs" style={{ color: colors.secondary }}>{formatCount(item.commentCount)}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => onSharePress(item)}
                        className="px-4 py-2 rounded-full border-2 flex-row items-center"
                        style={{ borderColor: 'rgba(255,255,255,0.5)' }}
                    >
                        <Send size={14} color={colors.secondary} style={{ transform: [{ rotate: '-45deg' }, { translateX: 2 }] }} />
                        {/* Added text for consistency if needed, but icon only is cleaner for share. 
                                Actually, existing buttons have text/counts. Share count is available. */}
                        <Text className="font-bold ml-1.5 text-xs" style={{ color: colors.secondary }}>{formatCount(item.shareCount)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setSlashesModalVisible(true)}
                        className="px-4 py-2 rounded-full border-2 flex-row items-center"
                        style={{ borderColor: 'rgba(255,255,255,0.5)' }}
                    >
                        <Slash size={14} color={colors.secondary} />
                    </TouchableOpacity>

                </View>
            </View>

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
        </View>
    );
});

export default FeedPostItem;
