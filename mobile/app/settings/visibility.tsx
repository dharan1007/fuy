
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, FlatList, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Check, Users, Globe, Lock, UserPlus, Search, X } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase'; // Using supabase directly for simple queries, or fetch for APIs

// Privacy Options
const PRIVACY_OPTIONS = [
    { value: 'PUBLIC', label: 'Public', icon: Globe, description: 'Everyone on FUY can see this' },
    { value: 'FOLLOWERS', label: 'Followers Only', icon: Users, description: 'Only your followers can see this' },
    { value: 'SELECTED', label: 'Selected Users', icon: UserPlus, description: 'Only specific people you choose' },
    { value: 'PRIVATE', label: 'Only Me', icon: Lock, description: 'Visible only to you' }
];

export default function VisibilitySettingsScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { session } = useAuth();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState({
        defaultPostPrivacy: 'PUBLIC',
        profileCardPrivacy: 'PUBLIC',
        stalkMePrivacy: 'PUBLIC'
    });

    // Modal State for "Selected Users"
    const [showUserSelector, setShowUserSelector] = useState(false);
    const [activeFeature, setActiveFeature] = useState<string | null>(null); // POSTS | CARD | STALK_ME
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<any[]>([]); // Current allowlist
    const [searchLoading, setSearchLoading] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            // Let's use direct Supabase as it's often faster for read in mobile if RLS allows,
            // BUT we created an API route. Let's stick to the pattern of using the API if we were in web,
            // but mobile often uses Supabase client.
            // HOWEVER, we just added fields to the schema.
            // Let's us Supabase client for reading if RLS is set up, otherwise fetch API.
            if (!session?.user) return;

            const { data, error } = await supabase
                .from('User')
                .select('defaultPostVisibility, profileCardPrivacy, stalkMePrivacy')
                .eq('id', session.user.id)
                .single();

            if (data) {
                setSettings({
                    defaultPostPrivacy: data.defaultPostVisibility || 'PUBLIC',
                    profileCardPrivacy: data.profileCardPrivacy || 'PUBLIC',
                    stalkMePrivacy: data.stalkMePrivacy || 'PUBLIC'
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async (key: string, value: string) => {
        // Optimistic update
        setSettings(prev => ({ ...prev, [key]: value }));

        try {
            const updates: any = {};
            if (key === 'defaultPostPrivacy') updates.defaultPostVisibility = value;
            if (key === 'profileCardPrivacy') updates.profileCardPrivacy = value;
            if (key === 'stalkMePrivacy') updates.stalkMePrivacy = value;

            const { error } = await supabase
                .from('User')
                .update(updates)
                .eq('id', session?.user?.id);

            if (error) throw error;

            if (value === 'SELECTED') {
                // Open selector
                const feature = key === 'defaultPostPrivacy' ? 'POSTS'
                    : key === 'profileCardPrivacy' ? 'CARD'
                        : 'STALK_ME';
                openUserSelector(feature);
            }

        } catch (e) {
            console.error(e);
            showToast('Failed to update setting', 'error');
            // Revert would go here
        }
    };

    const openUserSelector = async (feature: string) => {
        setActiveFeature(feature);
        setShowUserSelector(true);
        loadAllowlist(feature);
    };

    const loadAllowlist = async (feature: string) => {
        // Fetch users in allowlist
        try {
            // Ideally use the API we made: GET /api/settings/privacy/allowlist?feature=...
            // Or raw query:
            const { data } = await supabase
                .from('PrivacyAllowlist')
                .select(`
                    viewer:viewerId (id, name, profile:Profile(displayName, avatarUrl))
                `)
                .eq('ownerId', session?.user?.id)
                .eq('feature', feature);

            if (data) {
                const users = data.map((d: any) => d.viewer).filter(Boolean);
                setSelectedUsers(users);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const searchUsers = async (text: string) => {
        setSearchQuery(text);
        if (text.length < 2) {
            setSearchResults([]);
            return;
        }
        setSearchLoading(true);
        try {
            // Simple search via Supabase
            const { data } = await supabase
                .from('User')
                .select('id, name, profileCode, profile:Profile(displayName, avatarUrl)')
                .ilike('name', `%${text}%`) // Simple name match
                .limit(10);

            setSearchResults(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setSearchLoading(false);
        }
    };

    const toggleUserInAllowlist = async (user: any) => {
        if (!activeFeature || !session?.user) return;
        const exists = selectedUsers.find(u => u.id === user.id);

        // Optimistic
        if (exists) {
            setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
        } else {
            setSelectedUsers(prev => [...prev, user]);
        }

        try {
            if (exists) {
                // Remove
                await supabase.from('PrivacyAllowlist').delete().match({
                    ownerId: session.user.id,
                    viewerId: user.id,
                    feature: activeFeature
                });
            } else {
                // Add
                await supabase.from('PrivacyAllowlist').insert({
                    ownerId: session.user.id,
                    viewerId: user.id,
                    feature: activeFeature
                });
            }
        } catch (error) {
            console.error(error);
            showToast('Failed to update list', 'error');
        }
    };

    const renderOption = (currentValue: string, optionKey: string, title: string) => (
        <View className="mb-6">
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 12, paddingHorizontal: 16 }}>{title}</Text>
            <View style={{ backgroundColor: colors.card, marginHorizontal: 16, borderRadius: 16, overflow: 'hidden' }}>
                {PRIVACY_OPTIONS.map((opt, index) => (
                    <TouchableOpacity
                        key={opt.value}
                        onPress={() => updateSetting(optionKey, opt.value)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 16,
                            borderBottomWidth: index < PRIVACY_OPTIONS.length - 1 ? 1 : 0,
                            borderBottomColor: colors.border
                        }}
                    >
                        <View style={{ width: 40, alignItems: 'center' }}>
                            <opt.icon size={20} color={colors.secondary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '500' }}>{opt.label}</Text>
                            <Text style={{ color: colors.secondary, fontSize: 12 }}>{opt.description}</Text>
                        </View>
                        {currentValue === opt.value && (
                            <View style={{ backgroundColor: colors.primary, borderRadius: 10, padding: 4 }}>
                                <Check size={14} color="white" />
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>
            {currentValue === 'SELECTED' && (
                <TouchableOpacity
                    onPress={() => openUserSelector(
                        optionKey === 'defaultPostPrivacy' ? 'POSTS' :
                            optionKey === 'profileCardPrivacy' ? 'CARD' : 'STALK_ME'
                    )}
                    style={{ marginHorizontal: 16, marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}
                >
                    <Text style={{ color: colors.primary, fontWeight: '600' }}>Manage List</Text>
                    <ChevronLeft size={16} color={colors.primary} style={{ transform: [{ rotate: '180deg' }] }} />
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SafeAreaView edges={['top']} style={{ flex: 0, backgroundColor: colors.background }} />

            {/* Header */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, borderRadius: 20, backgroundColor: colors.card, marginRight: 12 }}>
                    <ChevronLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>Visibility & Preferences</Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={{ height: 20 }} />
                {renderOption(settings.defaultPostPrivacy, 'defaultPostPrivacy', 'Default Post Visibility')}
                {renderOption(settings.profileCardPrivacy, 'profileCardPrivacy', 'Profile Card Visibility')}
                {renderOption(settings.stalkMePrivacy, 'stalkMePrivacy', '"Stalk Me" Section')}

                <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: colors.secondary, textAlign: 'center', fontSize: 13 }}>
                        Changes apply immediately. Posts you've already created will keep their existing settings unless you edit them individually.
                    </Text>
                </View>
            </ScrollView>

            {/* User Selector Modal */}
            <Modal
                visible={showUserSelector}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowUserSelector(false)}
            >
                <View style={{ flex: 1, backgroundColor: colors.background }}>
                    <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, flex: 1 }}>Selected Users</Text>
                        <TouchableOpacity onPress={() => setShowUserSelector(false)} style={{ padding: 8 }}>
                            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>Done</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 12, height: 44 }}>
                            <Search size={20} color={colors.secondary} />
                            <TextInput
                                style={{ flex: 1, marginLeft: 8, color: colors.text, fontSize: 16 }}
                                placeholder="Search by name or code..."
                                placeholderTextColor={colors.secondary}
                                value={searchQuery}
                                onChangeText={searchUsers}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => searchUsers('')}>
                                    <X size={16} color={colors.secondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <ScrollView style={{ flex: 1 }}>
                        {/* Selected List (if no search) */}
                        {!searchQuery && selectedUsers.length > 0 && (
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ paddingHorizontal: 16, marginBottom: 8, color: colors.secondary, fontWeight: '600' }}>ALREADY SELECTED ({selectedUsers.length})</Text>
                                {selectedUsers.map(u => (
                                    <TouchableOpacity
                                        key={u.id}
                                        onPress={() => toggleUserInAllowlist(u)}
                                        style={{ flexDirection: 'row', alignItems: 'center', padding: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}
                                    >
                                        <Image source={{ uri: u.profile?.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card }} />
                                        <View style={{ marginLeft: 12, flex: 1 }}>
                                            <Text style={{ color: colors.text, fontWeight: '600' }}>{u.profile?.displayName || u.name}</Text>
                                        </View>
                                        <Check size={20} color={colors.primary} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Search Results */}
                        {searchQuery.length > 0 && (
                            <View>
                                <Text style={{ paddingHorizontal: 16, marginBottom: 8, color: colors.secondary, fontWeight: '600' }}>SEARCH RESULTS</Text>
                                {searchLoading ? (
                                    <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
                                ) : (
                                    searchResults.map(u => {
                                        const isSelected = selectedUsers.some(sel => sel.id === u.id);
                                        return (
                                            <TouchableOpacity
                                                key={u.id}
                                                onPress={() => toggleUserInAllowlist(u)}
                                                style={{ flexDirection: 'row', alignItems: 'center', padding: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}
                                            >
                                                <Image source={{ uri: u.profile?.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card }} />
                                                <View style={{ marginLeft: 12, flex: 1 }}>
                                                    <Text style={{ color: colors.text, fontWeight: '600' }}>{u.profile?.displayName || u.name}</Text>
                                                    <Text style={{ color: colors.secondary, fontSize: 12 }}>#{u.profileCode || '0000000'}</Text>
                                                </View>
                                                <View style={{
                                                    width: 24, height: 24, borderRadius: 12,
                                                    borderWidth: 2, borderColor: isSelected ? colors.primary : colors.secondary,
                                                    alignItems: 'center', justifyContent: 'center',
                                                    backgroundColor: isSelected ? colors.primary : 'transparent'
                                                }}>
                                                    {isSelected && <Check size={14} color="white" />}
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })
                                )}
                            </View>
                        )}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}
