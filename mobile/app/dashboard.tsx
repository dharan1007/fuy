import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, Image, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Book, Wind, MessageSquare, ShoppingBag, Anchor, Heart, Timer, ChevronLeft, LayoutDashboard, ArrowRight, BarChart2, TrendingUp, Clock, Package, CreditCard, Tv, GraduationCap, Eye } from 'lucide-react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

const { width } = Dimensions.get('window');

// Features Config - Matching Web Dashboard
const features = [
    { id: 'overview', title: 'Overview', icon: LayoutDashboard, color: '#64748b', route: null },
    { id: 'analytics', title: 'Analytics', icon: BarChart2, color: '#3b82f6', route: null },
    { id: 'journal', title: 'Journal', icon: Book, color: '#8b5cf6', route: '/journal' },
    { id: 'channel', title: 'Channel', icon: Tv, color: '#ec4899', route: null },
    { id: 'store', title: 'Store', icon: ShoppingBag, color: '#f59e0b', route: '/store' },
    { id: 'orders', title: 'Orders', icon: Package, color: '#10b981', route: null },
    { id: 'transactions', title: 'Transactions', icon: CreditCard, color: '#6366f1', route: null },
    { id: 'courses', title: 'Courses', icon: GraduationCap, color: '#14b8a6', route: null },
    { id: 'views', title: 'Views', icon: Eye, color: '#f97316', route: null },
    { id: 'wrex', title: 'WREX', icon: Anchor, color: '#a855f7', route: '/grounding' },
    { id: 'pomodoro', title: 'Pomodoro', icon: Timer, color: '#d97706', route: '/pomodoro' }
];

