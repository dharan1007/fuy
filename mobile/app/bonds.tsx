import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, ChevronLeft, Users, Sparkles, MessageCircle, Bell, Clock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

interface Bond {
    id: string;
    user: { name: string; avatarUrl: string };
    bondType: 'close' | 'regular' | 'new';
    lastInteraction: string;
    mutualInterests: string[];
    connectionScore: number;
}

const DEMO_BONDS: Bond[] = Array.from({ length: 12 }).map((_, i) => ({
    id: `bond-${i}`,
    user: {
        name: ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Mason'][i % 6],
        avatarUrl: '',
    },
    bondType: i < 3 ? 'close' : i < 7 ? 'regular' : 'new',
    lastInteraction: ['Just now', '2h ago', '1d ago', '3d ago', '1w ago'][i % 5],
    mutualInterests: ['Music', 'Travel', 'Photography', 'Coding', 'Art'].slice(0, 2 + (i % 3)),
    connectionScore: Math.floor(Math.random() * 50) + 50,
}));

export default function BondsScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const [bonds, setBonds] = useState<Bond[]>(DEMO_BONDS);
    const [activeTab, setActiveTab] = useState<'all' | 'close' | 'new'>('all');

    const filteredBonds = activeTab === 'all'
        ? bonds
        : bonds.filter(b => b.bondType === activeTab);

    const getBondColor = (type: string) => {
        if (type === 'close') return '#ef4444';
        if (type === 'new') return '#3b82f6';
        return '#f59e0b';
    };

    const renderBondItem = ({ item }: { item: Bond }) => (
        <TouchableOpacity
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                backgroundColor: colors.card,
                borderRadius: 20,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: colors.border,
            }}
        >
            <View style={{ position: 'relative' }}>
                <Image
                    source={{ uri: item.user.avatarUrl }}
                    style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderColor: getBondColor(item.bondType) }}
                />
                <View style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: getBondColor(item.bondType), borderRadius: 10, padding: 4 }}>
                    <Heart size={10} color="white" fill="white" />
                </View>
            </View>

            <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{item.user.name}</Text>
                    {item.bondType === 'close' && (
                        <View style={{ backgroundColor: 'rgba(239,68,68,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                            <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '700' }}>Close</Text>
                        </View>
                    )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Clock size={12} color={colors.secondary} />
                    <Text style={{ color: colors.secondary, fontSize: 12 }}>{item.lastInteraction}</Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {item.mutualInterests.slice(0, 3).map((interest, i) => (
                        <View key={i} style={{ backgroundColor: `${colors.primary}20`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                            <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '600' }}>{interest}</Text>
                        </View>
                    ))}
                </View>
            </View>

            <View style={{ alignItems: 'center', gap: 8 }}>
                <View style={{ backgroundColor: `${getBondColor(item.bondType)}20`, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}>
                    <Text style={{ color: getBondColor(item.bondType), fontSize: 16, fontWeight: '800' }}>{item.connectionScore}</Text>
                </View>
                <TouchableOpacity>
                    <MessageCircle size={20} color={colors.secondary} />
                </TouchableOpacity>
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
                    <Heart color="#ef4444" size={24} />
                    <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>Bonds</Text>
                </View>

                {/* Tabs */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}
                >
                    {(['all', 'close', 'new'] as const).map(tab => (
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
                                {tab === 'all' ? 'All Bonds' : tab === 'close' ? 'Close Friends' : 'New Connections'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Bonds List */}
                <FlatList
                    data={filteredBonds}
                    keyExtractor={item => item.id}
                    renderItem={renderBondItem}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                />
            </SafeAreaView>
        </View>
    );
}
