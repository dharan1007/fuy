import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions, FlatList, Modal, RefreshControl, Share, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings, Bell, Grid, List, Plus, Heart, MessageCircle, Share2, MoreHorizontal, Edit3, Camera, Users, ChevronLeft, LogOut, Eye, Play, MapPin, Tag, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ShareCardModal from '../../components/ShareCardModal';
import { Video as ExpoVideo, ResizeMode } from 'expo-av';
import { useToast } from '../../context/ToastContext';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3 - 2;

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

export default function ProfileScreen() {
    const router = useRouter();
    const { session } = useAuth();
    const { colors, mode } = useTheme();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'grid' | 'sixts' | 'media' | 'locker'>('grid');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);

    const [showSocialModal, setShowSocialModal] = useState(false);
    const [socialType, setSocialType] = useState<'followers' | 'following'>('followers');
    const [socialList, setSocialList] = useState<any[]>([]);
    const [socialLoading, setSocialLoading] = useState(false);
    const [showStalkMeModal, setShowStalkMeModal] = useState(false);
    const [stalkMeImages, setStalkMeImages] = useState<string[]>([]);
    const [dbUserId, setDbUserId] = useState<string | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [myCardCode, setMyCardCode] = useState<string | null>(null);
    const [postFilter, setPostFilter] = useState<'ALL' | 'FILLS' | 'LILLS' | 'SIMPLE' | 'AUDIO' | 'CHANNELS'>('ALL');

    useEffect(() => {
        if (session) {
            fetchProfile();
        } else {
            // Ideally redirect or wait
        }
    }, [session]);

    const fetchProfile = async () => {
        if (!session?.user) return;

        try {
            const userId = session.user.id;
            setDbUserId(userId);

            // 1. Fetch User & Profile with all fields
            const { data: userData, error: userError } = await supabase
                .from('User')
                .select(`id, name, profile:Profile(displayName, avatarUrl, bio, coverImageUrl, coverVideoUrl, location, tags, stalkMe)`)
                .eq('id', userId)
                .single();

            if (userError) console.log("User fetch error:", userError.message);

            // 2. Counts - Use Subscription table (where follow API stores data)
            const { count: followersCount } = await supabase.from('Subscription').select('*', { count: 'exact', head: true }).eq('subscribedToId', userId);
            const { count: followingCount } = await supabase.from('Subscription').select('*', { count: 'exact', head: true }).eq('subscriberId', userId);

            // 3. Fetch ALL Posts (using Post table standard)
            // We select enough data to determine type and media
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

            if (postsError) console.error("Posts fetch error:", postsError.message);

            const allPosts = (postsData || []).map((p: any) => {
                // Extract media from PostMedia relationship
                const mediaItems = (p.postMedia || []).map((pm: any) => pm.media).filter(Boolean);
                return {
                    id: p.id,
                    content: p.content,
                    postType: p.postType,
                    media: mediaItems,
                    likes: 0
                };
            });

            // Handle potential array from Supabase relation
            const profileObj = Array.isArray(userData?.profile) ? userData.profile[0] : userData?.profile;

            setProfileData({
                name: userData?.name || 'User',
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

    const fetchSocialList = async (type: 'followers' | 'following') => {
        setSocialType(type);
        setShowSocialModal(true);
        setSocialLoading(true);

        if (!session?.user) return;
        const myId = session.user.id;

        try {
            let data: any[] = [];

            if (type === 'following') {
                // Get users I'm following (subscribedToId = the user I follow)
                const { data: followingData } = await supabase
                    .from('Subscription')
                    .select(`
                        subscribedTo:subscribedToId (
                            id,
                            name,
                            profile:Profile (displayName, avatarUrl)
                        )
                    `)
                    .eq('subscriberId', myId);

                if (followingData) {
                    data = followingData.map((item: any) => item.subscribedTo).filter(Boolean);
                }

            } else {
                // Get users following me (subscriberId = the user following me)
                const { data: followersData } = await supabase
                    .from('Subscription')
                    .select(`
                        subscriber:subscriberId (
                            id,
                            name,
                            profile:Profile (displayName, avatarUrl)
                        )
                    `)
                    .eq('subscribedToId', myId);

                if (followersData) {
                    data = followersData.map((item: any) => item.subscriber).filter(Boolean);
                }
            }
            setSocialList(data.filter(u => u));
        } catch (e) {
            console.error('Fetch social error:', e);
            setSocialList([]);
        } finally {
            setSocialLoading(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchProfile();
    };

    // Share profile card code
    const handleShareProfile = async () => {
        if (!dbUserId) return;

        try {
            // Try to get user's profile card code
            const { data: cardData } = await supabase
                .from('ProfileCard')
                .select('uniqueCode')
                .eq('userId', dbUserId)
                .single();

            if (cardData?.uniqueCode) {
                setMyCardCode(cardData.uniqueCode);
                setShowShareModal(true);
                setShowShareModal(true);
            } else {
                showToast('Create a profile card first to share it!', 'info');
            }
        } catch (error) {
            showToast('Create a profile card first to share it!', 'info');
        }
    };

    if (loading && !profileData) {
        return (
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
                <Text style={{ color: colors.secondary }}>Loading profile...</Text>
            </View>
        );
    }

    const { profile, stats, posts } = profileData || {
        profile: { displayName: 'User', avatarUrl: '', bio: '' },
        stats: { posts: 0, followers: 0, following: 0 },
        posts: []
    } as any;

    const renderHeader = () => (
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
            <SafeAreaView className="absolute top-0 w-full flex-row justify-between px-4 z-10 pl-16">
                {/* Left side empty for ThemeToggle */}
                <View />
                <View className="flex-row gap-3">
                    <TouchableOpacity onPress={handleShareProfile} style={{ backgroundColor: colors.card, borderColor: colors.border }} className="w-10 h-10 rounded-full items-center justify-center border">
                        <Share2 color={colors.text} size={20} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/settings')} style={{ backgroundColor: colors.card, borderColor: colors.border }} className="w-10 h-10 rounded-full items-center justify-center border">
                        <Settings color={colors.text} size={20} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Profile Avatar & Quick Actions */}
            <View className="absolute -bottom-14 left-6 flex-row items-end">
                <View className="relative">
                    {/* Liquid Glass Avatar Border */}
                    <BlurView intensity={20} tint={mode === 'light' ? 'light' : 'dark'} className="p-1 rounded-[36px] overflow-hidden">
                        <Image
                            source={{ uri: profile?.avatarUrl }}
                            className="w-28 h-28 rounded-[32px]"
                            style={{ backgroundColor: colors.secondary }}
                        />
                    </BlurView>

                    <TouchableOpacity style={{ backgroundColor: colors.card, borderColor: colors.border }} className="absolute bottom-0 right-0 rounded-full p-2 border">
                        <Camera color={colors.text} size={16} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderStats = () => (
        <View className="mt-16 px-6">
            <View className="flex-row justify-between items-start mb-4">
                <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text }} className="text-2xl font-bold mb-1">{profile?.displayName || 'User'}</Text>
                    {profile?.location && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <MapPin size={12} color={colors.secondary} />
                            <Text style={{ color: colors.secondary, marginLeft: 4, fontSize: 12 }}>{profile.location}</Text>
                        </View>
                    )}
                    {profile?.bio ? (
                        <Text style={{ color: colors.secondary }} className="text-sm leading-5 max-w-[280px]">{profile.bio}</Text>
                    ) : (
                        <TouchableOpacity className="flex-row items-center gap-2 mt-1" onPress={() => router.push('/edit-profile')}>
                            <Edit3 color={colors.secondary} size={14} />
                            <Text style={{ color: colors.secondary }} className="text-sm italic">Add a bio...</Text>
                        </TouchableOpacity>
                    )}
                    {profile?.tags && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 }}>
                            {profile.tags.split(',').map((tag, i) => (
                                <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                                    <Text style={{ color: colors.secondary, fontSize: 11 }}>{tag.trim()}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </View>

            {/* Glass Stats Card */}
            <BlurView intensity={30} tint={mode === 'light' ? 'light' : 'dark'} className="flex-row justify-between w-full px-6 py-4 mb-8 rounded-3xl overflow-hidden" style={{ borderColor: colors.border, borderWidth: 1 }}>
                <TouchableOpacity onPress={() => fetchSocialList('following')} className="items-center flex-1">
                    <Text style={{ color: colors.text }} className="text-lg font-bold">{profileData?.followingCount || 0}</Text>
                    <Text style={{ color: colors.secondary }} className="text-xs uppercase tracking-wider">Following</Text>
                </TouchableOpacity>
                <View className="w-[1px] h-full" style={{ backgroundColor: colors.border }} />
                <TouchableOpacity onPress={() => fetchSocialList('followers')} className="items-center flex-1">
                    <Text style={{ color: colors.text }} className="text-lg font-bold">{profileData?.followersCount || 0}</Text>
                    <Text style={{ color: colors.secondary }} className="text-xs uppercase tracking-wider">Followers</Text>
                </TouchableOpacity>
                <View className="w-[1px] h-full" style={{ backgroundColor: colors.border }} />
                <View className="items-center flex-1">
                    <Text style={{ color: colors.text }} className="text-lg font-bold">{stats?.posts || 0}</Text>
                    <Text style={{ color: colors.secondary }} className="text-xs uppercase tracking-wider">Posts</Text>
                </View>
            </BlurView>

            {/* Profile Actions */}
            <View className="flex-row gap-2 mb-6">
                <TouchableOpacity
                    onPress={() => router.push('/edit-profile')}
                    className="flex-1 py-3 rounded-2xl items-center justify-center border"
                    style={{ backgroundColor: colors.background, borderColor: colors.border }}
                >
                    <Text className="font-bold" style={{ color: colors.text }}>Edit Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => router.push('/profile-card/editor')}
                    className="flex-1 py-3 rounded-2xl items-center justify-center border"
                    style={{ backgroundColor: colors.background, borderColor: colors.border }}
                >
                    <Text className="font-bold" style={{ color: colors.text }}>Card</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={openStalkMe}
                    className="w-12 items-center justify-center rounded-2xl border"
                    style={{ backgroundColor: colors.background, borderColor: colors.border }}
                >
                    <Grid color={colors.text} size={20} />
                </TouchableOpacity>
            </View>
        </View>
    );


    const renderContent = () => {
        // Filter posts based on type filter
        const displayPosts = (profileData?.posts || []).filter(p => {
            if (postFilter === 'ALL') return true;
            if (postFilter === 'FILLS') return p.postType === 'FILL';
            if (postFilter === 'LILLS') return p.postType === 'LILL';
            if (postFilter === 'SIMPLE') return !p.postType || p.postType === 'TEXT' || p.postType === 'SIMPLE' || p.postType === 'SIMPLE_TEXT';
            if (postFilter === 'AUDIO') return p.postType === 'AUD';
            if (postFilter === 'CHANNELS') return p.postType === 'CHAN';
            return true;
        });

        const filters: Array<'ALL' | 'FILLS' | 'LILLS' | 'SIMPLE' | 'AUDIO' | 'CHANNELS'> = ['ALL', 'FILLS', 'LILLS', 'SIMPLE', 'AUDIO', 'CHANNELS'];

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
                            <PostCard key={post.id} post={post} colors={colors} router={router} width={width} />
                        ))}
                    </View>
                )}
                <View style={{ height: 100 }} />
            </View>
        );
    };

    // Adaptive Post Card Component
    const PostCard = ({ post, colors, router, width: screenWidth }: { post: any; colors: any; router: any; width: number }) => {
        const cardWidth = (screenWidth - 24) / 2; // 2 columns with padding
        const isVideo = post.media?.[0]?.type === 'VIDEO' || post.postType === 'FILL' || post.postType === 'LILL';
        const isAudio = post.postType === 'AUD';
        const isChannel = post.postType === 'CHAN';
        const isText = !post.media?.length && (!post.postType || post.postType === 'SIMPLE' || post.postType === 'SIMPLE_TEXT' || post.postType === 'TEXT');

        // Get media URL
        const mediaUrl = post.media?.[0]?.url;

        // Text/Simple Post Card
        if (isText) {
            return (
                <TouchableOpacity
                    onPress={() => router.push(`/post/${post.id}`)}
                    style={{
                        width: cardWidth,
                        margin: 4,
                        padding: 16,
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.1)',
                        minHeight: 120,
                        justifyContent: 'space-between'
                    }}
                >
                    <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }} numberOfLines={4}>
                        {post.content}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                            <Text style={{ color: colors.secondary, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }}>SIXT</Text>
                        </View>
                        <Text style={{ color: colors.secondary, fontSize: 10 }}>
                            {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </Text>
                    </View>
                </TouchableOpacity>
            );
        }

        // Audio Post Card
        if (isAudio) {
            return (
                <TouchableOpacity
                    onPress={() => router.push(`/post/${post.id}`)}
                    style={{
                        width: cardWidth,
                        margin: 4,
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.1)',
                        overflow: 'hidden'
                    }}
                >
                    <View style={{
                        height: cardWidth * 0.8,
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <View style={{
                            width: 60,
                            height: 60,
                            borderRadius: 30,
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Heart size={24} color={colors.secondary} />
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

        // Channel Post Card
        if (isChannel) {
            return (
                <TouchableOpacity
                    onPress={() => router.push(`/post/${post.id}`)}
                    style={{
                        width: screenWidth - 32,
                        margin: 4,
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.1)',
                        overflow: 'hidden',
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 16
                    }}
                >
                    <View style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {mediaUrl ? (
                            <Image source={{ uri: mediaUrl }} style={{ width: 56, height: 56, borderRadius: 12 }} />
                        ) : (
                            <Settings size={24} color={colors.secondary} />
                        )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
                            {post.content || 'Channel'}
                        </Text>
                        <Text style={{ color: colors.secondary, fontSize: 12, marginTop: 4 }}>
                            Channel
                        </Text>
                    </View>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ color: colors.secondary, fontSize: 9, fontWeight: '700' }}>CHAN</Text>
                    </View>
                </TouchableOpacity>
            );
        }

        // Video/Image Post Card (FILL, LILL, or media posts)
        return (
            <TouchableOpacity
                onPress={() => router.push(`/post/${post.id}`)}
                style={{
                    width: cardWidth,
                    height: post.postType === 'FILL' ? cardWidth * 1.5 : cardWidth,
                    margin: 4,
                    borderRadius: 16,
                    overflow: 'hidden',
                    backgroundColor: 'rgba(255,255,255,0.05)'
                }}
            >
                {mediaUrl ? (
                    <Image
                        source={{ uri: mediaUrl }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                        <Grid size={24} color={colors.secondary} />
                    </View>
                )}

                {/* Post Type Badge */}
                <View style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 8
                }}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }}>
                        {post.postType || 'POST'}
                    </Text>
                </View>

                {/* Video indicator */}
                {isVideo && (
                    <View style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        padding: 6,
                        borderRadius: 20
                    }}>
                        <Play size={12} color="#fff" fill="#fff" />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderSocialModal = () => (
        <Modal
            visible={showSocialModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowSocialModal(false)}
        >
            <View className="flex-1" style={{ backgroundColor: mode === 'light' ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)' }}>
                <SafeAreaView className="flex-1">
                    <View className="flex-row items-center justify-between px-4 py-4 border-b" style={{ borderColor: colors.border }}>
                        <TouchableOpacity onPress={() => setShowSocialModal(false)} className="p-2">
                            <ChevronLeft color={colors.text} size={24} />
                        </TouchableOpacity>
                        <Text style={{ color: colors.text }} className="text-lg font-bold capitalize">{socialType}</Text>
                        <View className="w-10" />
                    </View>

                    {socialLoading ? (
                        <View className="p-10 items-center"><Text style={{ color: colors.secondary }}>Loading...</Text></View>
                    ) : (
                        <FlatList
                            data={socialList}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ padding: 16 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity className="flex-row items-center mb-4 p-3 rounded-2xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                    <Image
                                        source={{ uri: item.profile?.avatarUrl || item.avatar }}
                                        className="w-12 h-12 rounded-full"
                                        style={{ backgroundColor: colors.secondary }}
                                    />
                                    <View className="ml-3 flex-1">
                                        <Text style={{ color: colors.text }} className="font-bold text-base">{item.name}</Text>
                                        <Text style={{ color: colors.secondary }} className="text-xs">{item.profile?.displayName || '@' + item.name.toLowerCase().replace(' ', '')}</Text>
                                    </View>
                                    <TouchableOpacity className="px-4 py-2 rounded-full" style={{ backgroundColor: colors.accent }}>
                                        <Text className="text-xs font-bold" style={{ color: '#fff' }}>View</Text>
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text style={{ color: colors.secondary }} className="text-center mt-10">No users found</Text>
                            }
                        />
                    )}
                </SafeAreaView>
            </View>
        </Modal>
    );

    const renderStalkMeModal = () => (
        <Modal
            visible={showStalkMeModal}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setShowStalkMeModal(false)}
        >
            <View className="flex-1 bg-black/95">
                <SafeAreaView className="flex-1">
                    <View className="flex-row items-center justify-between px-4 py-4">
                        <TouchableOpacity onPress={() => setShowStalkMeModal(false)} className="p-2 bg-white/10 rounded-full">
                            <X color="#fff" size={24} />
                        </TouchableOpacity>
                        <Text className="text-white font-black tracking-widest">STALK ME</Text>
                        <View className="w-10" />
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {stalkMeImages.length === 0 ? (
                            <Text className="text-white/40 text-center w-full mt-20">No images found</Text>
                        ) : (
                            stalkMeImages.map((img, i) => (
                                <View key={i} className="w-[48%] aspect-[9/16] rounded-xl overflow-hidden bg-white/5">
                                    <Image source={{ uri: img }} className="w-full h-full" resizeMode="cover" />
                                </View>
                            ))
                        )}
                    </ScrollView>
                </SafeAreaView>
            </View>
        </Modal>
    );

    return (
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
            <LinearGradient
                colors={[colors.background, colors.card]}
                className="absolute inset-0"
            />
            <ScrollView
                showsVerticalScrollIndicator={false}
                className="flex-1"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
                }
            >
                {renderHeader()}
                {renderStats()}
                {renderContent()}
            </ScrollView>
            {renderSocialModal()}
            {renderStalkMeModal()}

            {/* Share Modal */}
            {myCardCode && (
                <ShareCardModal
                    visible={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    cardCode={myCardCode}
                    cardOwnerName={profileData?.name || 'User'}
                />
            )}
        </View>
    );
}