export default function DashboardScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollRef = useRef<ScrollView>(null);
    const iconScrollRef = useRef<ScrollView>(null);

    // Sync Horizontal Scroll with Active Tab
    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        const index = event.nativeEvent.contentOffset.x / slideSize;
        const roundIndex = Math.round(index);
        if (roundIndex !== activeIndex) {
            setActiveIndex(roundIndex);
            // Auto scroll icon bar
            iconScrollRef.current?.scrollTo({ x: roundIndex * 70 - (width / 2) + 35, animated: true });
        }
    };

    const navigateToPage = (index: number) => {
        scrollRef.current?.scrollTo({ x: index * width, animated: true });
        setActiveIndex(index);
    };

    // --- SUB COMPONENTS ---

    // 1. Icon Bar
    const renderIconBar = () => (
        <View>
            <ScrollView
                ref={iconScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}
            >
                {features.map((feature, index) => {
                    const isActive = activeIndex === index;
                    return (
                        <TouchableOpacity
                            key={feature.id}
                            onPress={() => navigateToPage(index)}
                            className="items-center justify-center p-3 rounded-2xl"
                            style={{
                                backgroundColor: isActive ? feature.color : (mode === 'light' ? '#f1f5f9' : '#1e293b'),
                                minWidth: 60
                            }}
                        >
                            <feature.icon size={24} color={isActive ? 'white' : colors.secondary} />
                            <Text
                                className="text-[10px] mt-1 font-bold"
                                style={{ color: isActive ? 'white' : colors.secondary }}
                            >
                                {feature.title}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );

    // 2. Overview Page Components
    const renderActivityChart = () => (
        <BlurView intensity={20} tint={mode === 'light' ? 'light' : 'dark'} className="p-5 rounded-3xl mb-6 overflow-hidden border" style={{ borderColor: colors.border, backgroundColor: colors.card }}>
            <View className="flex-row justify-between mb-4">
                <View>
                    <Text className="text-secondary font-bold text-xs uppercase" style={{ color: colors.secondary }}>Weekly Activity</Text>
                    <Text className="text-2xl font-bold" style={{ color: colors.text }}>42.5 hrs</Text>
                </View>
                <TrendingUp color="#10b981" />
            </View>
            <View className="flex-row justify-between items-end h-32 pt-4">
                {[40, 65, 30, 80, 55, 90, 45].map((h, i) => (
                    <View key={i} className="items-center gap-2">
                        {/* Simple Bar using View */}
                        <View className="w-8 rounded-full" style={{ height: `${h}%`, backgroundColor: i === 5 ? colors.primary : (mode === 'light' ? '#cbd5e1' : '#334155') }} />
                        <Text style={{ color: colors.secondary, fontSize: 10 }}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'][i]}</Text>
                    </View>
                ))}
            </View>
        </BlurView>
    );

    const renderPieChart = () => (
        <BlurView intensity={20} tint={mode === 'light' ? 'light' : 'dark'} className="p-5 rounded-3xl mb-6 overflow-hidden border flex-row gap-6" style={{ borderColor: colors.border, backgroundColor: colors.card }}>
            {/* Mock Pie Chart (SVG Circles can be used here or just a list) */}
            <View className="items-center justify-center">
                <Svg height="100" width="100" viewBox="0 0 100 100">
                    <Circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="10" fill="transparent" opacity={0.2} />
                    <Circle cx="50" cy="50" r="40" stroke="#8b5cf6" strokeWidth="10" strokeDasharray="251.2" strokeDashoffset="60" strokeLinecap="round" fill="transparent" origin="50, 50" rotation="-90" />
                    {/* Add more segments if needed */}
                </Svg>
                <View className="absolute items-center">
                    <Text className="font-bold text-xl" style={{ color: colors.text }}>76%</Text>
                </View>
            </View>
            <View className="flex-1 justify-center gap-3">
                <Text className="font-bold text-base" style={{ color: colors.text }}>Time Distribution</Text>
                <View className="gap-2">
                    <View className="flex-row items-center gap-2">
                        <View className="w-3 h-3 rounded-full bg-violet-500" />
                        <Text style={{ color: colors.secondary }}>Journaling (45%)</Text>
                    </View>

                </View>
            </View>
        </BlurView>
    );

    const renderRecommendations = () => (
        <View className="mb-6">
            <Text className="text-lg font-bold mb-3" style={{ color: colors.text }}>Recommended for You</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-4">
                {[1, 2, 3].map(i => (
                    <TouchableOpacity key={i} className="w-40 mr-4">
                        <Image source={{ uri: `https://source.unsplash.com/random/200x200?sig=${i}` }} className="w-40 h-40 rounded-2xl mb-2" />
                        <Text className="font-bold text-sm" numberOfLines={1} style={{ color: colors.text }}>Calm & Focus Pack</Text>
                        <Text className="text-xs" style={{ color: colors.secondary }}>Start your journey</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    // 3. Feature Analysis Page Template
    const renderFeaturePage = (feature: typeof features[0]) => (
        <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
            <Text className="text-3xl font-bold mb-1" style={{ color: colors.text }}>{feature.title} Analysis</Text>
            <Text className="text-base mb-6" style={{ color: colors.secondary }}>Your personal insights</Text>

            {/* Main Stats Card */}
            <View className="p-6 rounded-3xl mb-6 relative overflow-hidden" style={{ backgroundColor: feature.color }}>
                <View className="absolute right-[-20] top-[-20] opacity-20">
                    <feature.icon size={150} color="white" />
                </View>
                <Text className="text-white/70 text-sm font-bold uppercase mb-2">Total Time</Text>
                <Text className="text-white text-4xl font-bold mb-4">12h 30m</Text>
                <View className="flex-row gap-4">
                    <View className="bg-white/20 p-2 rounded-lg">
                        <Text className="text-white font-bold text-xs">Sessions: 42</Text>
                    </View>
                    <View className="bg-white/20 p-2 rounded-lg">
                        <Text className="text-white font-bold text-xs">Streak: 5 Days</Text>
                    </View>
                </View>
            </View>

            {/* History List */}
            <Text className="text-lg font-bold mb-4" style={{ color: colors.text }}>Recent History</Text>
            {[1, 2, 3, 4, 5].map(i => (
                <View key={i} className="flex-row items-center p-4 mb-3 rounded-2xl border" style={{ borderColor: colors.border, backgroundColor: colors.card }}>
                    <View className="p-3 rounded-full mr-4" style={{ backgroundColor: `${feature.color}20` }}>
                        <Clock size={20} color={feature.color} />
                    </View>
                    <View className="flex-1">
                        <Text className="font-bold text-base" style={{ color: colors.text }}>Session #{i}</Text>
                        <Text className="text-xs" style={{ color: colors.secondary }}>Today, 2:30 PM</Text>
                    </View>
                    <Text className="font-bold text-sm" style={{ color: colors.text }}>25m</Text>
                </View>
            ))}

            {/* Action Button */}
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => feature.route && router.push(feature.route as any)}
                className="mt-4 mb-10 py-4 rounded-2xl items-center flex-row justify-center gap-2"
                style={{ backgroundColor: feature.color }}
            >
                <Text className="text-white font-bold text-lg">Open {feature.title}</Text>
                <ArrowRight color="white" size={20} />
            </TouchableOpacity>
        </ScrollView>
    );

    return (
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
            <LinearGradient
                colors={mode === 'light' ? ['#ffffff', '#f0f0f0'] : mode === 'eye-care' ? ['#F5E6D3', '#E6D5C0'] : ['#000000', '#111827']}
                className="absolute inset-0"
            />
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View className="px-6 py-4 flex-row items-center gap-4 pl-16">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full" style={{ backgroundColor: colors.card }}>
                        <ChevronLeft color={colors.text} size={24} />
                    </TouchableOpacity>
                    <Text className="text-2xl font-bold" style={{ color: colors.text }}>Stats & Insights</Text>
                </View>

                {/* Top Nav Icon Bar */}
                {renderIconBar()}

                {/* Main Horizontal Pager */}
                <ScrollView
                    ref={scrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={handleScroll}
                    className="flex-1"
                >
                    {/* Index 0: Overview */}
                    <View style={{ width }} className="flex-1">
                        <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
                            <Text className="text-3xl font-bold mb-1" style={{ color: colors.text }}>Snapshot</Text>
                            <Text className="text-base mb-6" style={{ color: colors.secondary }}>Your weekly wellness report</Text>
                            {renderActivityChart()}
                            {renderPieChart()}
                            {renderRecommendations()}
                            <View className="h-20" />
                        </ScrollView>
                    </View>

                    {/* Features Pages */}
                    {features.slice(1).map((feature) => (
                        <View key={feature.id} style={{ width }} className="flex-1">
                            {renderFeaturePage(feature)}
                        </View>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
