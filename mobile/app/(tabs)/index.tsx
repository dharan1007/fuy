import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Image, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Bell, LayoutDashboard, MoreHorizontal, Plus, Check, MessageCircle, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import Svg, { Mask, Rect, Path, G, Defs, Image as SvgImage } from 'react-native-svg';

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
    reactionCounts?: { W: number; L: number; CAP: number; FIRE: number };
    topBubbles?: any[];
    commentCount: number;
    likeCount: number;
    shareCount: number;
    userReaction?: string | null;
}

const XrayScratch = ({ coverUrl, contentUrl, coverType, contentType, isActive, onToggleScroll }: {
    coverUrl: string,
    contentUrl: string,
    coverType: string,
    contentType: string,
    isActive: boolean,
    onToggleScroll: (enabled: boolean) => void
}) => {
    const [revealed, setRevealed] = useState(false);
    const [dims, setDims] = useState({ w: 0, h: 0 });
    const [paths, setPaths] = useState<string[]>([]);
    const currentPath = useRef<string>("");

    const handleTouch = (evt: any) => {
        if (revealed || dims.w === 0) return;
        const { locationX, locationY } = evt.nativeEvent;
        // Ensure precision
        const point = `${locationX.toFixed(1)},${locationY.toFixed(1)}`;

        if (currentPath.current === "") {
            currentPath.current = `M ${point}`;
        } else {
            currentPath.current += ` L ${point}`;
        }

        setPaths(prev => {
            const next = [...prev];
            if (next.length > 0) {
                next[next.length - 1] = currentPath.current;
                return next;
            }
            return [currentPath.current];
        });

        // Simple reveal logic: if we have enough points, reveal more
        // In a real app we'd calculate area, but here we can just check path length or point count
        if (paths.length > 10 || currentPath.current.length > 500) {
            // Check revealed status every few moves
        }
    };

    const handleTouchStart = (evt: any) => {
        if (revealed || dims.w === 0) return;
        onToggleScroll(false); // Disable scroll
        const { locationX, locationY } = evt.nativeEvent;
        currentPath.current = `M ${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        setPaths(prev => [...prev, currentPath.current]);
    };

    const handleTouchEnd = () => {
        onToggleScroll(true); // Re-enable scroll
        currentPath.current = "";
        // Check if we should reveal everything
        if (paths.length > 5) {
            // For now, let's just keep scratching. User can click "Reveal All" or we can auto-reveal after enough scratch.
        }
    };

    const renderMedia = (url: string, type: string, play: boolean, isCover: boolean, resizeMode: ResizeMode = ResizeMode.COVER) => {
        if (type === 'VIDEO') {
            return (
                <Video
                    source={{ uri: url }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode={resizeMode}
                    shouldPlay={play}
                    isLooping
                    isMuted={isCover} // Mute cover videos
                    useNativeControls={false}
                />
            );
        }
        // Force key to ensure reload on url change if needed
        return (
            <Image
                key={url}
                source={{ uri: url }}
                className="w-full h-full"
                resizeMode="cover"
            />
        );
    };

    return (
        <View
            className="w-full h-full relative bg-black"
            onLayout={(e) => setDims({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        >
            {/* Bottom Layer (Hidden Content) - ZIndex 1 */}
            <View className="absolute inset-0 z-10">
                {renderMedia(contentUrl, contentType, isActive, false)}
            </View>

            {/* Top Layer (Scratch Cover) - ZIndex 20 */}
            {!revealed && (
                <View className="absolute inset-0 z-20">
                    {/*
                      Note: To mask the Image properly, we render it INSIDE the Svg.
                      If it's a video, we fallback to a View overlay mask.
                    */}
                    <Svg style={{ width: '100%', height: '100%', position: 'absolute' }}>
                        <Defs>
                            <Mask id="scratchMask">
                                {/* White = Opaque (Show Cover), Black = Transparent (Hide Cover/Reveal Bottom) */}
                                <Rect width="100%" height="100%" fill="white" />
                                {paths.map((p, i) => (
                                    <Path
                                        key={i}
                                        d={p}
                                        stroke="black"
                                        strokeWidth={50}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        fill="none"
                                    />
                                ))}
                            </Mask>
                        </Defs>

                        {coverType === 'IMAGE' ? (
                            <SvgImage
                                href={{ uri: coverUrl }}
                                width="100%"
                                height="100%"
                                preserveAspectRatio="xMidYMid slice"
                                mask="url(#scratchMask)"
                            />
                        ) : (
                            // For Video cover, we can't easily mask it in SVG.
                            // We construct a "Mask Layer" that is black and we cut holes in it?
                            // No, if cover is video, we want to SEE the cover video and erase it.
                            // Only way is to put a view ON TOP that paints the BOTTOM layer? No.
                            // Realistically, masking video in RN is hard.
                            // Fallback: Just render the video, coverage with semi-transparent sheet?
                            // User asked for scratch card feel. Assuming Image for now based on context.
                            <Rect width="100%" height="100%" fill="black" mask="url(#scratchMask)" />
                        )}
                    </Svg>
                </View>
            )}

            {/* Gesture Handlers Layer - ZIndex 100 (Topmost) */}
            {!revealed && (
                <View
                    className="absolute inset-0 z-[100]"
                    onStartShouldSetResponder={() => true}
                    onMoveShouldSetResponder={() => true}
                    onResponderGrant={handleTouchStart}
                    onResponderMove={handleTouch}
                    onResponderRelease={handleTouchEnd}
                    onResponderTerminate={handleTouchEnd}
                />
            )}

            {/* Buttons - ZIndex 110 (Above Gestures) */}
            {!revealed && (
                <View className="absolute inset-0 z-[110] flex-row justify-center items-end pb-4 gap-2" pointerEvents="box-none">
                    <View className="bg-black/60 px-3 py-1 rounded-full border border-white/20">
                        <Text className="text-white font-bold text-[7px] uppercase tracking-[2px]">Scratch</Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => setRevealed(true)}
                        className="bg-white/10 px-3 py-1 rounded-full border border-white/20 overflow-hidden"
                    >
                        <BlurView intensity={20} className="absolute inset-0" tint="dark" />
                        <Text className="text-white font-bold text-[7px] uppercase tracking-[2px]">Reveal</Text>
                    </TouchableOpacity>
                </View>
            )
            }
        </View >
    );
};

const FeedPostItem = React.memo(({
    item,
    isActive,
    colors,
    mode,
    onReact,
    onAddBubble,
    onToggleScroll
}: {
    item: FeedPost,
    isActive: boolean,
    colors: any,
    mode: any,
    onReact: (id: string, type: string) => void,
    onAddBubble: (id: string) => void,
    onToggleScroll: (enabled: boolean) => void
}) => {
    const hasMedia = item.postMedia && item.postMedia.length > 0;

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
    let aspectRatio = 1 / 1.1;
    if (item.postType === 'LILL' || item.postType === 'FILL') aspectRatio = 9 / 16;
    if (!hasMedia) aspectRatio = undefined as any;

    return (
        <View className="mb-10 mx-4">
            {/* Main Media Card */}
            {hasMedia && (
                <View className="rounded-[40px] overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl relative">
                    <View className="w-full bg-black relative" style={{ aspectRatio }}>
                        {(() => {
                            if (item.postType === 'XRAY' && item.postMedia.length >= 2) {
                                // STRICT ORDERING requested:
                                // Layer 1 (Index 0) = Cover (Top)
                                // Layer 2 (Index 1) = Content (Bottom)
                                const coverMedia = item.postMedia[0];
                                const contentMedia = item.postMedia[1];

                                return (
                                    <XrayScratch
                                        coverUrl={coverMedia.url}
                                        coverType={coverMedia.type}
                                        contentUrl={contentMedia.url}
                                        contentType={contentMedia.type}
                                        isActive={isActive}
                                        onToggleScroll={onToggleScroll}
                                    />
                                );
                            }

                            const media = item.postMedia[0];
                            if (media.type === 'VIDEO') {
                                return (
                                    <Video
                                        source={{ uri: media.url }}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode={ResizeMode.COVER}
                                        shouldPlay={isActive}
                                        isLooping
                                        isMuted={false}
                                        useNativeControls={false}
                                    />
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
                        <View className="absolute top-4 left-4 right-4 flex-row justify-between items-start">
                            <BlurView intensity={80} tint="dark" className="rounded-full overflow-hidden flex-row items-center p-1 border border-white/20">
                                <Image
                                    source={{ uri: avatar || `https://api.dicebear.com/7.x/avataaars/png?seed=${rawName}` }}
                                    className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-white/20"
                                />
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
                                        {handle}{location ? ` • ${location}` : ''}
                                    </Text>
                                </View>
                            </BlurView>

                            <View className="flex-row items-center gap-2">
                                {item.postType && (
                                    <BlurView intensity={80} tint="dark" className="px-3 py-1.5 rounded-full border border-white/20 overflow-hidden">
                                        <Text className="text-[10px] text-white font-bold tracking-widest uppercase">{item.postType}</Text>
                                    </BlurView>
                                )}
                                <TouchableOpacity className="w-10 h-10 rounded-full border border-white/20 overflow-hidden items-center justify-center">
                                    <BlurView intensity={80} tint="dark" className="absolute inset-0" />
                                    <MoreHorizontal color="white" size={20} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            )}

            {/* Content & User Info if no media */}
            {!hasMedia && (
                <View className="p-4 rounded-[40px] border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <View className="flex-row items-center mb-3">
                        <Image
                            source={{ uri: avatar || `https://api.dicebear.com/7.x/avataaars/png?seed=${rawName}` }}
                            className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-white/10"
                        />
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
                    <View className="flex-row -space-x-3 mr-3">
                        {(item.topBubbles || []).map((bubble, i) => (
                            <View key={i} className="w-8 h-8 rounded-full border-2 border-zinc-900 overflow-hidden bg-zinc-800">
                                <Image source={{ uri: bubble.mediaUrl }} className="w-full h-full" />
                            </View>
                        ))}
                    </View>
                    <TouchableOpacity
                        onPress={() => onAddBubble(item.id)}
                        className="w-8 h-8 rounded-full items-center justify-center border border-dashed"
                        style={{ backgroundColor: colors.card, borderColor: colors.border }}
                    >
                        <Plus size={14} color={colors.text} />
                    </TouchableOpacity>
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
                        <Text className={`text-xs font-black ${item.userReaction === 'W' ? 'text-red-500' : 'text-red-500/60'}`}>
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
                        <Text className={`text-xs font-black ${item.userReaction === 'L' ? (mode === 'light' ? 'text-black' : 'text-white') : (mode === 'light' ? 'text-black/40' : 'text-white/40')}`}>
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
                        <Text className={`text-xs font-black ${item.userReaction === 'CAP' ? 'text-blue-500' : 'text-blue-500/60'}`}>
                            CAP <Text className="font-bold ml-1" style={{ color: colors.secondary }}>{(item.reactionCounts as any)?.['CAP'] || 0}</Text>
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => Alert.alert("Comments", "Comment feature coming soon!")}
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
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [scrollEnabled, setScrollEnabled] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setCurrentUserId(user.id);
        };
        checkUser();
    }, []);

    const fetchFeed = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('Post')
                .select(`
                    id,
                    content,
                    postType,
                    createdAt,
                    userId,
                    viewCount,
                    shareCount,
                    user:User (
                        id,
                        name,
                        profile:Profile (avatarUrl, displayName, location)
                    ),
                    postMedia:PostMedia (
                        media:Media (url, type, variant)
                    ),
                    reactions:Reaction (type, userId),
                    reactionBubbles:ReactionBubble (
                        id,
                        mediaUrl,
                        mediaType,
                        user:User (profile:Profile (avatarUrl))
                    ),
                    slashes:Slash (tag),
                    comments:PostComment (id),
                    likes:PostLike (id)
                `)
                .eq('visibility', 'PUBLIC')
                .order('createdAt', { ascending: false })
                .limit(20);

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
                    FIRE: reactions.filter((r: any) => r.type === 'FIRE').length,
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

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 80 // Higher threshold for more selective activation
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
            await fetch("https://fuymedia.org/api/posts/react", {
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
            mediaTypes: ['images', 'videos'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled && result.assets[0].uri) {
            setLoading(true);
            try {
                const base64Data = await FileSystem.readAsStringAsync(result.assets[0].uri, {
                    encoding: 'base64',
                });
                const mimeType = result.assets[0].type === 'video' ? 'video/mp4' : 'image/jpeg';
                const uploadUrl = `data:${mimeType};base64,${base64Data}`;

                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch("https://fuymedia.org/api/posts/bubble", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify({
                        postId,
                        mediaUrl: uploadUrl,
                        mediaType: result.assets[0].type === 'video' ? 'VIDEO' : 'IMAGE'
                    }),
                });

                if (res.ok) {
                    fetchFeed();
                } else {
                    const error = await res.json();
                    Alert.alert("Upload Failed", error.error || "Failed to upload reaction");
                }
            } catch (error) {
                console.error("Bubble upload failed:", error);
            } finally {
                setLoading(false);
            }
        }
    }, [fetchFeed]);

    const renderHeader = () => (
        <View className="px-6 pt-4 pb-2 flex-row justify-between items-center">
            <Text className="text-3xl font-bold" style={{ color: colors.text }}>Fuy</Text>
            <View className="flex-row gap-4">
                <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} className="p-2 rounded-full" style={{ backgroundColor: colors.card }}>
                    <User color={colors.text} size={24} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/dashboard')} className="p-2 rounded-full" style={{ backgroundColor: colors.card }}>
                    <LayoutDashboard color={colors.text} size={24} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/notifications')} className="p-2 rounded-full" style={{ backgroundColor: colors.card }}>
                    <Bell color={colors.text} size={24} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderItem = useCallback(({ item }: { item: FeedPost }) => (
        <FeedPostItem
            item={item}
            isActive={activePostId === item.id}
            colors={colors}
            mode={mode}
            onReact={handleReact}
            onAddBubble={handleAddBubble}
            onToggleScroll={setScrollEnabled}
        />
    ), [activePostId, colors, mode, handleReact, handleAddBubble, setScrollEnabled]);

    return (
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
            <LinearGradient colors={mode === 'light' ? ['#ffffff', '#f8f8f8'] : ['#000000', '#0a0a0a']} className="absolute inset-0" />
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
                        viewabilityConfig={viewabilityConfig}
                        initialNumToRender={2}
                        maxToRenderPerBatch={2}
                        windowSize={3}
                        removeClippedSubviews={true}
                        ListEmptyComponent={<View className="flex-1 items-center justify-center py-20"><Text style={{ color: colors.secondary }}>No posts yet. Be the first!</Text></View>}
                    />
                )}
            </SafeAreaView>
        </View>
    );
}
