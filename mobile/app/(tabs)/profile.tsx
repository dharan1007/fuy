import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions, FlatList, Modal, RefreshControl, Share, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings, Bell, Grid, List, Plus, Heart, MessageCircle, Share2, MoreHorizontal, Edit3, Camera, Users, ChevronLeft, LogOut, Eye } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ShareCardModal from '../../components/ShareCardModal';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3 - 2;

interface Post {
    id: string;
    media: { url: string; type: string }[];
    likes?: number;
}

interface ProfileData {
    name: string;
    profile: {
        displayName: string;
        avatarUrl: string;
        bio: string;
        coverVideoUrl?: string; // Or cover image
    };
    followersCount: number;
    followingCount: number;
    stats: {
        posts: number;
        friends: number; // Mapping friends to followers/following logic usually, but here keeping backend stats
    };
    posts: Post[];
}

export default function ProfileScreen() {
    const router = useRouter();
    const { session } = useAuth();
    const { colors, mode } = useTheme();
    const [activeTab, setActiveTab] = useState<'grid' | 'list'>('grid');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);

    // Social Modal State
    const [showSocialModal, setShowSocialModal] = useState(false);
    const [socialType, setSocialType] = useState<'followers' | 'following'>('followers');
    const [socialList, setSocialList] = useState<any[]>([]);
    const [socialLoading, setSocialLoading] = useState(false);
    const [dbUserId, setDbUserId] = useState<string | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [myCardCode, setMyCardCode] = useState<string | null>(null);

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
            const userEmail = session.user.email;

            // 1. Fetch User details
            let userResult = await supabase
                .from('User')
                .select(`
                    id,
                    name,
                    profile:Profile (displayName, avatarUrl, bio)
                `)
                .eq('id', userId)
                .single();

            if (userResult.error && userEmail) {
                userResult = await supabase
                    .from('User')
                    .select(`
                        id,
                        name,
                        profile:Profile (displayName, avatarUrl, bio)
                    `)
                    .eq('email', userEmail)
                    .single();
            }

            // Fallback to lowercase 'user' if capital failed completely
            if (userResult.error) {
                userResult = await supabase
                    .from('user')
                    .select(`
                        id,
                        name,
                        profile:profile (displayName, avatarUrl, bio)
                    `)
                    .eq('id', userId)
                    .single();
            }

            let userData = userResult.data;

            // Handle User Creation if missing
            if (!userData && userEmail) {
                console.log('Creating user...');
                const { data: newUser } = await supabase
                    .from('User')
                    .insert({ id: userId, email: userEmail, name: userEmail.split('@')[0] })
                    .select().single();
                if (newUser) {
                    userData = newUser;
                    await supabase.from('Profile').insert({
                        userId: userId,
                        displayName: userEmail.split('@')[0],
                        avatarUrl: `https://api.dicebear.com/7.x/avataaars/png?seed=${userId}`
                    });
                }
            }

            const targetId = userData?.id || userId;
            setDbUserId(targetId);

            // 2. Fetch Real Counts from Friendship table
            const followersCountRes = await supabase
                .from('Friendship')
                .select('*', { count: 'exact', head: true })
                .eq('friendId', targetId);

            const followingCountRes = await supabase
                .from('Friendship')
                .select('*', { count: 'exact', head: true })
                .eq('userId', targetId);

            // 3. Fetch Posts
            let postsResult = await supabase
                .from('Post')
                .select(`
                    id,
                    media:Media(url, type)
                `)
                .eq('userId', targetId)
                .order('createdAt', { ascending: false });

            // Fallback for posts
            if (postsResult.error) {
                postsResult = await supabase
                    .from('post')
                    .select(`
                        id,
                        media:media(url, type)
                    `)
                    .eq('userId', targetId)
                    .order('createdAt', { ascending: false });
            }

            const postsData = postsResult.data || [];

            setProfileData({
                name: userData?.name || session.user.email || 'User',
                profile: {
                    displayName: (userData?.profile as any)?.displayName || userData?.name || 'Explorer',
                    avatarUrl: (userData?.profile as any)?.avatarUrl || '',
                    bio: (userData?.profile as any)?.bio || '',
                    coverVideoUrl: undefined
                },
                followersCount: followersCountRes.count || 0,
                followingCount: followingCountRes.count || 0,
                stats: {
                    posts: postsData.length,
                    friends: 0
                },
                posts: postsData.map((p: any) => ({
                    id: p.id,
                    media: p.media || [],
                    likes: 0
                }))
            });

        } catch (e) {
            console.error('Fetch profile error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
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
                const { data: followingData } = await supabase
                    .from('Friendship')
                    .select(`
                        friend:friendId (
                            id,
                            name,
                            profile:Profile (displayName, avatarUrl)
                        )
                    `)
                    .eq('userId', myId);

                if (followingData) {
                    data = followingData.map((item: any) => item.friend);
                }

            } else {
                const { data: followersData } = await supabase
                    .from('Friendship')
                    .select(`
                        user:userId (
                            id,
                            name,
                            profile:Profile (displayName, avatarUrl)
                        )
                    `)
                    .eq('friendId', myId);

                if (followersData) {
                    data = followersData.map((item: any) => item.user);
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
            } else {
                Alert.alert('No Profile Card', 'Create a profile card first to share it!');
            }
        } catch (error) {
            Alert.alert('No Profile Card', 'Create a profile card first to share it!');
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
            {/* Cover Image/Video Placeholder */}
            <Image
                source={{ uri: profile?.coverVideoUrl || 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1000&auto=format&fit=crop&q=60' }}
                className="w-full h-full"
                resizeMode="cover"
            />
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
                            source={{ uri: profile?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/png?seed=' + (profileData?.name || 'User') }}
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
                <View>
                    <Text style={{ color: colors.text }} className="text-2xl font-bold mb-1">{profile?.displayName || 'User'}</Text>
                    {profile?.bio ? (
                        <Text style={{ color: colors.secondary }} className="text-sm leading-5 max-w-[280px]">{profile.bio}</Text>
                    ) : (
                        <TouchableOpacity className="flex-row items-center gap-2 mt-1">
                            <Edit3 color={colors.secondary} size={14} />
                            <Text style={{ color: colors.secondary }} className="text-sm italic">Add a bio...</Text>
                        </TouchableOpacity>
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

            {/* Profile Card Action */}
            <View className="flex-row gap-2 mb-6">
                <TouchableOpacity
                    onPress={() => router.push('/profile-card/editor')}
                    className="flex-1 py-3 rounded-2xl items-center justify-center flex-row gap-2"
                    style={{ backgroundColor: colors.primary }}
                >
                    <Text className="font-bold" style={{ color: mode === 'dark' ? '#000' : '#fff' }}>My Profile Card</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => {
                        // Pass resolved DB user ID to view own card
                        if (dbUserId) {
                            router.push({ pathname: '/profile-card/view', params: { userId: dbUserId } });
                        }
                    }}
                    className="aspect-square rounded-2xl items-center justify-center border"
                    style={{ backgroundColor: colors.card, borderColor: colors.border }}
                >
                    <Eye size={20} color={colors.text} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderContent = () => (
        <View className="flex-1 rounded-t-[40px] overflow-hidden min-h-[500px]" style={{ backgroundColor: colors.card }}>
            {/* Tabs */}
            <View className="flex-row justify-between items-center px-8 py-5 border-b" style={{ borderColor: colors.border }}>
                <Text style={{ color: colors.text }} className="font-bold text-lg tracking-wide">Recent Posts</Text>
                <View className="flex-row gap-4 p-1 rounded-xl" style={{ backgroundColor: colors.background }}>
                    <TouchableOpacity
                        onPress={() => setActiveTab('grid')}
                        className={`p-2 rounded-lg`}
                        style={{ backgroundColor: activeTab === 'grid' ? colors.border : 'transparent' }}
                    >
                        <Grid color={activeTab === 'grid' ? colors.text : colors.secondary} size={20} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('list')}
                        className={`p-2 rounded-lg`}
                        style={{ backgroundColor: activeTab === 'list' ? colors.border : 'transparent' }}
                    >
                        <List color={activeTab === 'list' ? colors.text : colors.secondary} size={20} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content Area */}
            {profileData?.posts?.length === 0 ? (
                <View className="py-20 items-center justify-center opacity-50">
                    <Grid color={colors.secondary} size={48} />
                    <Text style={{ color: colors.text }} className="mt-4 font-medium">No posts yet</Text>
                </View>
            ) : (
                <View className="flex-row flex-wrap">
                    {(profileData?.posts || []).map((post) => {
                        const imageUrl = post.media && post.media.length > 0 ? post.media[0].url : `https://source.unsplash.com/random/400x400?sig=${post.id}`;
                        return (
                            <TouchableOpacity
                                key={post.id}
                                style={{ width: COLUMN_WIDTH, height: COLUMN_WIDTH, backgroundColor: colors.border }}
                                className="m-[1px]"
                            >
                                <Image
                                    source={{ uri: imageUrl }}
                                    className="w-full h-full"
                                    resizeMode="cover"
                                />
                                {activeTab === 'list' && (
                                    <BlurView intensity={20} tint={mode === 'light' ? 'light' : 'dark'} className="absolute bottom-0 left-0 right-0 p-2 flex-row items-center gap-1">
                                        <Heart color={colors.text} size={12} fill={colors.text} />
                                        <Text style={{ color: colors.text }} className="text-xs font-bold">{post.likes || 0}</Text>
                                    </BlurView>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
            <View className="h-24" />
        </View>
    );

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
                                        source={{ uri: item.profile?.avatarUrl || item.avatar || 'https://api.dicebear.com/7.x/avataaars/png?seed=' + item.name }}
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
