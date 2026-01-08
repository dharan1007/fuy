import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Tv, ChevronLeft, Play, Users, Bell, Settings } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

interface Channel {
    id: string;
    name: string;
    avatarUrl: string;
    subscriberCount: number;
    isSubscribed: boolean;
    latestVideo?: { title: string; thumbnail: string };
}

const DEMO: Channel[] = Array.from({ length: 8 }).map((_, i) => ({
    id: `ch-${i}`,
    name: ['Tech Hub', 'Music World', 'Art Studio', 'Travel Vibes', 'Fitness Pro'][i % 5],
    avatarUrl: `https://api.dicebear.com/7.x/shapes/png?seed=chan${i}`,
    subscriberCount: Math.floor(Math.random() * 100000) + 1000,
    isSubscribed: i < 3,
    latestVideo: { title: 'Latest Video Title', thumbnail: `https://picsum.photos/seed/chanvid${i}/400/225` }
}));

export default function ChannelScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const [channels] = useState<Channel[]>(DEMO);
    const [tab, setTab] = useState<'subscribed' | 'discover'>('subscribed');

    const filtered = tab === 'subscribed' ? channels.filter(c => c.isSubscribed) : channels;
    const formatCount = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n.toString();

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <LinearGradient colors={mode === 'light' ? ['#fff', '#f5f5f5'] : ['#000', '#0a0a0a']} style={{ position: 'absolute', inset: 0 }} />
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, backgroundColor: colors.card, borderRadius: 12 }}>
                        <ChevronLeft color={colors.text} size={22} />
                    </TouchableOpacity>
                    <Tv color={colors.text} size={24} />
                    <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>Channels</Text>
                </View>
                <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 10 }}>
                    {(['subscribed', 'discover'] as const).map(t => (
                        <TouchableOpacity key={t} onPress={() => setTab(t)} style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: tab === t ? colors.text : colors.card }}>
                            <Text style={{ color: tab === t ? colors.background : colors.text, fontWeight: '600' }}>{t === 'subscribed' ? 'Subscribed' : 'Discover'}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 16 }}
                    renderItem={({ item }) => (
                        <View style={{ backgroundColor: colors.card, borderRadius: 16, marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                            {item.latestVideo && <Image source={{ uri: item.latestVideo.thumbnail }} style={{ width: '100%', height: 140 }} />}
                            <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center' }}>
                                <Image source={{ uri: item.avatarUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={{ color: colors.text, fontWeight: '700' }}>{item.name}</Text>
                                    <Text style={{ color: colors.secondary, fontSize: 12 }}>{formatCount(item.subscriberCount)} subscribers</Text>
                                </View>
                                <TouchableOpacity style={{ backgroundColor: item.isSubscribed ? 'rgba(74,222,128,0.15)' : colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 }}>
                                    <Text style={{ color: item.isSubscribed ? '#4ade80' : 'white', fontWeight: '700', fontSize: 12 }}>{item.isSubscribed ? 'Subscribed' : 'Subscribe'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            </SafeAreaView>
        </View>
    );
}
