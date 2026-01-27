import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity, Image, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ResizeMode, Video as ExpoVideo } from 'expo-av';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Grid, ChevronLeft, MapPin, Heart, MessageCircle, Share2, MoreHorizontal, Play, X } from 'lucide-react-native';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import { useToast } from '../../context/ToastContext';
import ShareCardModal from '../../components/ShareCardModal';
import * as Crypto from 'expo-crypto';

const { width } = Dimensions.get('window');

interface Post {
    id: string;
    media: { url: string; type: string }[] | null;
    content?: string;
    postType?: string;
    createdAt?: string;
    likes?: number;
}

interface ProfileData {
    name: string;
    isHumanVerified?: boolean;
    profileCode?: string;
    profile: {
        displayName: string;
        avatarUrl: string;
        bio: string;
        coverVideoUrl: string;
        coverImageUrl: string;
        location: string;
        tags: string;
        stalkMe: string;
    };
    followersCount: number;
    followingCount: number;
    stats: {
        posts: number;
        friends: number;
    };
    posts: Post[];
}

export default function PublicProfileScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { session } = useAuth();
    const { colors, mode } = useTheme();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [postFilter, setPostFilter] = useState<'ALL' | 'FILLS' | 'LILLS' | 'SIMPLE' | 'AUDIO' | 'CHANNELS' | 'XRAYS'>('ALL'); // Added Filter State

    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [showStalkMeModal, setShowStalkMeModal] = useState(false);
    const [stalkMeImages, setStalkMeImages] = useState<string[]>([]);

    // Viewing User ID
    const userId = Array.isArray(id) ? id[0] : id;
    const isOwner = session?.user?.id === userId;

    useEffect(() => {
        if (userId) {
            fetchProfile();
            checkFollowStatus();
        }
    }, [userId]);

    const checkFollowStatus = async () => {
        if (!session?.user || !userId) return;
        try {
            const { data } = await supabase
                .from('Subscription')
                .select('*')
                .eq('subscriberId', session.user.id)
                .eq('subscribedToId', userId)
                .single();
            setIsFollowing(!!data);
        } catch (e) {
            setIsFollowing(false);
        }
    };

    const handleFollow = async () => {
        if (!session?.user || !session?.access_token) {
            showToast("Please login to follow", "info");
            return;
        }
        setFollowLoading(true);
        const apiUrl = isFollowing
            ? `http://192.168.0.101:3000/api/users/unfollow`
            : `http://192.168.0.101:3000/api/users/follow`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ targetUserId: userId }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'Network request failed');
            }

            const data = await response.json();

            if (data.success) {
                if (isFollowing) {
                    setIsFollowing(false);
                    setProfileData(prev => prev ? ({ ...prev, followersCount: Math.max(0, prev.followersCount - 1) }) : null);
                    showToast("Unfollowed", "success");
                } else {
                    setIsFollowing(true);
                    setProfileData(prev => prev ? ({ ...prev, followersCount: prev.followersCount + 1 }) : null);
                    showToast("Following", "success");
                }
            } else {
                throw new Error(data.message || 'Action failed');
            }
        } catch (e: any) {
            console.error("Follow error:", e);
            const msg = e.name === 'AbortError' ? 'Request timed out' : 'Failed to update follow status';
            showToast(msg, "error");
        } finally {
            setFollowLoading(false);
        }
    };

    const handleMessage = () => {
        // Navigate to chat with this user
        // Assuming we pass user data or just ID. For now just push to chat root or specific room
        // Ideally we check for existing room or create one
        showToast("Messaging coming soon!", "info");
        // router.push(`/chat/${userId}`); 
    };

    const fetchProfile = async () => {
        try {
            // 1. Fetch User & Profile
            const { data: userData, error: userError } = await supabase
                .from('User')
                .select(`id, name, isHumanVerified, profileCode, profile:Profile(displayName, avatarUrl, bio, coverImageUrl, coverVideoUrl, location, tags, stalkMe)`)
                .eq('id', userId)
                .single();

            if (userError) throw userError;

            // 2. Counts
            const { count: followersCount } = await supabase.from('Subscription').select('*', { count: 'exact', head: true }).eq('subscribedToId', userId);
            const { count: followingCount } = await supabase.from('Subscription').select('*', { count: 'exact', head: true }).eq('subscriberId', userId);

            // 3. Fetch Posts
            const { data: postsData, error: postsError } = await supabase
                .from('Post')
                .select(`
                    id,
                    content,
                    postType,
                    createdAt,
                    postMedia:PostMedia(media:Media(url, type)),
                    chanData:Chan(coverImageUrl),
                    user:User(name, profile:Profile(displayName, avatarUrl))
                `)
                .eq('userId', userId)
                .order('createdAt', { ascending: false });

            const allPosts = (postsData || []).map((p: any) => {
                const mediaItems = (p.postMedia || []).map((pm: any) => pm.media).filter(Boolean);
                return {
                    id: p.id,
                    content: p.content,
                    postType: p.postType,
                    media: mediaItems,
                    chanData: p.chanData,
                    likes: 0
                };
            });

            const profileObj = Array.isArray(userData?.profile) ? userData.profile[0] : userData?.profile;

            setProfileData({
                name: userData?.name || 'User',
                isHumanVerified: userData?.isHumanVerified,
                profileCode: userData?.profileCode,
                profile: {
                    displayName: profileObj?.displayName || userData?.name || 'User',
                    avatarUrl: profileObj?.avatarUrl || '',
                    bio: profileObj?.bio || '',
                    coverVideoUrl: profileObj?.coverVideoUrl || '',
                    coverImageUrl: profileObj?.coverImageUrl || '',
                    location: profileObj?.location || '',
                    tags: profileObj?.tags || '',
                    stalkMe: profileObj?.stalkMe || '[]',
                },
                followersCount: followersCount || 0,
                followingCount: followingCount || 0,
                stats: { posts: allPosts.length, friends: 0 },
                posts: allPosts
            });

        } catch (e) {
            console.error('Fetch profile error:', e);
            showToast("Failed to load profile", "error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    const openStalkMe = () => {
        try {
            const images = JSON.parse(profileData?.profile?.stalkMe || '[]');
            setStalkMeImages(Array.isArray(images) ? images : []);
            setShowStalkMeModal(true);
        } catch (e) {
            setStalkMeImages([]);
        }
    };

    const renderHeader = () => {
        const { profile } = profileData || {} as any;
        return (
            <View className="relative h-72">
                {/* Cover Video or Image */}
                {profile?.coverVideoUrl ? (
                    <ExpoVideo
                        source={{ uri: profile.coverVideoUrl }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay
                        isLooping
                        isMuted
                    />
                ) : (
                    <Image
                        source={{ uri: profile?.coverImageUrl || 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1000&auto=format&fit=crop&q=60' }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                    />
                )}
                <LinearGradient
                    colors={['transparent', colors.background]}
                    className="absolute inset-0"
                    locations={[0.2, 1]}
                />

                {/* Top Bar */}
                <SafeAreaView className="absolute top-0 w-full flex-row justify-between px-4 z-10">
                    <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} className="w-10 h-10 rounded-full items-center justify-center">
                        <ChevronLeft color="#fff" size={24} />
                    </TouchableOpacity>

                    <View className="flex-row gap-3">
                        <TouchableOpacity style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} className="w-10 h-10 rounded-full items-center justify-center">
                            <MoreHorizontal color="#fff" size={20} />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>

                {/* Profile Avatar & Quick Actions */}
                <View className="absolute -bottom-14 left-6 flex-row items-end">
                    <View className="relative">
                        {/* Liquid Glass Avatar Border - NO BORDER AS REQUESTED */}
                        <BlurView intensity={20} tint={mode === 'light' ? 'light' : 'dark'} className="p-1 rounded-[36px] overflow-hidden">
                            <Image
                                source={{ uri: profile?.avatarUrl }}
                                className="w-28 h-28 rounded-[32px]"
                                style={{ backgroundColor: colors.secondary }}
                            />
                        </BlurView>
                    </View>
                </View>
            </View>
        );
    };

    const renderStats = () => {
        const { profile, stats } = profileData || {} as any;

        return (
            <View className="mt-16 px-6">
                <View className="flex-row justify-between items-start mb-4">
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={{ color: colors.text }} className="text-2xl font-bold mb-1">{profile?.displayName || 'User'}</Text>
                            <VerifiedBadge isHumanVerified={(profileData as any)?.isHumanVerified} size={18} />
                        </View>
                        {profileData?.profileCode && (
                            <Text style={{ color: colors.primary, fontWeight: '600', marginBottom: 4 }}>#{profileData.profileCode}</Text>
                        )}
                        {profile?.location && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                <MapPin size={12} color={colors.secondary} />
                                <Text style={{ color: colors.secondary, marginLeft: 4, fontSize: 12 }}>{profile.location}</Text>
                            </View>
                        )}
                        {profile?.bio && (
                            <Text style={{ color: colors.secondary }} className="text-sm leading-5 max-w-[280px]">{profile.bio}</Text>
                        )}
                        {profile?.tags && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 }}>
                                {profile.tags.split(',').map((tag: string, i: number) => (
                                    <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                                        <Text style={{ color: colors.secondary, fontSize: 11 }}>{tag.trim()}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </View>

                {/* Glass Stats Card - No Border, Thin Dividers */}
                <BlurView intensity={30} tint={mode === 'light' ? 'light' : 'dark'} className="flex-row justify-between w-full px-6 py-4 mb-8 rounded-3xl overflow-hidden">
                    <View className="items-center flex-1">
                        <Text style={{ color: colors.text }} className="text-lg font-bold">{profileData?.followingCount || 0}</Text>
                        <Text style={{ color: colors.secondary }} className="text-xs uppercase tracking-wider">Following</Text>
                    </View>
                    <View className="w-[1px] h-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                    <View className="items-center flex-1">
                        <Text style={{ color: colors.text }} className="text-lg font-bold">{profileData?.followersCount || 0}</Text>
                        <Text style={{ color: colors.secondary }} className="text-xs uppercase tracking-wider">Followers</Text>
                    </View>
                    <View className="w-[1px] h-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                    <View className="items-center flex-1">
                        <Text style={{ color: colors.text }} className="text-lg font-bold">{stats?.posts || 0}</Text>
                        <Text style={{ color: colors.secondary }} className="text-xs uppercase tracking-wider">Posts</Text>
                    </View>
                </BlurView>

                {/* Public Actions (Follow / Message) */}
                <View className="flex-row gap-2 mb-6">
                    <TouchableOpacity
                        onPress={handleFollow}
                        disabled={followLoading}
                        className="flex-1 py-3 rounded-2xl items-center justify-center"
                        style={{ backgroundColor: isFollowing ? colors.card : colors.primary, borderWidth: isFollowing ? 1 : 0, borderColor: isFollowing ? colors.border : 'transparent' }}
                    >
                        <Text className="font-bold" style={{ color: isFollowing ? colors.text : 'white' }}>
                            {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.push(`/profile-card/view?userId=${userId}`)}
                        className="flex-1 py-3 rounded-2xl items-center justify-center"
                        style={{ backgroundColor: colors.background }}
                    >
                        <Text className="font-bold" style={{ color: colors.text }}>Card</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleMessage}
                        className="flex-1 py-3 rounded-2xl items-center justify-center"
                        style={{ backgroundColor: colors.background }}
                    >
                        <Text className="font-bold" style={{ color: colors.text }}>Message</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={openStalkMe}
                        className="w-12 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: colors.background }}
                    >
                        <Grid color={colors.text} size={20} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderContent = () => {
        // Filter posts based on type filter
        const displayPosts = (profileData?.posts || []).filter(p => {
            if (postFilter === 'ALL') return true;
            if (postFilter === 'FILLS') return p.postType === 'FILL';
            if (postFilter === 'LILLS') return p.postType === 'LILL';
            if (postFilter === 'SIMPLE') return !p.postType || p.postType === 'TEXT' || p.postType === 'SIMPLE' || p.postType === 'SIMPLE_TEXT';
            if (postFilter === 'AUDIO') return p.postType === 'AUD';
            if (postFilter === 'CHANNELS') return p.postType === 'CHAN';
            if (postFilter === 'XRAYS') return p.postType === 'XRAY';
            return true;
        });

        const filters: Array<'ALL' | 'FILLS' | 'LILLS' | 'SIMPLE' | 'AUDIO' | 'CHANNELS' | 'XRAYS'> = ['ALL', 'FILLS', 'LILLS', 'SIMPLE', 'AUDIO', 'CHANNELS', 'XRAYS'];

        return (
            <View style={{ flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden', minHeight: 500, backgroundColor: colors.card }}>
                {/* Filter Tabs - Horizontal Scroll */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ borderBottomWidth: 1, borderColor: colors.border }}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 16 }}
                >
                    {filters.map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setPostFilter(tab)}
                            style={{
                                paddingBottom: 8,
                                borderBottomWidth: postFilter === tab ? 2 : 0,
                                borderColor: colors.text
                            }}
                        >
                            <Text style={{
                                color: postFilter === tab ? colors.text : colors.secondary,
                                fontWeight: postFilter === tab ? '700' : '400',
                                fontSize: 11,
                                textTransform: 'uppercase',
                                letterSpacing: 1
                            }}>
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    <Text style={{ color: colors.secondary, fontSize: 10, alignSelf: 'center', marginLeft: 8 }}>
                        {displayPosts.length} posts
                    </Text>
                </ScrollView>

                {/* Content Area */}
                {displayPosts.length === 0 ? (
                    <View style={{ paddingVertical: 80, alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                        <Grid color={colors.secondary} size={48} />
                        <Text style={{ color: colors.text, marginTop: 16, fontWeight: '500' }}>No posts yet</Text>
                    </View>
                ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 4 }}>
                        {displayPosts.map((post) => (
                            <PostCard
                                key={post.id}
                                post={post}
                                colors={colors}
                                router={router}
                                width={width}
                            />
                        ))}
                    </View>
                )}
                <View style={{ height: 100 }} />
            </View>
        );
    };

    if (loading && !profileData) {
        return (
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
                <Text style={{ color: colors.secondary }}>Loading user...</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProfile(); }} tintColor={colors.primary} />}
            >
                {renderHeader()}
                {renderStats()}
                {renderContent()}
            </ScrollView>
        </View>
    );
}

// Adaptive Post Card Component (Copied from Profile.tsx)
const PostCard = ({ post, colors, router, width: screenWidth }: { post: any; colors: any; router: any; width: number }) => {

    const margin = 2; // Tighter margin for 3x3
    const cardWidth = Math.floor((screenWidth - (margin * 6) - 10) / 3); // 3 columns

    const isVideo = post.media?.[0]?.type === 'VIDEO' || post.postType === 'FILL' || post.postType === 'LILL';
    const isAudio = post.postType === 'AUD';
    const isChannel = post.postType === 'CHAN';
    // const isXray = post.postType === 'XRAY'; // Not used in specific rendering yet but good to know
    const isText = !post.media?.length && (!post.postType || post.postType === 'SIMPLE' || post.postType === 'SIMPLE_TEXT' || post.postType === 'TEXT');

    const handlePress = () => {
        router.push(`/post/${post.id}`);
    };

    // Get media URL
    let mediaUrl = post.media?.[0]?.url;
    if (isChannel && post.chanData?.[0]?.coverImageUrl) {
        mediaUrl = post.chanData[0].coverImageUrl;
    }

    // Text/Simple Post Card
    if (isText) {
        return (
            <TouchableOpacity
                onPress={handlePress}
                style={{
                    width: cardWidth,
                    height: cardWidth,
                    margin: margin,
                    padding: 8,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: 12,
                    justifyContent: 'space-between'
                }}
            >
                <Text style={{ color: colors.text, fontSize: 10, lineHeight: 14 }} numberOfLines={5}>
                    {post.content}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ color: colors.secondary, fontSize: 8, fontWeight: '700', textTransform: 'uppercase' }}>SIXT</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }

    // Audio Post Card
    if (isAudio) {
        return (
            <TouchableOpacity
                onPress={handlePress}
                style={{
                    width: cardWidth,
                    height: cardWidth,
                    margin: margin,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: 12,
                    overflow: 'hidden'
                }}
            >
                <View style={{
                    flex: 1, // Fill available space
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    borderRadius: 8
                }}>
                    <View style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Heart size={16} color={colors.secondary} />
                    </View>
                </View>
                <View style={{ padding: 12 }}>
                    <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                        {post.content || 'Audio'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                            <Text style={{ color: colors.secondary, fontSize: 9, fontWeight: '700' }}>AUD</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }

    // Standard Media Card (Image/Video/Channel)
    return (
        <TouchableOpacity
            onPress={handlePress}
            style={{
                width: cardWidth,
                height: cardWidth,
                margin: margin,
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: 12,
                overflow: 'hidden'
            }}
        >
            {mediaUrl ? (
                isVideo ? (
                    <View style={{ width: '100%', height: '100%', backgroundColor: '#000' }}>
                        <ExpoVideo
                            source={{ uri: mediaUrl }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={false}
                            isMuted={true}
                        />
                        <View style={{ position: 'absolute', inset: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                            <Play size={24} color="#fff" fill="rgba(255,255,255,0.5)" />
                        </View>
                    </View>
                ) : (
                    <Image
                        source={{ uri: mediaUrl }}
                        style={{ width: '100%', height: '100%', opacity: 0.9 }}
                        resizeMode="cover"
                    />
                )
            ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    {isVideo ? <Play size={24} color={colors.secondary} /> : <Grid color={colors.secondary} size={24} />}
                    <Text style={{ color: colors.secondary, fontSize: 10, marginTop: 4 }}>{isVideo ? 'Video' : 'No Media'}</Text>
                </View>
            )}

            {/* Type Indicator Overlay */}
            <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ color: 'white', fontSize: 8, fontWeight: '700' }}>
                    {isChannel ? 'CHAN' : isVideo ? 'PLAY' : 'POST'}
                </Text>
            </View>
        </TouchableOpacity>
    );
};
