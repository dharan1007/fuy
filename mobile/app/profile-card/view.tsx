import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions, Alert, FlatList, ActivityIndicator, ViewToken, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Share2, Copy, Star, Heart, Music, MapPin, Briefcase, GraduationCap, Trophy, Users, Eye, ChevronRight, X } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import * as Clipboard from 'expo-clipboard';
import ShareCardModal from '../../components/ShareCardModal';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 48;
const CARD_HEIGHT = height * 0.65;

interface ProfileData {
    displayName?: string;
    avatarUrl?: string;
    dob?: string;
    city?: string;
    location?: string;
    height?: string;
    weight?: string;
    conversationStarter?: string;
    workHistory?: string;
    education?: string;
    achievements?: string;
    skills?: string[];
    lifeIsLike?: string;
    interactionMode?: string;
    bestVibeTime?: string;
    vibeWithPeople?: string;
    careAbout?: string;
    protectiveAbout?: string;
    distanceMakers?: string;
    emotionalFit?: string;
    goals?: string;
    lifestyle?: string;
    topMovies?: string[];
    topSongs?: string[];
    topFoods?: string[];
    topGames?: string[];
    stalkMe?: string[];
    cardBackgroundUrl?: string;
}

export default function ProfileCardView() {
    const { userId, code } = useLocalSearchParams();
    const router = useRouter();

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [userName, setUserName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [profileCode, setProfileCode] = useState<string>('');
    const flatListRef = useRef<FlatList>(null);

    const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0 && viewableItems[0].index !== null) {
            setCurrentIndex(viewableItems[0].index);
        }
    }, []);

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    useEffect(() => {
        fetchProfile();
    }, [userId, code]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            let targetUserId = userId as string;

            if (code) {
                const { data: user } = await supabase
                    .from('User')
                    .select('id, profileCode')
                    .eq('profileCode', code)
                    .single();
                if (user) {
                    targetUserId = user.id;
                    setProfileCode(user.profileCode || '');
                }
            }

            if (!targetUserId) {
                setLoading(false);
                return;
            }

            const { data: p, error } = await supabase
                .from('Profile')
                .select('*')
                .eq('userId', targetUserId)
                .single();

            if (error) {
                console.error('Profile fetch error:', error);
                setLoading(false);
                return;
            }

            const { data: user } = await supabase
                .from('User')
                .select('name')
                .eq('id', targetUserId)
                .single();

            if (user) setUserName(user.name || '');

            const parseArr = (val: any) => {
                if (Array.isArray(val)) return val;
                if (typeof val === 'string') {
                    try { return JSON.parse(val); } catch { return []; }
                }
                return [];
            };

            setProfile({
                ...p,
                skills: parseArr(p?.skills),
                topMovies: parseArr(p?.topMovies),
                topSongs: parseArr(p?.topSongs),
                topFoods: parseArr(p?.topFoods),
                topGames: parseArr(p?.topGames),
                stalkMe: parseArr(p?.stalkMe),
            });

            if (!profileCode) {
                const { data: user } = await supabase
                    .from('User')
                    .select('profileCode')
                    .eq('id', targetUserId)
                    .single();
                if (user?.profileCode) setProfileCode(user.profileCode);
            }
        } catch (e) {
            console.error('Error fetching profile:', e);
        } finally {
            setLoading(false);
        }
    };

    const copyCode = async () => {
        if (profileCode) {
            await Clipboard.setStringAsync(profileCode);
            Alert.alert('Copied', 'Profile code copied');
        }
    };

    const scrollNext = () => {
        if (flatListRef.current && currentIndex < 5) {
            flatListRef.current.scrollToIndex({ index: currentIndex + 1, animated: true });
        }
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-black">
                <ActivityIndicator color="#fff" size="large" />
                <Text className="text-white/50 mt-4 text-xs tracking-[0.3em]">LOADING</Text>
            </View>
        );
    }

    if (!profile) {
        return (
            <View className="flex-1 items-center justify-center p-6 bg-black">
                <Text className="text-2xl font-black text-white mb-2">CARD NOT FOUND</Text>
                <Text className="text-white/40 text-center mb-6">This profile card does not exist.</Text>
                <TouchableOpacity onPress={() => router.back()} className="px-8 py-4 bg-white">
                    <Text className="text-black font-black tracking-widest text-xs">GO BACK</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const age = profile.dob ? new Date().getFullYear() - new Date(profile.dob).getFullYear() : null;
    const stalkMeImages = (profile.stalkMe || []).filter(Boolean);

    // Get background image for each card (cycle through stalkMe images)
    const getCardBg = (index: number) => {
        if (stalkMeImages.length === 0) return profile.cardBackgroundUrl || null;
        return stalkMeImages[index % stalkMeImages.length];
    };

    const cards = [
        { id: 'identity', title: null },
        { id: 'professional', title: 'PROFESSIONAL' },
        { id: 'vibe', title: 'VIBE CHECK' },
        { id: 'deep', title: 'DEEP DIVE' },
        { id: 'favorites', title: 'FAVORITES' },
        { id: 'stalk', title: 'STALK ME' },
    ];

    const renderCard = ({ item, index }: { item: typeof cards[0]; index: number }) => {
        const bgUrl = getCardBg(index);

        return (
            <View style={{ width: CARD_WIDTH, height: CARD_HEIGHT, marginHorizontal: 8 }}>
                <View className="flex-1 rounded-3xl bg-black overflow-hidden border border-white/10">
                    {/* Background Image */}
                    {bgUrl && (
                        <View className="absolute inset-0">
                            <Image source={{ uri: bgUrl }} className="w-full h-full" style={{ opacity: 0.5 }} resizeMode="cover" />
                            <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']} className="absolute inset-0" locations={[0, 0.5, 1]} />
                        </View>
                    )}

                    {/* Title */}
                    {item.title && (
                        <View className="absolute top-6 left-6 z-10">
                            <View className="flex-row items-center bg-black/60 px-3 py-2 rounded-full border border-white/10">
                                <View className="w-1.5 h-1.5 bg-white rounded-full mr-2" />
                                <Text className="text-white font-black text-[10px] tracking-[0.2em]">{item.title}</Text>
                            </View>
                        </View>
                    )}

                    {/* Content with translucent backgrounds */}
                    <ScrollView className="flex-1 p-6 pt-16" showsVerticalScrollIndicator={false}>
                        {item.id === 'identity' && (
                            <View className="items-center">
                                <View className="w-28 h-28 rounded-full border-4 border-white/20 overflow-hidden mb-4">
                                    {profile.avatarUrl ? (
                                        <Image source={{ uri: profile.avatarUrl }} className="w-full h-full" />
                                    ) : (
                                        <View className="w-full h-full bg-white/10 items-center justify-center">
                                            <Text className="text-white/30 text-3xl font-black">{profile.displayName?.[0] || '?'}</Text>
                                        </View>
                                    )}
                                </View>

                                <GlassBox>
                                    <Text className="text-white text-2xl font-black tracking-tight text-center">{profile.displayName || 'Anonymous'}</Text>
                                    <Text className="text-white/50 text-sm font-bold text-center mt-1">@{userName}</Text>
                                </GlassBox>

                                <View className="flex-row gap-3 mt-4">
                                    {age && <GlassStatBadge label="AGE" value={age.toString()} />}
                                    {profile.city && <GlassStatBadge label="CITY" value={profile.city} />}
                                </View>
                                <View className="flex-row gap-3 mt-3">
                                    {profile.height && <GlassStatBadge label="HEIGHT" value={profile.height} />}
                                    {profile.weight && <GlassStatBadge label="WEIGHT" value={profile.weight} />}
                                </View>

                                {profile.conversationStarter && (
                                    <GlassBox style={{ marginTop: 16, width: '100%' }}>
                                        <Text className="text-white/50 text-[10px] font-black tracking-widest mb-2">CONVERSATION STARTER</Text>
                                        <Text className="text-white text-sm font-bold italic">"{profile.conversationStarter}"</Text>
                                    </GlassBox>
                                )}
                            </View>
                        )}

                        {item.id === 'professional' && (
                            <View className="space-y-4 pt-4">
                                <GlassSectionBox title="WORK HISTORY" content={profile.workHistory} icon={<Briefcase color="rgba(255,255,255,0.6)" size={14} />} />
                                <GlassSectionBox title="EDUCATION" content={profile.education} icon={<GraduationCap color="rgba(255,255,255,0.6)" size={14} />} />
                                <GlassSectionBox title="ACHIEVEMENTS" content={profile.achievements} icon={<Trophy color="rgba(255,255,255,0.6)" size={14} />} />

                                {profile.skills && profile.skills.length > 0 && (
                                    <GlassBox>
                                        <Text className="text-white/50 text-[10px] font-black tracking-widest mb-3">CORE SKILLS</Text>
                                        <View className="flex-row flex-wrap gap-2">
                                            {profile.skills.map((skill, i) => (
                                                <View key={i} className="px-3 py-1.5 bg-white/10 rounded-full border border-white/10">
                                                    <Text className="text-white text-xs font-bold">{skill}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </GlassBox>
                                )}
                            </View>
                        )}

                        {item.id === 'vibe' && (
                            <View className="space-y-4 pt-4">
                                <GlassSectionBox title="LIFE IS LIKE..." content={profile.lifeIsLike} />

                                <View className="flex-row gap-3">
                                    {profile.interactionMode && (
                                        <GlassBox style={{ flex: 1 }}>
                                            <Text className="text-white/50 text-[9px] font-black tracking-widest mb-1">INTERACTION</Text>
                                            <Text className="text-white text-lg font-black">{profile.interactionMode}</Text>
                                        </GlassBox>
                                    )}
                                    {profile.bestVibeTime && (
                                        <GlassBox style={{ flex: 1 }}>
                                            <Text className="text-white/50 text-[9px] font-black tracking-widest mb-1">BEST TIME</Text>
                                            <Text className="text-white text-lg font-black">{profile.bestVibeTime}</Text>
                                        </GlassBox>
                                    )}
                                </View>

                                <GlassSectionBox title="IDEAL VIBE" content={profile.vibeWithPeople} icon={<Users color="rgba(255,255,255,0.6)" size={14} />} />
                            </View>
                        )}

                        {item.id === 'deep' && (
                            <View className="space-y-4 pt-4">
                                <GlassSectionBox title="CARE ABOUT" content={profile.careAbout} icon={<Heart color="rgba(255,255,255,0.6)" size={14} />} />
                                <GlassSectionBox title="PROTECTIVE ABOUT" content={profile.protectiveAbout} />
                                <GlassSectionBox title="DISTANCE MAKERS" content={profile.distanceMakers} />
                                <GlassSectionBox title="EMOTIONAL FIT" content={profile.emotionalFit} />
                            </View>
                        )}

                        {item.id === 'favorites' && (
                            <View className="space-y-4 pt-4">
                                <GlassSectionBox title="GOALS" content={profile.goals} icon={<Star color="rgba(255,255,255,0.6)" size={14} />} />
                                <GlassSectionBox title="LIFESTYLE" content={profile.lifestyle} />

                                <View className="flex-row flex-wrap gap-3">
                                    <GlassFavoriteBox label="MOVIES" items={profile.topMovies} />
                                    <GlassFavoriteBox label="SONGS" items={profile.topSongs} />
                                    <GlassFavoriteBox label="FOODS" items={profile.topFoods} />
                                    <GlassFavoriteBox label="GAMES" items={profile.topGames} />
                                </View>
                            </View>
                        )}

                        {item.id === 'stalk' && (
                            <View className="pt-4">
                                {stalkMeImages.length > 0 ? (
                                    <View className="flex-row flex-wrap gap-2">
                                        {stalkMeImages.map((url, i) => (
                                            <TouchableOpacity key={i} className="w-[31%] aspect-square rounded-xl overflow-hidden border border-white/10">
                                                <Image source={{ uri: url }} className="w-full h-full" />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ) : (
                                    <GlassBox style={{ alignItems: 'center', paddingVertical: 40 }}>
                                        <Eye color="rgba(255,255,255,0.3)" size={32} />
                                        <Text className="text-white/30 font-black tracking-widest text-[10px] mt-3">NO MEDIA UPLOADED</Text>
                                    </GlassBox>
                                )}
                            </View>
                        )}
                    </ScrollView>

                    {/* Brand Footer */}
                    <View className="absolute bottom-4 right-4 bg-black/50 px-2 py-1 rounded">
                        <Text className="text-white/30 text-[8px] font-black tracking-[0.2em]">FUY</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View className="flex-1 bg-black">
            <SafeAreaView className="flex-1">
                {/* Header */}
                <View className="flex-row items-center justify-between px-4 py-3">
                    <TouchableOpacity onPress={() => router.back()} className="p-3 bg-white/5 rounded-full border border-white/10">
                        <ChevronLeft color="#fff" size={22} />
                    </TouchableOpacity>

                    {profileCode && (
                        <TouchableOpacity onPress={copyCode} className="flex-row items-center gap-2 px-4 py-2.5 bg-white/5 rounded-full border border-white/10">
                            <Text className="text-white font-black tracking-[0.15em] text-sm">{profileCode}</Text>
                            <Copy color="rgba(255,255,255,0.5)" size={14} />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity onPress={() => setShowShareModal(true)} className="p-3 bg-white/5 rounded-full border border-white/10">
                        <Share2 color="#fff" size={20} />
                    </TouchableOpacity>
                </View>

                {/* Cards */}
                <View className="flex-1 justify-center">
                    <FlatList
                        ref={flatListRef}
                        data={cards}
                        renderItem={renderCard}
                        keyExtractor={(item) => item.id}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={CARD_WIDTH + 16}
                        decelerationRate="fast"
                        contentContainerStyle={{ paddingHorizontal: 16 }}
                        onViewableItemsChanged={onViewableItemsChanged}
                        viewabilityConfig={viewabilityConfig}
                    />

                    {currentIndex < 5 && (
                        <TouchableOpacity
                            onPress={scrollNext}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 bg-white/10 rounded-full border border-white/20"
                        >
                            <ChevronRight color="#fff" size={20} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Dots */}
                <View className="flex-row justify-center gap-2 py-3">
                    {cards.map((_, i) => (
                        <View
                            key={i}
                            className="rounded-full"
                            style={{
                                width: currentIndex === i ? 20 : 6,
                                height: 6,
                                backgroundColor: currentIndex === i ? '#fff' : 'rgba(255,255,255,0.2)',
                            }}
                        />
                    ))}
                </View>

                {/* Action Buttons */}
                <View className="flex-row gap-3 px-4 pb-4">
                    <TouchableOpacity onPress={() => setShowPreview(true)} className="flex-1 py-4 bg-white/5 rounded-xl border border-white/10">
                        <Text className="text-white font-black tracking-widest text-xs text-center">PREVIEW</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowShareModal(true)} className="flex-1 py-4 bg-white rounded-xl">
                        <Text className="text-black font-black tracking-widest text-xs text-center">SHARE</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Share Modal */}
            {profileCode && (
                <ShareCardModal
                    visible={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    cardCode={profileCode}
                    cardOwnerName={profile.displayName || 'User'}
                />
            )}

            {/* Preview Modal */}
            <Modal visible={showPreview} animationType="fade" transparent>
                <View className="flex-1 bg-black/95 items-center justify-center p-4">
                    <TouchableOpacity onPress={() => setShowPreview(false)} className="absolute top-14 right-4 p-3 bg-white/10 rounded-full">
                        <X color="#fff" size={24} />
                    </TouchableOpacity>

                    <Text className="text-white/50 text-xs font-black tracking-[0.3em] mb-6">CARD PREVIEW</Text>

                    {/* Mini Card Preview */}
                    <View className="w-72 h-96 bg-black rounded-3xl overflow-hidden border border-white/20">
                        {stalkMeImages[0] && (
                            <Image source={{ uri: stalkMeImages[0] }} className="absolute w-full h-full" style={{ opacity: 0.4 }} />
                        )}
                        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} className="absolute inset-0" />

                        <View className="flex-1 items-center justify-center p-6">
                            <View className="w-20 h-20 rounded-full border-2 border-white/30 overflow-hidden mb-4">
                                {profile.avatarUrl && <Image source={{ uri: profile.avatarUrl }} className="w-full h-full" />}
                            </View>
                            <GlassBox style={{ width: '100%', alignItems: 'center' }}>
                                <Text className="text-white text-xl font-black">{profile.displayName}</Text>
                                <Text className="text-white/50 text-sm">@{userName}</Text>
                            </GlassBox>
                            {profile.conversationStarter && (
                                <GlassBox style={{ marginTop: 12, width: '100%' }}>
                                    <Text className="text-white/70 text-xs text-center italic">"{profile.conversationStarter}"</Text>
                                </GlassBox>
                            )}
                        </View>

                        <View className="absolute bottom-4 left-0 right-0 items-center">
                            <View className="flex-row gap-1">
                                {[0, 1, 2, 3, 4, 5].map(i => (
                                    <View key={i} className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                ))}
                            </View>
                        </View>
                    </View>

                    <Text className="text-white/30 text-[10px] mt-6 tracking-widest">SWIPE TO EXPLORE</Text>
                </View>
            </Modal>
        </View>
    );
}

// Glassmorphism components
function GlassBox({ children, style }: { children: React.ReactNode; style?: any }) {
    return (
        <View className="bg-black/40 backdrop-blur-xl rounded-2xl p-4 border border-white/10" style={style}>
            {children}
        </View>
    );
}

function GlassStatBadge({ label, value }: { label: string; value: string }) {
    return (
        <View className="bg-black/40 px-5 py-3 rounded-xl border border-white/10 items-center">
            <Text className="text-white/50 text-[9px] font-black tracking-widest mb-1">{label}</Text>
            <Text className="text-white text-base font-black">{value}</Text>
        </View>
    );
}

function GlassSectionBox({ title, content, icon }: { title: string; content?: string; icon?: React.ReactNode }) {
    if (!content) return null;
    return (
        <View className="bg-black/40 rounded-2xl p-4 border border-white/10 mb-3">
            <View className="flex-row items-center gap-2 mb-2">
                {icon}
                <Text className="text-white/50 text-[10px] font-black tracking-widest">{title}</Text>
            </View>
            <Text className="text-white text-sm font-bold leading-relaxed">"{content}"</Text>
        </View>
    );
}

function GlassFavoriteBox({ label, items }: { label: string; items?: string[] }) {
    if (!items || items.length === 0) return null;
    return (
        <View className="w-[47%] bg-black/40 rounded-xl p-3 border border-white/10">
            <Text className="text-white/50 text-[9px] font-black tracking-widest mb-2">{label}</Text>
            {items.slice(0, 3).map((item, i) => (
                <Text key={i} className="text-white text-xs font-bold mb-0.5">{item}</Text>
            ))}
        </View>
    );
}
