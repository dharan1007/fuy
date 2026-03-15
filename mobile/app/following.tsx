import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, TextInput, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, UserPlus, UserCheck, ChevronLeft, Users } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

interface UserItem {
    id: string;
    name: string;
    displayName: string;
    avatarUrl: string;
    type: 'follower' | 'following';
    isFollowingMe?: boolean; // Do I follow them? (for viewing others' lists)
}

export default function FollowingScreen() {
    const router = useRouter();
    const { userId, initialTab } = useLocalSearchParams();
    const { colors, mode } = useTheme();
    const [users, setUsers] = useState<UserItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'followers' | 'following'>((initialTab as 'followers' | 'following') || 'following');
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [myFollows, setMyFollows] = useState<Set<string>>(new Set());

    // If userId param is provided, view that user. Otherwise view current user.
    // If we haven't loaded current user yet, we wait.

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    useEffect(() => {
        if (currentUserId) {
            fetchUsers();
            // If viewing someone else, we need to know who *I* follow to show correct buttons
            if (userId && userId !== currentUserId) {
                fetchMyFollows();
            }
        }
    }, [currentUserId, activeTab, userId]);

    const fetchCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);
    };

    const fetchMyFollows = async () => {
        if (!currentUserId) return;
        const { data } = await supabase
            .from('Subscription')
            .select('subscribedToId')
            .eq('subscriberId', currentUserId);

        if (data) {
            setMyFollows(new Set(data.map(item => item.subscribedToId)));
        }
    };

    const fetchUsers = async () => {
        try {
            if (!currentUserId) return;
            setLoading(true);

            // Determine which profile to examine
            const targetId = (userId as string) || currentUserId;

            if (activeTab === 'following') {
                // People target follows
                const { data } = await supabase
                    .from('Subscription')
                    .select(`
                        subscribedToId,
                        subscribedTo:subscribedToId (
                            id,
                            name,
                            profile:Profile(displayName, avatarUrl)
                        )
                    `)
                    .eq('subscriberId', targetId);

                if (data && data.length > 0) {
                    const mapped: UserItem[] = data.map((item: any) => {
                        const user = item.subscribedTo;
                        const profile = Array.isArray(user?.profile) ? user.profile[0] : user?.profile;
                        const odId = user?.id || item.subscribedToId;
                        return {
                            id: odId,
                            name: user?.name || ('user_' + odId.slice(-6)),
                            displayName: profile?.displayName || ('user_' + odId.slice(-6)),
                            avatarUrl: profile?.avatarUrl || '',
                            type: 'following',
                        };
                    });
                    setUsers(mapped);
                } else {
                    setUsers([]);
                }
            } else {
                // People following target
                const { data } = await supabase
                    .from('Subscription')
                    .select(`
                        subscriberId,
                        subscriber:subscriberId (
                            id,
                            name,
                            profile:Profile(displayName, avatarUrl)
                        )
                    `)
                    .eq('subscribedToId', targetId);

                if (data && data.length > 0) {
                    const mapped: UserItem[] = data.map((item: any) => {
                        const user = item.subscriber;
                        const profile = Array.isArray(user?.profile) ? user.profile[0] : user?.profile;
                        const odId = user?.id || item.subscriberId;
                        return {
                            id: odId,
                            name: user?.name || ('user_' + odId.slice(-6)),
                            displayName: profile?.displayName || ('user_' + odId.slice(-6)),
                            avatarUrl: profile?.avatarUrl || '',
                            type: 'follower',
                        };
                    });
                    setUsers(mapped);
                } else {
                    setUsers([]);
                }
            }
        } catch (e) {
            console.error('Fetch error:', e);
            setUsers([]);
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAction = async (targetUser: UserItem) => {
        // If viewing my own profile:
        // - "Following" tab -> Unfollow action
        // - "Followers" tab -> Remove action (maybe?) or just View (for now just View/None)

        // If viewing someone else's profile:
        // - Toggle Follow/Unfollow for that user based on myFollows

        const isMe = !userId || userId === currentUserId;

        try {
            if (isMe) {
                if (activeTab === 'following') {
                    // Unfollow
                    await supabase
                        .from('Subscription')
                        .delete()
                        .eq('subscriberId', currentUserId)
                        .eq('subscribedToId', targetUser.id);

                    setUsers(prev => prev.filter(u => u.id !== targetUser.id));
                    setMyFollows(prev => {
                        const next = new Set(prev);
                        next.delete(targetUser.id);
                        return next;
                    });
                }
            } else {
                // Toggle Follow
                const isFollowing = myFollows.has(targetUser.id);

                if (isFollowing) {
                    await supabase
                        .from('Subscription')
                        .delete()
                        .eq('subscriberId', currentUserId)
                        .eq('subscribedToId', targetUser.id);

                    setMyFollows(prev => {
                        const next = new Set(prev);
                        next.delete(targetUser.id);
                        return next;
                    });
                } else {
                    await supabase
                        .from('Subscription')
                        .insert({
                            subscriberId: currentUserId,
                            subscribedToId: targetUser.id
                        });

                    setMyFollows(prev => {
                        const next = new Set(prev);
                        next.add(targetUser.id);
                        return next;
                    });
                }
            }
        } catch (e) {
            console.error('Action error:', e);
        }
    };

    const renderUserItem = ({ item }: { item: UserItem }) => {
        const isMe = !userId || userId === currentUserId;
        // Logic for button state
        let showButton = false;
        let buttonText = '';
        let buttonStyle = {};
        let textStyle = {};

        if (isMe) {
            if (activeTab === 'following') {
                showButton = true;
                buttonText = 'Unfollow';
                buttonStyle = { backgroundColor: 'gba(255, 59, 48, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 59, 48, 0.3)' };
                textStyle = { color: '#ff3b30' };
            }
            // For followers tab on my profile, maybe "Remove"? For now nothing/just view
        } else {
            // Viewing someone else's list - show MY relationship to these users
            showButton = true;
            if (item.id === currentUserId) {
                showButton = false; // It's me
            } else {
                const isFollowing = myFollows.has(item.id);
                buttonText = isFollowing ? 'Following' : 'Follow';
                buttonStyle = isFollowing
                    ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border }
                    : { backgroundColor: '#fff' }; // Primary action
                textStyle = isFollowing
                    ? { color: colors.text }
                    : { color: '#000' };
            }
        }

        return (
            <TouchableOpacity
                onPress={() => router.push(`/profile/${item.id}` as any)}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    backgroundColor: colors.card,
                    borderRadius: 16,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.08)',
                }}
            >
                {item.avatarUrl ? (
                    <Image
                        source={{ uri: item.avatarUrl }}
                        style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.secondary }}
                    />
                ) : (
                    <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{item.name?.charAt(0) || '?'}</Text>
                    </View>
                )}
                <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 }}>{item.displayName || item.name}</Text>
                    <Text style={{ fontSize: 13, color: colors.secondary }}>@{item.name}</Text>
                </View>

                {showButton && (
                    <TouchableOpacity
                        onPress={() => handleAction(item)}
                        style={[{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, minWidth: 90, alignItems: 'center' }, buttonStyle]}
                    >
                        <Text style={[{ fontSize: 13, fontWeight: '700' }, textStyle]}>{buttonText}</Text>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <LinearGradient
                colors={mode === 'light' ? ['#fff', '#f5f5f5'] : ['#000', '#0a0a0a']}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, backgroundColor: colors.card, borderRadius: 12 }}>
                        <ChevronLeft color={colors.text} size={22} />
                    </TouchableOpacity>
                    <Users color={colors.text} size={24} />
                    <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Connections</Text>
                </View>

                {/* Search */}
                <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border }}>
                        <Search color={colors.secondary} size={18} />
                        <TextInput
                            placeholder="Search..."
                            placeholderTextColor={colors.secondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            style={{ flex: 1, marginLeft: 10, fontSize: 15, color: colors.text }}
                        />
                    </View>
                </View>

                {/* Tabs */}
                <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 10 }}>
                    {(['following', 'followers'] as const).map(tab => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            style={{
                                flex: 1,
                                paddingVertical: 12,
                                borderRadius: 12,
                                backgroundColor: activeTab === tab ? colors.text : 'transparent',
                                borderWidth: 1,
                                borderColor: activeTab === tab ? colors.text : colors.border,
                                alignItems: 'center'
                            }}
                        >
                            <Text style={{ color: activeTab === tab ? colors.background : colors.text, fontWeight: '700', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
                                {tab === 'following' ? 'Following' : 'Followers'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* List */}
                <FlatList
                    data={filteredUsers}
                    keyExtractor={item => item.id}
                    renderItem={renderUserItem}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchUsers} tintColor={colors.text} />}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 60, opacity: 0.5 }}>
                            <Users color={colors.secondary} size={48} />
                            <Text style={{ color: colors.secondary, fontSize: 14, marginTop: 16, fontWeight: '600' }}>
                                {loading ? 'LOADING...' : activeTab === 'followers' ? 'NO FOLLOWERS YET' : 'NOT FOLLOWING ANYONE'}
                            </Text>
                        </View>
                    }
                />
            </SafeAreaView>
        </View>
    );
}
