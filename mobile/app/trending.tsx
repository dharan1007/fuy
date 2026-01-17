import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, ChevronLeft, Flame, Slash, Music, Film, Book } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

interface TrendingItem {
    id: string;
    title: string;
    category: string;
    image: string;
    trendScore: number;
    postCount: number;
}

const CATEGORIES = [
    { id: 'all', label: 'All', icon: Flame },
    { id: 'music', label: 'Music', icon: Music },
    { id: 'video', label: 'Video', icon: Film },
    { id: 'topics', label: 'Topics', icon: Slash },
    { id: 'books', label: 'Books', icon: Book },
];

const DEMO_TRENDING: TrendingItem[] = Array.from({ length: 15 }).map((_, i) => ({
    id: `trend-${i}`,
    title: ['#SummerVibes', '#CodingLife', '#FitnessGoals', '#TravelDiaries', '#FoodieLife', '#ArtWorld'][i % 6],
    category: ['music', 'video', 'topics', 'books'][i % 4],
    image: `https://picsum.photos/seed/trend${i}/400/400`,
    trendScore: Math.floor(Math.random() * 100),
    postCount: Math.floor(Math.random() * 50000) + 1000,
}));

export default function TrendingScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const [trending, setTrending] = useState<TrendingItem[]>(DEMO_TRENDING);
    const [activeCategory, setActiveCategory] = useState('all');

    const filteredTrending = activeCategory === 'all'
        ? trending
        : trending.filter(t => t.category === activeCategory);

    const formatCount = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const renderTrendingItem = ({ item, index }: { item: TrendingItem; index: number }) => (
        <TouchableOpacity
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
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.secondary, width: 30 }}>
                {index + 1}
            </Text>
            <Image
                source={{ uri: item.image }}
                style={{ width: 56, height: 56, borderRadius: 12, marginRight: 14 }}
            />
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{item.title}</Text>
                <Text style={{ fontSize: 13, color: colors.secondary, marginTop: 2 }}>
                    {formatCount(item.postCount)} posts
                </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }}>
                <TrendingUp size={14} color="#ef4444" />
                <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '700', marginLeft: 4 }}>
                    +{item.trendScore}%
                </Text>
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
                    <Flame color="#ef4444" size={24} />
                    <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>Trending</Text>
                </View>

                {/* Categories */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}
                >
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat.id}
                            onPress={() => setActiveCategory(cat.id)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 16,
                                paddingVertical: 10,
                                borderRadius: 20,
                                backgroundColor: activeCategory === cat.id ? colors.text : colors.card,
                                borderWidth: 1,
                                borderColor: activeCategory === cat.id ? colors.text : colors.border,
                                gap: 6,
                            }}
                        >
                            <cat.icon size={16} color={activeCategory === cat.id ? colors.background : colors.text} />
                            <Text style={{ color: activeCategory === cat.id ? colors.background : colors.text, fontWeight: '600', fontSize: 13 }}>
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Trending List */}
                <FlatList
                    data={filteredTrending}
                    keyExtractor={item => item.id}
                    renderItem={renderTrendingItem}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                />
            </SafeAreaView>
        </View>
    );
}
