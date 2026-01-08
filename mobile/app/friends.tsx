import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, TextInput, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, UserPlus, UserCheck, Clock, ChevronLeft, Users } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

interface Friend {
    id: string;
    name: string;
    displayName: string;
    avatarUrl: string;
    status: 'ACCEPTED' | 'PENDING' | 'NONE';
    mutualFriends?: number;
}

const DEMO_FRIENDS: Friend[] = Array.from({ length: 15 }).map((_, i) => ({
    id: `friend-${i}`,
    name: ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'Lucas'][i % 10],
    displayName: [`emma_x`, `liam.dev`, `olivia.art`, `noah_photo`, `ava.creates`, `ethan_m`, `sophia.d`, `mason_w`, `bella.i`, `lucas.g`][i % 10],
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/png?seed=friend${i}`,
    status: i < 5 ? 'ACCEPTED' : i < 8 ? 'PENDING' : 'NONE',
    mutualFriends: Math.floor(Math.random() * 20),
}));

export default function FriendsScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const [friends, setFriends] = useState<Friend[]>(DEMO_FRIENDS);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'requests'>('all');
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        fetchCurrentUser();
        fetchFriends();
    }, []);

    const fetchCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);
    };

    const fetchFriends = async () => {
        try {
            if (!currentUserId) return;

            const { data } = await supabase
                .from('Friendship')
                .select(`
                    friendId,
                    status,
                    friend:User!friendId(name, profile:Profile(displayName, avatarUrl))
                `)
                .eq('userId', currentUserId);

            if (data && data.length > 0) {
                const mapped: Friend[] = data.map((f: any) => ({
                    id: f.friendId,
                    name: f.friend?.name || 'Unknown',
                    displayName: f.friend?.profile?.displayName || 'user',
                    avatarUrl: f.friend?.profile?.avatarUrl || '',
                    status: f.status,
                }));
                setFriends(mapped);
            }
        } catch (e) {
            console.error('Friends fetch error:', e);
        } finally {
            setRefreshing(false);
        }
    };

    const filteredFriends = friends.filter(f => {
        const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.displayName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === 'all' ? f.status === 'ACCEPTED' : f.status === 'PENDING';
        return matchesSearch && matchesTab;
    });

    const handleAction = async (friend: Friend) => {
        if (friend.status === 'PENDING') {
            // Accept request
            await supabase.from('Friendship').update({ status: 'ACCEPTED' }).eq('friendId', friend.id).eq('userId', currentUserId);
            setFriends(prev => prev.map(f => f.id === friend.id ? { ...f, status: 'ACCEPTED' } : f));
        }
    };

    const renderFriendItem = ({ item }: { item: Friend }) => (
        <TouchableOpacity
            onPress={() => router.push(`/profile/${item.displayName}`)}
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
            <Image
                source={{ uri: item.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${item.name}` }}
                style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.secondary }}
            />
            <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{item.name}</Text>
                <Text style={{ fontSize: 13, color: colors.secondary }}>@{item.displayName}</Text>
                {item.mutualFriends && item.mutualFriends > 0 && (
                    <Text style={{ fontSize: 11, color: colors.secondary, marginTop: 2 }}>
                        {item.mutualFriends} mutual friends
                    </Text>
                )}
            </View>

            {item.status === 'ACCEPTED' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(74,222,128,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                    <UserCheck size={14} color="#4ade80" />
                    <Text style={{ color: '#4ade80', fontSize: 11, fontWeight: '700', marginLeft: 4 }}>Friends</Text>
                </View>
            ) : item.status === 'PENDING' ? (
                <TouchableOpacity
                    onPress={() => handleAction(item)}
                    style={{ backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }}
                >
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>Accept</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity style={{ backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }}>
                    <UserPlus size={16} color="white" />
                </TouchableOpacity>
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
                    <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>Friends</Text>
                </View>

                {/* Search */}
                <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border }}>
                        <Search color={colors.secondary} size={18} />
                        <TextInput
                            placeholder="Search friends..."
                            placeholderTextColor={colors.secondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            style={{ flex: 1, marginLeft: 10, fontSize: 15, color: colors.text }}
                        />
                    </View>
                </View>

                {/* Tabs */}
                <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 10 }}>
                    {(['all', 'requests'] as const).map(tab => (
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
                                {tab === 'all' ? 'All Friends' : 'Requests'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* List */}
                <FlatList
                    data={filteredFriends}
                    keyExtractor={item => item.id}
                    renderItem={renderFriendItem}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchFriends} tintColor={colors.text} />}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 60 }}>
                            <Users color={colors.secondary} size={48} />
                            <Text style={{ color: colors.secondary, fontSize: 16, marginTop: 12 }}>
                                {activeTab === 'requests' ? 'No pending requests' : 'No friends found'}
                            </Text>
                        </View>
                    }
                />
            </SafeAreaView>
        </View>
    );
}
