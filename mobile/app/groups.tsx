import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, TextInput, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, ChevronLeft, Search, Plus, Lock, Globe, UserPlus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

interface Group {
    id: string;
    name: string;
    description: string;
    coverImage: string;
    memberCount: number;
    isPrivate: boolean;
    isMember: boolean;
}

const DEMO_GROUPS: Group[] = Array.from({ length: 10 }).map((_, i) => ({
    id: `group-${i}`,
    name: ['Photography Club', 'Developers Hub', 'Fitness Warriors', 'Book Lovers', 'Music Makers', 'Travel Buddies'][i % 6],
    description: 'A community of passionate people sharing their interests and experiences.',
    coverImage: `https://picsum.photos/seed/group${i}/800/400`,
    memberCount: Math.floor(Math.random() * 5000) + 100,
    isPrivate: i % 3 === 0,
    isMember: i < 3,
}));

export default function GroupsScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const [groups, setGroups] = useState<Group[]>(DEMO_GROUPS);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'discover' | 'my'>('discover');

    const filteredGroups = groups.filter(g => {
        const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === 'my' ? g.isMember : true;
        return matchesSearch && matchesTab;
    });

    const formatCount = (num: number) => {
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const renderGroupItem = ({ item }: { item: Group }) => (
        <TouchableOpacity
            style={{
                backgroundColor: colors.card,
                borderRadius: 20,
                marginBottom: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: colors.border,
            }}
        >
            <Image
                source={{ uri: item.coverImage }}
                style={{ width: '100%', height: 120 }}
            />
            <View style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, flex: 1 }}>{item.name}</Text>
                    {item.isPrivate ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                            <Lock size={12} color={colors.secondary} />
                            <Text style={{ color: colors.secondary, fontSize: 10, marginLeft: 4 }}>Private</Text>
                        </View>
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(74,222,128,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                            <Globe size={12} color="#4ade80" />
                            <Text style={{ color: '#4ade80', fontSize: 10, marginLeft: 4 }}>Public</Text>
                        </View>
                    )}
                </View>
                <Text style={{ fontSize: 13, color: colors.secondary, marginBottom: 12 }} numberOfLines={2}>
                    {item.description}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Users size={14} color={colors.secondary} />
                        <Text style={{ color: colors.secondary, fontSize: 12 }}>{formatCount(item.memberCount)} members</Text>
                    </View>
                    {item.isMember ? (
                        <View style={{ backgroundColor: 'rgba(74,222,128,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 }}>
                            <Text style={{ color: '#4ade80', fontSize: 12, fontWeight: '700' }}>Joined</Text>
                        </View>
                    ) : (
                        <TouchableOpacity style={{ backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <UserPlus size={14} color="white" />
                            <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>Join</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
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
                    <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, flex: 1 }}>Groups</Text>
                    <TouchableOpacity style={{ padding: 8, backgroundColor: colors.primary, borderRadius: 12 }}>
                        <Plus color="white" size={20} />
                    </TouchableOpacity>
                </View>

                {/* Search */}
                <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border }}>
                        <Search color={colors.secondary} size={18} />
                        <TextInput
                            placeholder="Search groups..."
                            placeholderTextColor={colors.secondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            style={{ flex: 1, marginLeft: 10, fontSize: 15, color: colors.text }}
                        />
                    </View>
                </View>

                {/* Tabs */}
                <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 10 }}>
                    {(['discover', 'my'] as const).map(tab => (
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
                                {tab === 'discover' ? 'Discover' : 'My Groups'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Groups List */}
                <FlatList
                    data={filteredGroups}
                    keyExtractor={item => item.id}
                    renderItem={renderGroupItem}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                />
            </SafeAreaView>
        </View>
    );
}
