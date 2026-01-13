import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, TextInput, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, UserPlus, UserCheck, Clock, ChevronLeft, Users } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

interface UserItem {
    id: string;
    name: string;
    displayName: string;
    avatarUrl: string;
    type: 'follower' | 'following';
}

export default function FollowingScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const [users, setUsers] = useState<UserItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'followers' | 'following'>('following');
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    useEffect(() => {
        if (currentUserId) {
            fetchUsers();
        }
    }, [currentUserId, activeTab]);

    const fetchCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);
    };

    const fetchUsers = async () => {
        try {
            if (!currentUserId) return;
            setLoading(true);

            if (activeTab === 'following') {
                // People I follow (where I am userId and status is ACCEPTED)
                const { data } = await supabase
                    .from('Friendship')
                    .select(`
                        friendId,
                        status,
                        friend:friendId(id, name, profile:Profile(displayName, avatarUrl))
                    `)
                    .eq('userId', currentUserId)
                    .eq('status', 'ACCEPTED');

                if (data && data.length > 0) {
                    const mapped: UserItem[] = data.map((f: any) => ({
                        id: f.friendId,
                        name: f.friend?.name || 'Unknown',
                        displayName: f.friend?.profile?.displayName || 'user',
                        avatarUrl: f.friend?.profile?.avatarUrl || '',
                        type: 'following',
                    }));
                    setUsers(mapped);
                } else {
                    setUsers([]);
                }
            } else {
                // People following me (where I am friendId and status is ACCEPTED)
                const { data } = await supabase
                    .from('Friendship')
                    .select(`
                        userId,
                        status,
                        user:userId(id, name, profile:Profile(displayName, avatarUrl))
                    `)
                    .eq('friendId', currentUserId)
                    .eq('status', 'ACCEPTED');

                if (data && data.length > 0) {
                    const mapped: UserItem[] = data.map((f: any) => ({
                        id: f.userId,
                        name: f.user?.name || 'Unknown',
                        displayName: f.user?.profile?.displayName || 'user',
                        avatarUrl: f.user?.profile?.avatarUrl || '',
                        type: 'follower',
                    }));
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
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleUnfollow = async (userId: string) => {
        try {
            await supabase
                .from('Friendship')
                .delete()
                .eq('userId', currentUserId)
                .eq('friendId', userId);
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (e) {
            console.error('Unfollow error:', e);
        }
    };

    const renderUserItem = ({ item }: { item: UserItem }) => (
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
                borderColor: colors.border,
            }}
        >
            {item.avatarUrl ? (
                <Image
                    source={{ uri: item.avatarUrl }}
                    style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.secondary }}
                />
            ) : (
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{item.name.charAt(0)}</Text>
                </View>
            )}
            <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{item.name}</Text>
                <Text style={{ fontSize: 13, color: colors.secondary }}>@{item.displayName}</Text>
            </View>

            {activeTab === 'following' && (
                <TouchableOpacity
                    onPress={() => handleUnfollow(item.id)}
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }}
                >
                    <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>Unfollow</Text>
                </TouchableOpacity>
            )}
            {activeTab === 'followers' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(74,222,128,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                    <UserCheck size={14} color="#4ade80" />
                    <Text style={{ color: '#4ade80', fontSize: 11, fontWeight: '700', marginLeft: 4 }}>Follower</Text>
                </View>
            )}
        </TouchableOpacity>
    );

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
                    <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>Connections</Text>
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
                                paddingHorizontal: 20,
                                paddingVertical: 10,
                                borderRadius: 20,
                                backgroundColor: activeTab === tab ? colors.text : colors.card,
                            }}
                        >
                            <Text style={{ color: activeTab === tab ? colors.background : colors.text, fontWeight: '600', fontSize: 14 }}>
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
                        <View style={{ alignItems: 'center', marginTop: 60 }}>
                            <Users color={colors.secondary} size={48} />
                            <Text style={{ color: colors.secondary, fontSize: 16, marginTop: 12 }}>
                                {loading ? 'Loading...' : activeTab === 'followers' ? 'No followers yet' : 'Not following anyone'}
                            </Text>
                        </View>
                    }
                />
            </SafeAreaView>
        </View>
    );
}
