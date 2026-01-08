import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Activity, ChevronLeft, Heart, MessageCircle, UserPlus, Clock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

interface ActivityItem {
    id: string;
    type: 'like' | 'comment' | 'follow';
    user: { name: string; avatarUrl: string };
    timestamp: string;
}

const DEMO: ActivityItem[] = Array.from({ length: 15 }).map((_, i) => ({
    id: `a-${i}`,
    type: (['like', 'comment', 'follow'] as const)[i % 3],
    user: { name: ['Alex', 'Sam', 'Jordan'][i % 3], avatarUrl: `https://api.dicebear.com/7.x/avataaars/png?seed=act${i}` },
    timestamp: ['Just now', '5m ago', '1h ago'][i % 3],
}));

export default function ActivityScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const [activities] = useState<ActivityItem[]>(DEMO);

    const getIcon = (type: string) => {
        if (type === 'like') return <Heart size={16} color="#ef4444" fill="#ef4444" />;
        if (type === 'comment') return <MessageCircle size={16} color="#3b82f6" />;
        return <UserPlus size={16} color="#10b981" />;
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <LinearGradient colors={mode === 'light' ? ['#fff', '#f5f5f5'] : ['#000', '#0a0a0a']} style={{ position: 'absolute', inset: 0 }} />
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, backgroundColor: colors.card, borderRadius: 12 }}>
                        <ChevronLeft color={colors.text} size={22} />
                    </TouchableOpacity>
                    <Activity color={colors.text} size={24} />
                    <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>Activity</Text>
                </View>
                <FlatList
                    data={activities}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 16 }}
                    renderItem={({ item }) => (
                        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: colors.card, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border }}>
                            <Image source={{ uri: item.user.avatarUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={{ color: colors.text, fontWeight: '600' }}>{item.user.name} {item.type === 'like' ? 'liked your post' : item.type === 'comment' ? 'commented' : 'followed you'}</Text>
                                <Text style={{ color: colors.secondary, fontSize: 11, marginTop: 2 }}>{item.timestamp}</Text>
                            </View>
                            {getIcon(item.type)}
                        </View>
                    )}
                />
            </SafeAreaView>
        </View>
    );
}
