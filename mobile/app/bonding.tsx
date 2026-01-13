import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
    Image,
    Modal,
    TextInput,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
    ChevronLeft,
    ChevronDown,
    Frown,
    Smile,
    BookOpen,
    Plus,
    Trash2,
    AlertTriangle,
    X,
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Types
interface Profile {
    id: string;
    name: string;
    avatar: string;
    lastMessageAt?: string;
}

interface MessageTag {
    id: string;
    messageId: string;
    tagType: string;
    taggedContent?: string;
    note?: string;
    createdAt: string;
    message: {
        id: string;
        content: string;
        createdAt: string;
        sender: {
            name: string;
            profile?: { displayName?: string; avatarUrl?: string };
        };
    };
}

interface FactWarning {
    id: string;
    keyword: string;
    warningText: string;
    isActive: boolean;
}

type LockerType = 'blacklist' | 'happy' | 'fact';

export default function BondingScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ userId?: string; userName?: string; userAvatar?: string }>();
    const { colors, mode } = useTheme();
    const { session } = useAuth();

    // State
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [activeLocker, setActiveLocker] = useState<LockerType>('blacklist');
    const [tags, setTags] = useState<MessageTag[]>([]);
    const [tagCounts, setTagCounts] = useState<{ id: string; tagType: string }[]>([]); // All tags for count calculation
    const [facts, setFacts] = useState<FactWarning[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Add fact modal
    const [showAddFact, setShowAddFact] = useState(false);
    const [newKeyword, setNewKeyword] = useState('');
    const [newWarningText, setNewWarningText] = useState('');

    // Get authentication token from Supabase session
    const getAuthHeaders = async () => {
        const { data: { session: supaSession } } = await supabase.auth.getSession();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supaSession?.access_token || ''}`,
        };
    };

    // Fetch profiles user has chatted with
    const fetchProfiles = useCallback(async () => {
        try {
            if (!session?.user?.email) return;

            // Fetch from Supabase directly for mobile
            const { data: user } = await supabase
                .from('User')
                .select('id')
                .eq('email', session.user.email)
                .single();

            if (!user) return;

            const { data: conversations } = await supabase
                .from('Conversation')
                .select(`
                    id,
                    lastMessageAt,
                    participantA,
                    participantB,
                    userA:participantA(id, name, profile:Profile(displayName, avatarUrl)),
                    userB:participantB(id, name, profile:Profile(displayName, avatarUrl))
                `)
                .or(`participantA.eq.${user.id},participantB.eq.${user.id}`)
                .order('lastMessageAt', { ascending: false });

            if (conversations) {
                const profileList: Profile[] = conversations.map((conv: any) => {
                    const isA = conv.participantA === user.id;
                    const partner = isA ? conv.userB : conv.userA;
                    const profileData = Array.isArray(partner.profile) ? partner.profile[0] : partner.profile;
                    return {
                        id: partner.id,
                        name: profileData?.displayName || partner.name || 'Unknown',
                        avatar: profileData?.avatarUrl || '',
                        lastMessageAt: conv.lastMessageAt,
                    };
                });
                setProfiles(profileList);
                if (!selectedProfile && profileList.length > 0) {
                    setSelectedProfile(profileList[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching profiles:', error);
        }
    }, [session?.user?.email, selectedProfile]);

    // Fetch tags for selected profile
    const fetchTags = useCallback(async () => {
        if (!selectedProfile || !session?.user?.email) return;

        try {
            const { data: user } = await supabase
                .from('User')
                .select('id')
                .eq('email', session.user.email)
                .single();

            if (!user) return;

            // Determine tag types based on locker
            let tagTypes: string[] = [];
            if (activeLocker === 'blacklist') {
                tagTypes = ['BLACKLIST', 'ANGRY', 'SAD'];
            } else if (activeLocker === 'happy') {
                tagTypes = ['HAPPY', 'JOY', 'FUNNY'];
            } else {
                tagTypes = ['FACT'];
            }

            const { data, error } = await supabase
                .from('MessageTag')
                .select(`
                    id,
                    messageId,
                    tagType,
                    taggedContent,
                    note,
                    createdAt,
                    message:Message(
                        id,
                        content,
                        createdAt,
                        sender:User!senderId(
                            name,
                            profile:Profile(displayName, avatarUrl)
                        )
                    )
                `)
                .eq('userId', user.id)
                .eq('profileId', selectedProfile.id)
                .in('tagType', tagTypes)
                .order('createdAt', { ascending: false });

            if (error) throw error;

            // Transform data to match expected format
            const formattedTags = (data || []).map((tag: any) => ({
                ...tag,
                message: Array.isArray(tag.message) ? tag.message[0] : tag.message,
            })).filter((tag: any) => tag.message);

            setTags(formattedTags);
        } catch (error) {
            console.error('Error fetching tags:', error);
        }
    }, [selectedProfile, activeLocker, session?.user?.email]);

    // Fetch fact warnings
    const fetchFacts = useCallback(async () => {
        if (!selectedProfile || !session?.user?.email) return;

        try {
            const { data: user } = await supabase
                .from('User')
                .select('id')
                .eq('email', session.user.email)
                .single();

            if (!user) return;

            const { data, error } = await supabase
                .from('FactWarning')
                .select('*')
                .eq('userId', user.id)
                .eq('profileId', selectedProfile.id)
                .order('createdAt', { ascending: false });

            if (error) throw error;
            setFacts(data || []);
        } catch (error) {
            console.error('Error fetching facts:', error);
        }
    }, [selectedProfile, session?.user?.email]);

    // Fetch all tags for counts (without filtering by locker type)
    const fetchAllTagCounts = useCallback(async () => {
        if (!selectedProfile || !session?.user?.email) return;

        try {
            const { data: user } = await supabase
                .from('User')
                .select('id')
                .eq('email', session.user.email)
                .single();

            if (!user) return;

            const { data, error } = await supabase
                .from('MessageTag')
                .select('id, tagType')
                .eq('userId', user.id)
                .eq('profileId', selectedProfile.id);

            if (error) throw error;
            setTagCounts(data || []);
        } catch (error) {
            console.error('Error fetching tag counts:', error);
        }
    }, [selectedProfile, session?.user?.email]);

    // Initial load - check for route params first
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            await fetchProfiles();

            // If navigated from chat with a specific user, pre-select them
            if (params.userId && params.userName) {
                setSelectedProfile({
                    id: params.userId,
                    name: params.userName,
                    avatar: params.userAvatar || '',
                });
            }

            setIsLoading(false);
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.userId, params.userName, params.userAvatar]);

    // Load data when profile or locker changes
    useEffect(() => {
        if (selectedProfile) {
            fetchAllTagCounts();
            fetchFacts();
            fetchTags();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProfile?.id, activeLocker]);

    // Refresh handler
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchProfiles();
        await fetchAllTagCounts();
        await fetchTags();
        await fetchFacts();
        setIsRefreshing(false);
    };

    // Delete tag
    const deleteTag = async (tagId: string) => {
        try {
            const { error } = await supabase
                .from('MessageTag')
                .delete()
                .eq('id', tagId);

            if (error) throw error;
            setTags(tags.filter((t) => t.id !== tagId));
        } catch (error) {
            console.error('Error deleting tag:', error);
            Alert.alert('Error', 'Failed to delete item');
        }
    };

    // Add fact warning
    const addFactWarning = async () => {
        if (!newKeyword.trim() || !newWarningText.trim() || !selectedProfile) return;

        try {
            const { data: user } = await supabase
                .from('User')
                .select('id')
                .eq('email', session?.user?.email)
                .single();

            if (!user) return;

            // Generate unique ID for Supabase
            const generateId = () => `cm${Date.now().toString(36)}${Math.random().toString(36).substr(2, 9)}`;

            const { data, error } = await supabase
                .from('FactWarning')
                .insert({
                    id: generateId(),
                    userId: user.id,
                    profileId: selectedProfile.id,
                    keyword: newKeyword.toLowerCase().trim(),
                    warningText: newWarningText.trim(),
                })
                .select()
                .single();

            if (error) throw error;

            setFacts([data, ...facts]);
            setNewKeyword('');
            setNewWarningText('');
            setShowAddFact(false);
        } catch (error) {
            console.error('Error adding fact warning:', error);
            Alert.alert('Error', 'Failed to add warning');
        }
    };

    // Delete fact warning
    const deleteFact = async (factId: string) => {
        try {
            const { error } = await supabase
                .from('FactWarning')
                .delete()
                .eq('id', factId);

            if (error) throw error;
            setFacts(facts.filter((f) => f.id !== factId));
        } catch (error) {
            console.error('Error deleting fact:', error);
            Alert.alert('Error', 'Failed to delete warning');
        }
    };

    const getGradientColors = (): [string, string, string] => {
        return mode === 'light'
            ? ['#ffffff', '#f8f9fa', '#e9ecef']
            : mode === 'eye-care'
                ? ['#F5E6D3', '#E6D5C0', '#DBC4A0']
                : ['#0a0a0a', '#111111', '#1a1a1a'];
    };

    const getLockerColor = (locker: LockerType) => {
        switch (locker) {
            case 'blacklist': return '#ef4444';
            case 'happy': return '#22c55e';
            case 'fact': return '#3b82f6';
        }
    };

    const getLockerCount = (locker: LockerType) => {
        if (locker === 'fact') return facts.length;
        return tagCounts.filter((t) => {
            if (locker === 'blacklist') return ['BLACKLIST', 'ANGRY', 'SAD'].includes(t.tagType);
            return ['HAPPY', 'JOY', 'FUNNY'].includes(t.tagType);
        }).length;
    };

    // Render stat card
    const renderStatCard = (locker: LockerType, icon: React.ReactNode, title: string) => (
        <TouchableOpacity
            onPress={() => setActiveLocker(locker)}
            className="flex-1 p-4 rounded-2xl mr-2"
            style={{
                backgroundColor: activeLocker === locker ? getLockerColor(locker) : colors.card,
                borderWidth: 1,
                borderColor: activeLocker === locker ? getLockerColor(locker) : colors.border,
            }}
        >
            <View className="flex-row items-center justify-between mb-2">
                {icon}
                <Text
                    className="text-2xl font-bold"
                    style={{ color: activeLocker === locker ? 'white' : colors.text }}
                >
                    {activeLocker === locker && selectedProfile
                        ? (locker === 'fact' ? facts.length : tags.length)
                        : getLockerCount(locker)}
                </Text>
            </View>
            <Text
                className="text-xs font-semibold"
                style={{ color: activeLocker === locker ? 'white' : colors.secondary }}
            >
                {title}
            </Text>
        </TouchableOpacity>
    );

    // Render tag item
    const renderTagItem = (tag: MessageTag) => {
        const sender = tag.message?.sender;
        const senderProfile = Array.isArray(sender?.profile) ? sender?.profile[0] : sender?.profile;

        return (
            <View
                key={tag.id}
                className="p-4 rounded-2xl mb-3"
                style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
            >
                <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                        <View className="flex-row items-center gap-2 mb-2">
                            <View
                                className="px-2 py-1 rounded-full"
                                style={{ backgroundColor: getLockerColor(activeLocker) + '20' }}
                            >
                                <Text
                                    className="text-xs font-bold"
                                    style={{ color: getLockerColor(activeLocker) }}
                                >
                                    {tag.tagType}
                                </Text>
                            </View>
                            <Text className="text-xs" style={{ color: colors.secondary }}>
                                {new Date(tag.createdAt).toLocaleDateString()}
                            </Text>
                        </View>
                        <Text className="text-base mb-2" style={{ color: colors.text }}>
                            {tag.taggedContent || tag.message?.content || 'Message content unavailable'}
                        </Text>
                        {tag.note && (
                            <Text className="text-sm italic" style={{ color: colors.secondary }}>
                                Note: {tag.note}
                            </Text>
                        )}
                        <Text className="text-xs mt-2" style={{ color: colors.secondary }}>
                            From: {senderProfile?.displayName || sender?.name || 'Unknown'}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => Alert.alert(
                            'Delete',
                            'Remove this tagged message?',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => deleteTag(tag.id) },
                            ]
                        )}
                        className="p-2"
                    >
                        <Trash2 size={18} color={colors.secondary} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // Render fact item
    const renderFactItem = (fact: FactWarning) => (
        <View
            key={fact.id}
            className="p-4 rounded-2xl mb-3"
            style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
        >
            <View className="flex-row items-start justify-between">
                <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-2">
                        <AlertTriangle size={16} color="#f59e0b" />
                        <Text className="text-sm font-bold" style={{ color: colors.text }}>
                            Keyword: "{fact.keyword}"
                        </Text>
                    </View>
                    <Text className="text-base" style={{ color: colors.text }}>
                        {fact.warningText}
                    </Text>
                    <Text className="text-xs mt-2" style={{ color: fact.isActive ? '#22c55e' : colors.secondary }}>
                        {fact.isActive ? '● Active' : '○ Inactive'}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => Alert.alert(
                        'Delete',
                        'Remove this fact warning?',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => deleteFact(fact.id) },
                        ]
                    )}
                    className="p-2"
                >
                    <Trash2 size={18} color={colors.secondary} />
                </TouchableOpacity>
            </View>
        </View>
    );

    if (isLoading) {
        return (
            <LinearGradient colors={getGradientColors()} className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color={colors.primary} />
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={getGradientColors()} className="flex-1">
            <SafeAreaView className="flex-1">
                {/* Header */}
                <View className="flex-row items-center justify-between px-6 py-4">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full" style={{ backgroundColor: colors.card }}>
                        <ChevronLeft color={colors.text} size={24} />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold" style={{ color: colors.text }}>Bonding</Text>
                    <View className="w-10" />
                </View>

                {/* Profile Dropdown */}
                <TouchableOpacity
                    onPress={() => setShowProfileDropdown(true)}
                    className="mx-6 mb-4 p-4 rounded-2xl flex-row items-center justify-between"
                    style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
                >
                    {selectedProfile ? (
                        <View className="flex-row items-center flex-1">
                            <Image
                                source={{ uri: selectedProfile.avatar }}
                                className="w-10 h-10 rounded-full mr-3"
                            />
                            <Text className="text-base font-bold flex-1" numberOfLines={1} style={{ color: colors.text }}>
                                {selectedProfile.name}
                            </Text>
                        </View>
                    ) : (
                        <Text style={{ color: colors.secondary }}>Select a profile</Text>
                    )}
                    <ChevronDown color={colors.text} size={20} />
                </TouchableOpacity>

                {/* Stat Cards */}
                <View className="flex-row px-6 mb-4">
                    {renderStatCard('blacklist', <Frown size={20} color={activeLocker === 'blacklist' ? 'white' : '#ef4444'} />, 'Blacklisted')}
                    {renderStatCard('happy', <Smile size={20} color={activeLocker === 'happy' ? 'white' : '#22c55e'} />, 'Happy')}
                    {renderStatCard('fact', <BookOpen size={20} color={activeLocker === 'fact' ? 'white' : '#3b82f6'} />, 'Facts')}
                </View>

                {/* Content */}
                <ScrollView
                    className="flex-1 px-6"
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    {!selectedProfile ? (
                        <View className="items-center justify-center py-20">
                            <Text style={{ color: colors.secondary }}>Select a profile to view bonding data</Text>
                        </View>
                    ) : activeLocker === 'fact' ? (
                        <>
                            {facts.length === 0 ? (
                                <View className="items-center justify-center py-20">
                                    <BookOpen size={48} color={colors.secondary} />
                                    <Text className="mt-4 text-center" style={{ color: colors.secondary }}>
                                        No fact warnings yet.{'\n'}Add keywords to get reminders when messaging.
                                    </Text>
                                </View>
                            ) : (
                                facts.map(renderFactItem)
                            )}
                        </>
                    ) : (
                        <>
                            {tags.length === 0 ? (
                                <View className="items-center justify-center py-20">
                                    {activeLocker === 'blacklist' ? (
                                        <Frown size={48} color={colors.secondary} />
                                    ) : (
                                        <Smile size={48} color={colors.secondary} />
                                    )}
                                    <Text className="mt-4 text-center" style={{ color: colors.secondary }}>
                                        No tagged messages yet.{'\n'}Long-press messages in chat to tag them.
                                    </Text>
                                </View>
                            ) : (
                                tags.map(renderTagItem)
                            )}
                        </>
                    )}
                    <View className="h-20" />
                </ScrollView>

                {/* FAB for adding facts */}
                {activeLocker === 'fact' && selectedProfile && (
                    <TouchableOpacity
                        onPress={() => setShowAddFact(true)}
                        className="absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center shadow-lg"
                        style={{ backgroundColor: getLockerColor('fact') }}
                    >
                        <Plus size={24} color="white" />
                    </TouchableOpacity>
                )}

                {/* Profile Dropdown Modal */}
                <Modal visible={showProfileDropdown} transparent animationType="fade">
                    <TouchableOpacity
                        className="flex-1 bg-black/50"
                        activeOpacity={1}
                        onPress={() => setShowProfileDropdown(false)}
                    >
                        <View className="mt-32 mx-6">
                            <BlurView intensity={90} tint={mode === 'light' ? 'light' : 'dark'} className="rounded-2xl overflow-hidden">
                                <ScrollView style={{ maxHeight: 400 }}>
                                    {profiles.map((profile) => (
                                        <TouchableOpacity
                                            key={profile.id}
                                            onPress={() => {
                                                setSelectedProfile(profile);
                                                setShowProfileDropdown(false);
                                            }}
                                            className="flex-row items-center p-4 border-b"
                                            style={{ borderColor: colors.border }}
                                        >
                                            <Image source={{ uri: profile.avatar }} className="w-12 h-12 rounded-full mr-4" />
                                            <Text className="text-base font-semibold" style={{ color: colors.text }}>
                                                {profile.name}
                                            </Text>
                                            {selectedProfile?.id === profile.id && (
                                                <View className="ml-auto w-3 h-3 rounded-full" style={{ backgroundColor: colors.primary }} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                    {profiles.length === 0 && (
                                        <View className="p-8 items-center">
                                            <Text style={{ color: colors.secondary }}>No conversations yet</Text>
                                        </View>
                                    )}
                                </ScrollView>
                            </BlurView>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Add Fact Modal */}
                <Modal visible={showAddFact} transparent animationType="slide">
                    <View className="flex-1 justify-end bg-black/50">
                        <BlurView intensity={90} tint={mode === 'light' ? 'light' : 'dark'} className="rounded-t-3xl overflow-hidden">
                            <View className="p-6">
                                <View className="flex-row items-center justify-between mb-6">
                                    <Text className="text-xl font-bold" style={{ color: colors.text }}>Add Fact Warning</Text>
                                    <TouchableOpacity onPress={() => setShowAddFact(false)}>
                                        <X size={24} color={colors.text} />
                                    </TouchableOpacity>
                                </View>

                                <Text className="text-sm mb-2" style={{ color: colors.secondary }}>Keyword to detect</Text>
                                <TextInput
                                    value={newKeyword}
                                    onChangeText={setNewKeyword}
                                    placeholder="e.g., birthday, allergy, deadline"
                                    placeholderTextColor={colors.secondary}
                                    className="p-4 rounded-xl mb-4"
                                    style={{ backgroundColor: colors.card, color: colors.text, borderWidth: 1, borderColor: colors.border }}
                                />

                                <Text className="text-sm mb-2" style={{ color: colors.secondary }}>Warning message</Text>
                                <TextInput
                                    value={newWarningText}
                                    onChangeText={setNewWarningText}
                                    placeholder="e.g., Remember their birthday is Dec 15!"
                                    placeholderTextColor={colors.secondary}
                                    multiline
                                    numberOfLines={3}
                                    className="p-4 rounded-xl mb-6"
                                    style={{ backgroundColor: colors.card, color: colors.text, borderWidth: 1, borderColor: colors.border, minHeight: 80 }}
                                />

                                <TouchableOpacity
                                    onPress={addFactWarning}
                                    className="p-4 rounded-xl items-center"
                                    style={{ backgroundColor: getLockerColor('fact') }}
                                >
                                    <Text className="text-white font-bold text-base">Add Warning</Text>
                                </TouchableOpacity>
                            </View>
                        </BlurView>
                    </View>
                </Modal>
            </SafeAreaView>
        </LinearGradient>
    );
}
