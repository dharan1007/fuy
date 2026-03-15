import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity, Modal, Alert, ScrollView, RefreshControl, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import FeedVideoPlayer from '../../components/FeedVideoPlayer';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Trash2, GripVertical, Maximize2, Minimize2, Grid3X3, Square, MonitorPlay, Share2, Settings, Bell, Grid, List, Plus, Heart, MessageCircle, MoreHorizontal, Edit3, Camera, Users, ChevronLeft, LogOut, Eye, Play, MapPin, Tag, X, Check } from 'lucide-react-native';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import { useToast } from '../../context/ToastContext';
import ShareCardModal from '../../components/ShareCardModal';
import PostAnalyticsModal from '../../components/PostAnalyticsModal';
import { SlashService, Slash, SlashContribution } from '../../services/SlashService';
import SlashCreationSheet from '../../components/SlashCreationSheet';
import SlashManagementSheet from '../../components/SlashManagementSheet';
import Svg, { Circle } from 'react-native-svg';
import { getProfileCompletionScore } from '../../utils/profileCompletion';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3 - 2;
const POST_GAP = 2;

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
    const [postFilter, setPostFilter] = useState<'ALL' | 'FILLS' | 'LILLS' | 'SIMPLE' | 'AUDIO' | 'CHANNELS' | 'XRAYS'>('ALL');
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
    const [mySlashes, setMySlashes] = useState<Slash[]>([]);
    const [myContributions, setMyContributions] = useState<SlashContribution[]>([]);
    const [showSlashCreate, setShowSlashCreate] = useState(false);
    const [managingSlash, setManagingSlash] = useState<Slash | null>(null);

    // Phase 2: New UI state
    const [currentVibe, setCurrentVibe] = useState<string | null>(null);
    const [showVibePicker, setShowVibePicker] = useState(false);
    const [vibeInput, setVibeInput] = useState('');
    const [mutualCount, setMutualCount] = useState(0);
    const [completionScore, setCompletionScore] = useState(0);
    const [completionTasks, setCompletionTasks] = useState<any[]>([]);
    const [showCompletionSheet, setShowCompletionSheet] = useState(false);
    const [rawProfile, setRawProfile] = useState<Record<string, any> | null>(null);

    // Batch Selection State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Batch Selection Handlers
    const toggleSelectionMode = () => {
        if (isSelectionMode) {
            setIsSelectionMode(false);
            setSelectedPostIds(new Set());
        } else {
            setIsSelectionMode(true);
        }
    };

    const togglePostSelection = (postId: string) => {
        const newSelected = new Set(selectedPostIds);
        if (newSelected.has(postId)) {
            newSelected.delete(postId);
        } else {
            newSelected.add(postId);
        }
        setSelectedPostIds(newSelected);
    };

    const handleDeleteSelected = () => {
        if (selectedPostIds.size === 0) return;
        setShowDeleteConfirm(true);
    };

    const confirmBatchDelete = async () => {
        console.log("Confirm Batch Delete Pressed");
        if (selectedPostIds.size === 0) return;

        try {
            setIsDeleting(true); // specific state
            const ids = Array.from(selectedPostIds);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                console.error("No access token found");
                throw new Error("Not authenticated");
            }

            // Batch Delete using direct Supabase
            const { error, count } = await supabase
                .from('Post')
                .delete({ count: 'exact' })
                .in('id', ids);

            if (error) throw error;
            console.log("Deleted count:", count);

            // Update local state
            setProfileData(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    posts: prev.posts.filter(p => !selectedPostIds.has(p.id))
                };
            });

            showToast(`Deleted ${ids.length} posts`, 'success');
            setIsSelectionMode(false);
            setSelectedPostIds(new Set());
            setShowDeleteConfirm(false);
        } catch (error: any) {
            console.error("Batch delete error:", error);
            const msg = error.name === 'AbortError' ? 'Request timed out. Server unreachable.' : error.message;
            showToast('Error deleting posts: ' + msg, 'error');
            Alert.alert("Delete Error", msg);
        } finally {
            setIsDeleting(false);
        }
    };

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
                .select(`id, name, isHumanVerified, profileCode, profile:Profile(displayName, avatarUrl, bio, coverImageUrl, coverVideoUrl, location, tags, stalkMe, current_vibe, conversationStarter, city, workHistory, education)`)
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
                    lillData:Lill(thumbnailUrl),
                    fillData:Fill(thumbnailUrl),
                    user:User(name, profile:Profile(displayName, avatarUrl))
                `)
                .eq('userId', userId)
                .neq('postType', 'CLOCK')
                .neq('postType', 'FILL')
                .not('feature', 'in', '("PROGRESS","CHECKIN","FOCUS")')
                .order('createdAt', { ascending: false });

            if (postsError) console.error("Posts fetch error:", postsError.message);

            const allPosts = (postsData || []).map((p: any) => {
                // Extract thumbnail
                const thumbnailUrl = p.lillData?.thumbnailUrl
                    || p.fillData?.thumbnailUrl
                    || p.chanData?.coverImageUrl
                    || null;

                // Extract media from PostMedia relationship
                const mediaItems = (p.postMedia || []).map((pm: any) => {
                    const m = pm.media;
                    if (m && thumbnailUrl) m.thumbnailUrl = thumbnailUrl;
                    return m;
                }).filter(Boolean);

                return {
                    id: p.id,
                    content: p.content,
                    postType: p.postType,
                    media: mediaItems,
                    chanData: p.chanData, // Pass through chanData
                    likes: 0
                };
            });

            // Handle potential array from Supabase relation
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

            // Phase 2: current vibe, mutuals, completion
            setCurrentVibe(profileObj?.current_vibe || null);
            setRawProfile(profileObj);
            const comp = getProfileCompletionScore(profileObj || {});
            setCompletionScore(comp.score);
            setCompletionTasks(comp.tasks);

            // Fetch mutual count via RPC
            try {
                const { data: mutData } = await supabase.rpc('get_mutual_count', { user_a: userId });
                if (typeof mutData === 'number') setMutualCount(mutData);
            } catch (mutErr) {
                console.log('Mutuals fetch non-fatal:', mutErr);
            }

            // Fetch slash data in parallel
            try {
                const [slashesResult, contribResult] = await Promise.all([
                    SlashService.getUserSlashes(userId),
                    SlashService.getUserContributions(userId),
                ]);
                if (slashesResult.success && slashesResult.data) setMySlashes(slashesResult.data);
                if (contribResult.success && contribResult.data) setMyContributions(contribResult.data);
            } catch (slashErr) {
                console.log('Slash fetch non-fatal:', slashErr);
            }

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

    const renderDeleteConfirmModal = () => (
        <Modal
            visible={showDeleteConfirm}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowDeleteConfirm(false)}
        >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={{ backgroundColor: colors.card, borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
                    <View style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        backgroundColor: '#fee2e2',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 16
                    }}>
                        <Trash2 size={32} color="#ef4444" />
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 12 }}>Delete {selectedPostIds.size} Posts?</Text>
                    <Text style={{ color: colors.secondary, textAlign: 'center', marginBottom: 24 }}>
                        Are you sure you want to delete these posts? This action cannot be undone.
                    </Text>

                    <View style={{ width: '100%', gap: 12 }}>
                        <TouchableOpacity
                            onPress={confirmBatchDelete}
                            disabled={isDeleting}
                            style={{
                                backgroundColor: isDeleting ? '#ef444480' : '#ef4444',
                                borderRadius: 16,
                                paddingVertical: 16,
                                alignItems: 'center',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                gap: 8
                            }}
                        >
                            {isDeleting ? (
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Deleting...</Text>
                            ) : (
                                <>
                                    <Trash2 size={18} color="white" />
                                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Yes, Delete All</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setShowDeleteConfirm(false)}
                            style={{
                                backgroundColor: mode === 'light' ? '#f5f5f5' : '#1a1a1a',
                                borderRadius: 16,
                                paddingVertical: 16,
                                alignItems: 'center'
                            }}
                        >
                            <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const { profile, stats, posts } = profileData || {
        profile: { displayName: 'User', avatarUrl: '', bio: '' },
        stats: { posts: 0, followers: 0, following: 0 },
        posts: []
    } as any;

    const renderHeader = () => (
        <View className="relative h-72">
            {/* Cover Video or Image */}
            {profile?.coverVideoUrl ? (
                <FeedVideoPlayer
                    url={profile.coverVideoUrl}
                    isActive={true}
                    isMuted={true}
                    isLooping={true}
                    contentFit="cover"
                    nativeControls={false}
                />
            ) : (
                <Image
                    source={{ uri: profile?.coverImageUrl || 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1000&auto=format&fit=crop&q=60' }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
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
                    <TouchableOpacity onPress={toggleSelectionMode} style={{ backgroundColor: isSelectionMode ? colors.primary : 'rgba(0,0,0,0.5)' }} className="px-4 h-10 rounded-full items-center justify-center">
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>{isSelectionMode ? 'Done' : 'Select'}</Text>
                    </TouchableOpacity>
                    {!isSelectionMode && (
                        <>
                            <TouchableOpacity onPress={handleShareProfile} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} className="w-10 h-10 rounded-full items-center justify-center">
                                <Share2 color="#fff" size={20} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => router.push('/settings')} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} className="w-10 h-10 rounded-full items-center justify-center">
                                <Settings color="#fff" size={20} />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </SafeAreaView>

            {/* Profile Avatar & Quick Actions */}
            <View className="absolute -bottom-14 left-6 flex-row items-end">
                <View className="relative">
                    {/* Completion Ring (SVG) around Avatar */}
                    {completionScore < 100 && (
                        <Svg width={128} height={128} style={{ position: 'absolute', top: -2, left: -2, zIndex: 10 }}>
                            <Circle cx={64} cy={64} r={60} stroke="rgba(255,255,255,0.1)" strokeWidth={3} fill="none" />
                            <Circle cx={64} cy={64} r={60} stroke={colors.primary || '#c8383a'} strokeWidth={3} fill="none"
                                strokeDasharray={`${(completionScore / 100) * 2 * Math.PI * 60} ${2 * Math.PI * 60}`}
                                strokeLinecap="round" rotation={-90} origin="64,64" />
                        </Svg>
                    )}
                    {/* Liquid Glass Avatar Border */}
                    <TouchableOpacity onPress={() => completionScore < 100 && setShowCompletionSheet(true)} activeOpacity={0.9}>
                        <BlurView intensity={20} tint={mode === 'light' ? 'light' : 'dark'} className="p-1 rounded-[36px] overflow-hidden">
                            <Image
                                source={{ uri: profile?.avatarUrl }}
                                className="w-28 h-28 rounded-[32px]"
                                style={{ backgroundColor: colors.secondary }}
                            />
                        </BlurView>
                    </TouchableOpacity>

                    <TouchableOpacity style={{ backgroundColor: colors.card }} className="absolute bottom-0 right-0 rounded-full p-2">
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
                    {profile?.bio ? (
                        <Text style={{ color: colors.secondary }} className="text-sm leading-5 max-w-[280px]">{profile.bio}</Text>
                    ) : (
                        <TouchableOpacity className="flex-row items-center gap-2 mt-1" onPress={() => router.push('/edit-profile')}>
                            <Edit3 color={colors.secondary} size={14} />
                            <Text style={{ color: colors.secondary }} className="text-sm italic">Add a bio...</Text>
                        </TouchableOpacity>
                    )}

                    {/* Current Vibe Pill */}
                    <TouchableOpacity onPress={() => { setVibeInput(currentVibe || ''); setShowVibePicker(true); }}
                        style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: currentVibe ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.05)', alignSelf: 'flex-start' }}>
                        {currentVibe ? (
                            <Text style={{ color: colors.text, fontSize: 12 }}>{String.fromCodePoint(0x25CF)} {currentVibe}</Text>
                        ) : (
                            <Text style={{ color: colors.secondary, fontSize: 12, fontStyle: 'italic' }}>+ Add a vibe...</Text>
                        )}
                    </TouchableOpacity>

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

            {/* Glass Stats Card -- Phase 4: increased blur + dark overlay */}
            <View style={{ borderRadius: 24, overflow: 'hidden', marginBottom: 32 }}>
                <BlurView intensity={50} tint={mode === 'light' ? 'light' : 'dark'} style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 24, paddingVertical: 16 }}>
                    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' }} />
                    <TouchableOpacity onPress={() => router.push({ pathname: '/following', params: { initialTab: 'following' } })} style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>{profileData?.followingCount || 0}</Text>
                        <Text style={{ color: colors.secondary, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Following</Text>
                    </TouchableOpacity>
                    <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                    <TouchableOpacity onPress={() => router.push({ pathname: '/following', params: { initialTab: 'followers' } })} style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>{profileData?.followersCount || 0}</Text>
                        <Text style={{ color: colors.secondary, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Followers</Text>
                    </TouchableOpacity>
                    <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                    <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>{stats?.posts || 0}</Text>
                        <Text style={{ color: colors.secondary, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Posts</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
                    <TouchableOpacity onPress={() => router.push({ pathname: '/following', params: { initialTab: 'following' } })} style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>{mutualCount}</Text>
                        <Text style={{ color: colors.secondary, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Mutuals</Text>
                    </TouchableOpacity>
                </BlurView>
            </View>

            {/* My Slashes Section */}
            <View style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ color: '#555', fontSize: 9, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' }}>my slashes</Text>
                    <TouchableOpacity onPress={() => setShowSlashCreate(true)}>
                        <Text style={{ color: '#c8383a', fontSize: 9, fontWeight: '600' }}>+ create</Text>
                    </TouchableOpacity>
                </View>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={[...mySlashes, { id: '__new__' } as any]}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => {
                        if (item.id === '__new__') {
                            return (
                                <TouchableOpacity onPress={() => setShowSlashCreate(true)} style={{ width: 100, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: '#1c1c1c', padding: 8, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                                    <Text style={{ color: '#1e1e1e', fontSize: 10 }}>+ new slash</Text>
                                </TouchableOpacity>
                            );
                        }
                        return (
                            <TouchableOpacity onPress={() => setManagingSlash(item)} style={{ width: 100, borderRadius: 8, backgroundColor: '#0e0e0e', borderWidth: 0.5, borderColor: '#1c1c1c', padding: 8, marginRight: 8 }}>
                                <Text style={{ color: '#eee', fontSize: 10, fontWeight: '700' }} numberOfLines={1}>/{item.name}</Text>
                                <Text style={{ color: '#2e2e2e', fontSize: 8, marginTop: 2 }}>{item.lillCount} lills  {item.contributorCount} contribs</Text>
                                <Text style={{ color: '#1e1e1e', fontSize: 7, fontFamily: 'monospace', marginTop: 2 }}>{item.slashCode}</Text>
                                <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4, backgroundColor: item.accessMode === 'locked' ? '#1a0e0e' : '#0e1a0e', alignSelf: 'flex-start' }}>
                                    <Text style={{ fontSize: 8, fontWeight: '700', color: item.accessMode === 'locked' ? '#c8383a' : '#4a8a4a' }}>{item.accessMode}</Text>
                                </View>
                                {(item as any).pendingCount > 0 && (
                                    <View style={{ position: 'absolute', top: 4, right: 4, width: 14, height: 14, borderRadius: 7, backgroundColor: '#c8383a', alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ color: '#fff', fontSize: 7, fontWeight: '700' }}>{(item as any).pendingCount}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>

            {/* Contributing To Section */}
            {myContributions.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: '#555', fontSize: 9, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>contributing to</Text>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={myContributions}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => {
                            const slash = item.slash as any;
                            if (!slash) return null;
                            return (
                                <View style={{ width: 100, borderRadius: 8, backgroundColor: '#0e0e0e', borderWidth: 0.5, borderColor: '#1c1c1c', padding: 8, marginRight: 8 }}>
                                    <Text style={{ color: '#eee', fontSize: 10, fontWeight: '700' }} numberOfLines={1}>/{slash.name}</Text>
                                    <Text style={{ color: '#2e2e2e', fontSize: 8, marginTop: 2 }}>{slash.lillCount} lills</Text>
                                    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4, backgroundColor: '#141414', alignSelf: 'flex-start' }}>
                                        <Text style={{ fontSize: 8, fontWeight: '700', color: '#555' }}>approved</Text>
                                    </View>
                                </View>
                            );
                        }}
                    />
                </View>
            )}

            {/* Profile Actions */}
            <View className="flex-row gap-2 mb-6">
                <TouchableOpacity
                    onPress={() => router.push('/edit-profile')}
                    className="flex-1 py-3 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: colors.background }}
                >
                    <Text className="font-bold" style={{ color: colors.text }}>Edit Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => router.push('/profile-card/editor')}
                    className="flex-1 py-3 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: colors.background }}
                >
                    <Text className="font-bold" style={{ color: colors.text }}>Card</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setShowAnalyticsModal(true)}
                    className="flex-1 py-3 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: colors.background }}
                >
                    <Text className="font-bold" style={{ color: colors.text }}>Details</Text>
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

        // V2 - FILLS, CHANNELS, and AUDIO/Auds hidden for now
        const filters: Array<'ALL' | 'FILLS' | 'LILLS' | 'SIMPLE' | 'AUDIO' | 'CHANNELS' | 'XRAYS'> = ['ALL', /* 'FILLS', */ 'LILLS', 'SIMPLE', /* 'AUDIO', */ /* 'CHANNELS', */ 'XRAYS'];

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
                    <FlatList
                        data={displayPosts}
                        keyExtractor={(item) => item.id}
                        numColumns={3}
                        renderItem={({ item }) => (
                            <PostCard
                                post={item}
                                colors={colors}
                                router={router}
                                width={width}
                                isSelectionMode={isSelectionMode}
                                isSelected={selectedPostIds.has(item.id)}
                                onSelect={() => togglePostSelection(item.id)}
                            />
                        )}
                        columnWrapperStyle={{ paddingHorizontal: 4 }}
                        contentContainerStyle={{ paddingVertical: 4 }}
                        // Virtualization optimizations
                        initialNumToRender={9}
                        maxToRenderPerBatch={9}
                        windowSize={5}
                        removeClippedSubviews={true}
                        getItemLayout={(data, index) => {
                            const cardSize = Math.floor((width - 12 - 8) / 3);
                            return { length: cardSize + 4, offset: (cardSize + 4) * Math.floor(index / 3), index };
                        }}
                        scrollEnabled={false}
                    />
                )}
                <View style={{ height: 100 }} />
            </View>
        );
    };

    // Adaptive Post Card Component
    const PostCard = ({ post, colors, router, width: screenWidth, isSelectionMode, isSelected, onSelect }:
        { post: any; colors: any; router: any; width: number; isSelectionMode: boolean; isSelected: boolean; onSelect: () => void }) => {

        const margin = 2; // Tighter margin for 3x3
        const cardWidth = Math.floor((screenWidth - (margin * 6) - 10) / 3); // 3 columns, slightly more buffer
        const isVideo = post.media?.[0]?.type === 'VIDEO' || post.postType === 'FILL' || post.postType === 'LILL';
        const isAudio = post.postType === 'AUD';
        const isChannel = post.postType === 'CHAN';
        const isXray = post.postType === 'XRAY';
        const isText = !post.media?.length && (!post.postType || post.postType === 'SIMPLE' || post.postType === 'SIMPLE_TEXT' || post.postType === 'TEXT');

        const handlePress = () => {
            if (isSelectionMode) {
                onSelect();
            } else {
                router.push(`/post/${post.id}`);
            }
        };

        const SelectionOverlay = () => {
            if (!isSelectionMode) return null;
            return (
                <View style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    backgroundColor: isSelected ? 'rgba(0,0,0,0.4)' : 'transparent',
                    zIndex: 10,
                    alignItems: 'flex-end',
                    padding: 4
                }}>
                    <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: '#fff',
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {isSelected && <Check size={12} color="#fff" />}
                    </View>
                </View>
            );
        };

        // Get media URL - prioritize thumbnailUrl for videos
        let mediaUrl = null;
        if (isChannel && post.chanData?.[0]?.coverImageUrl) {
            mediaUrl = post.chanData[0].coverImageUrl;
        } else if (post.media && post.media.length > 0) {
            const firstMedia = post.media[0];

            // For videos, prioritize thumbnailUrl 
            if (firstMedia.thumbnailUrl) {
                mediaUrl = firstMedia.thumbnailUrl;
            } else if (firstMedia.url) {
                // Safely grab the first media URL available
                mediaUrl = firstMedia.url;
            } else {
                // Secondary check: look for any image in the array
                const imageMedia = post.media.find((m: any) =>
                    m.type === 'IMAGE' ||
                    m.url?.match(/\.(jpg|jpeg|png|webp|gif)$/i)
                );
                mediaUrl = imageMedia?.url || null;
            }
        }

        // Text/Simple Post Card
        if (isText) {
            return (
                <TouchableOpacity
                    onPress={handlePress}
                    style={{
                        width: cardWidth,
                        height: cardWidth, // Square for Sixts
                        margin: margin,
                        padding: 8, // Reduce padding
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
                    <SelectionOverlay />
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
                    <SelectionOverlay />
                </TouchableOpacity>
            );
        }

        // Channel Post Card
        if (isChannel) {
            return (
                <TouchableOpacity
                    onPress={handlePress}
                    style={{
                        width: cardWidth,
                        height: cardWidth,
                        margin: margin,
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: '#fff',
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 8
                    }}
                >
                    <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 4
                    }}>
                        {mediaUrl ? (
                            <Image source={{ uri: mediaUrl }} style={{ width: 40, height: 40, borderRadius: 8 }} />
                        ) : (
                            <Settings size={20} color={colors.secondary} />
                        )}
                    </View>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: colors.text, fontSize: 10, fontWeight: '700', textAlign: 'center' }} numberOfLines={1}>
                            {post.content || 'Channel'}
                        </Text>
                    </View>
                    <View style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ color: colors.secondary, fontSize: 6, fontWeight: '700' }}>CHAN</Text>
                    </View>
                    <SelectionOverlay />
                </TouchableOpacity>
            );
        }

        // Video/Image Post Card (FILL, LILL, XRAY or media posts)
        let height = cardWidth; // Default Square (Simple Image)
        if (post.postType === 'FILL' || post.postType === 'LILL' || isVideo) height = cardWidth * 1.77; // 16:9 Vertical
        if (isXray) height = cardWidth * 1.33; // 4:3 Vertical

        return (
            <TouchableOpacity
                onPress={handlePress}
                style={{
                    width: cardWidth,
                    height: height,
                    margin: margin,
                    borderRadius: 16,
                    overflow: 'hidden',
                    backgroundColor: 'rgba(255,255,255,0.05)'
                }}
            >
                {mediaUrl ? (
                    isVideo ? (
                        <View style={{ width: '100%', height: '100%', backgroundColor: '#000' }}>
                            {/* Use Image thumbnail instead of Video for performance - video plays on post detail */}
                            <Image
                                source={{ uri: mediaUrl }}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="cover"
                            />
                            <View style={{ position: 'absolute', inset: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' }}>
                                    <Play size={18} color="#000" fill="#000" />
                                </View>
                            </View>
                        </View>
                    ) : (
                        <Image
                            source={{ uri: mediaUrl }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                        />
                    )
                ) : (
                    // Fallback for videos without thumbnail - show branded placeholder
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(30,30,30,1)' }}>
                        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                            <Play size={24} color="rgba(255,255,255,0.7)" fill="rgba(255,255,255,0.3)" />
                        </View>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 8, textTransform: 'uppercase' }}>
                            {post.postType || (isVideo ? 'Video' : 'Post')}
                        </Text>
                    </View>
                )}

                {/* Post Type Badge -- Phase 4: colored badges */}
                {(() => {
                    const type = (post.postType || 'POST').toUpperCase();
                    const badgeColors: Record<string, { bg: string; text: string }> = {
                        'XRAY': { bg: 'rgba(245,158,11,0.3)', text: '#f59e0b' },
                        'LILL': { bg: 'rgba(20,184,166,0.3)', text: '#14b8a6' },
                        'SIMPLE': { bg: 'rgba(6,182,212,0.3)', text: '#06b6d4' },
                        'FILL': { bg: 'rgba(6,182,212,0.3)', text: '#06b6d4' },
                        'AUD': { bg: 'rgba(251,146,60,0.3)', text: '#fb923c' },
                        'CHAN': { bg: 'rgba(255,255,255,0.15)', text: '#fff' },
                    };
                    const c = badgeColors[type] || { bg: 'rgba(0,0,0,0.7)', text: '#fff' };
                    return (
                        <View style={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            backgroundColor: c.bg,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 8
                        }}>
                            <Text style={{ color: c.text, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }}>
                                {type}
                            </Text>
                        </View>
                    );
                })()}

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
                <SelectionOverlay />
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

            {/* Vibe Picker Modal */}
            <Modal visible={showVibePicker} animationType="slide" transparent onRequestClose={() => setShowVibePicker(false)}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderColor: colors.border }}>
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 4 }}>Set Your Vibe</Text>
                        <Text style={{ color: colors.secondary, fontSize: 12, marginBottom: 16 }}>What is your energy right now? (max 60 chars)</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                            {['Locked in', 'Chilling', 'Exploring', 'Creating', 'Grinding', 'Vibing'].map((v) => (
                                <TouchableOpacity key={v} onPress={() => setVibeInput(v)}
                                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: vibeInput === v ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: vibeInput === v ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)' }}>
                                    <Text style={{ color: colors.text, fontSize: 12 }}>{v}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
                            <Text style={{ color: colors.secondary, marginRight: 8 }}>{'\u25CF'}</Text>
                            <View style={{ flex: 1 }}>
                                <TextInput
                                    placeholder="Type your vibe..."
                                    placeholderTextColor={colors.secondary}
                                    value={vibeInput}
                                    onChangeText={(t: string) => setVibeInput(t.slice(0, 60))}
                                    style={{ color: colors.text, fontSize: 14 }}
                                    maxLength={60}
                                />
                            </View>
                            <Text style={{ color: colors.secondary, fontSize: 10 }}>{vibeInput.length}/60</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            {currentVibe && (
                                <TouchableOpacity onPress={async () => {
                                    if (!dbUserId) return;
                                    await supabase.from('Profile').update({ current_vibe: null }).eq('userId', dbUserId);
                                    setCurrentVibe(null); setVibeInput(''); setShowVibePicker(false);
                                }} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
                                    <Text style={{ color: colors.secondary, fontWeight: '700' }}>Clear</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={async () => {
                                if (!dbUserId || !vibeInput.trim()) return;
                                await supabase.from('Profile').update({ current_vibe: vibeInput.trim() }).eq('userId', dbUserId);
                                setCurrentVibe(vibeInput.trim()); setShowVibePicker(false);
                            }} style={{ flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center' }}>
                                <Text style={{ color: '#000', fontWeight: '800' }}>Save Vibe</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={() => setShowVibePicker(false)} style={{ alignSelf: 'center', marginTop: 12 }}>
                            <Text style={{ color: colors.secondary, fontSize: 12 }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Completion Sheet Modal */}
            <Modal visible={showCompletionSheet} animationType="slide" transparent onRequestClose={() => setShowCompletionSheet(false)}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderColor: colors.border, maxHeight: '70%' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <View>
                                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Profile Completion</Text>
                                <Text style={{ color: colors.secondary, fontSize: 12 }}>{completionScore}% complete</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowCompletionSheet(false)} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 }}>
                                <X color={colors.text} size={18} />
                            </TouchableOpacity>
                        </View>
                        {/* Progress bar */}
                        <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 20 }}>
                            <View style={{ width: `${completionScore}%`, height: '100%', backgroundColor: colors.primary || '#c8383a', borderRadius: 2 }} />
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {completionTasks.map((task: any, i: number) => (
                                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: task.done ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                        {task.done ? <Check size={14} color="#22c55e" /> : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' }} />}
                                    </View>
                                    <Text style={{ color: task.done ? colors.secondary : colors.text, fontSize: 13, textDecorationLine: task.done ? 'line-through' : 'none', flex: 1 }}>{task.label}</Text>
                                    <Text style={{ color: colors.secondary, fontSize: 10 }}>+{task.points}</Text>
                                </View>
                            ))}
                        </ScrollView>
                        <TouchableOpacity onPress={() => { setShowCompletionSheet(false); router.push('/edit-profile'); }}
                            style={{ marginTop: 16, paddingVertical: 14, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center' }}>
                            <Text style={{ color: '#000', fontWeight: '800' }}>Complete My Profile</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Share Modal */}
            {myCardCode && (
                <ShareCardModal
                    visible={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    cardCode={myCardCode}
                    cardOwnerName={profileData?.name || 'User'}
                />
            )}

            {/* Batch Delete Bar */}
            {isSelectionMode && selectedPostIds.size > 0 && (
                <View style={{
                    position: 'absolute',
                    bottom: 85, // Avoid Bottom Tab Bar
                    left: 16, // Add side margin for floating look
                    right: 16,
                    backgroundColor: colors.card,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    shadowColor: "#000",
                    shadowOffset: {
                        width: 0,
                        height: 4,
                    },
                    shadowOpacity: 0.30,
                    shadowRadius: 4.65,
                    elevation: 8,
                }}>
                    <Text style={{ color: colors.text, fontWeight: 'bold', marginLeft: 8 }}>{selectedPostIds.size} selected</Text>
                    <TouchableOpacity
                        onPress={handleDeleteSelected}
                        style={{ backgroundColor: '#ef4444', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                    >
                        <Trash2 size={16} color="#fff" />
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Delete</Text>
                    </TouchableOpacity>
                </View>
            )}

            {renderDeleteConfirmModal()}

            {/* Post Analytics Modal */}
            {dbUserId && (
                <PostAnalyticsModal
                    visible={showAnalyticsModal}
                    onClose={() => setShowAnalyticsModal(false)}
                    userId={dbUserId}
                />
            )}
        </View>
    );
}
