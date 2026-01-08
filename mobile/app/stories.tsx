import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Dimensions, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ChevronLeft, ChevronRight, Plus, Heart, Send, MoreHorizontal } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

interface Story {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    media: { url: string; type: 'image' | 'video' }[];
    createdAt: string;
    viewCount: number;
}

const DEMO_STORIES: Story[] = Array.from({ length: 8 }).map((_, i) => ({
    id: `story-${i}`,
    userId: `user-${i}`,
    userName: ['Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn'][i],
    userAvatar: `https://api.dicebear.com/7.x/avataaars/png?seed=story${i}`,
    media: Array.from({ length: 1 + (i % 3) }).map((_, j) => ({
        url: `https://picsum.photos/seed/${i}${j}/1080/1920`,
        type: 'image' as const,
    })),
    createdAt: new Date(Date.now() - i * 3600000).toISOString(),
    viewCount: Math.floor(Math.random() * 200) + 10,
}));

export default function StoriesScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const [stories, setStories] = useState<Story[]>(DEMO_STORIES);
    const [activeStoryIndex, setActiveStoryIndex] = useState(0);
    const [activeMediaIndex, setActiveMediaIndex] = useState(0);
    const [isViewing, setIsViewing] = useState(false);

    const activeStory = stories[activeStoryIndex];
    const activeMedia = activeStory?.media[activeMediaIndex];

    useEffect(() => {
        if (isViewing) {
            const timer = setTimeout(() => {
                if (activeMediaIndex < activeStory.media.length - 1) {
                    setActiveMediaIndex(prev => prev + 1);
                } else if (activeStoryIndex < stories.length - 1) {
                    setActiveStoryIndex(prev => prev + 1);
                    setActiveMediaIndex(0);
                } else {
                    setIsViewing(false);
                }
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isViewing, activeStoryIndex, activeMediaIndex]);

    const openStory = (index: number) => {
        setActiveStoryIndex(index);
        setActiveMediaIndex(0);
        setIsViewing(true);
    };

    const closeStory = () => {
        setIsViewing(false);
    };

    const goNext = () => {
        if (activeMediaIndex < activeStory.media.length - 1) {
            setActiveMediaIndex(prev => prev + 1);
        } else if (activeStoryIndex < stories.length - 1) {
            setActiveStoryIndex(prev => prev + 1);
            setActiveMediaIndex(0);
        } else {
            closeStory();
        }
    };

    const goPrev = () => {
        if (activeMediaIndex > 0) {
            setActiveMediaIndex(prev => prev - 1);
        } else if (activeStoryIndex > 0) {
            setActiveStoryIndex(prev => prev - 1);
            setActiveMediaIndex(stories[activeStoryIndex - 1].media.length - 1);
        }
    };

    // Story Viewer
    if (isViewing && activeStory) {
        return (
            <View style={{ flex: 1, backgroundColor: '#000' }}>
                {/* Background Image */}
                <Image
                    source={{ uri: activeMedia?.url }}
                    style={{ position: 'absolute', width, height, resizeMode: 'cover' }}
                />

                {/* Gradient overlays */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.6)', 'transparent']}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 150 }}
                />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.6)']}
                    style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 150 }}
                />

                <SafeAreaView style={{ flex: 1 }}>
                    {/* Progress Bars */}
                    <View style={{ flexDirection: 'row', paddingHorizontal: 8, paddingTop: 8, gap: 4 }}>
                        {activeStory.media.map((_, i) => (
                            <View
                                key={i}
                                style={{
                                    flex: 1,
                                    height: 2,
                                    backgroundColor: i <= activeMediaIndex ? 'white' : 'rgba(255,255,255,0.4)',
                                    borderRadius: 1,
                                }}
                            />
                        ))}
                    </View>

                    {/* Header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
                        <Image
                            source={{ uri: activeStory.userAvatar }}
                            style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'white' }}
                        />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>{activeStory.userName}</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{activeStory.viewCount} views</Text>
                        </View>
                        <TouchableOpacity onPress={closeStory} style={{ padding: 8 }}>
                            <X color="white" size={24} />
                        </TouchableOpacity>
                    </View>

                    {/* Touch areas for navigation */}
                    <View style={{ flex: 1, flexDirection: 'row' }}>
                        <TouchableOpacity style={{ flex: 1 }} onPress={goPrev} />
                        <TouchableOpacity style={{ flex: 1 }} onPress={goNext} />
                    </View>

                    {/* Bottom Actions */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 20, gap: 12 }}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Reply...</Text>
                        </View>
                        <TouchableOpacity style={{ padding: 8 }}>
                            <Heart color="white" size={24} />
                        </TouchableOpacity>
                        <TouchableOpacity style={{ padding: 8 }}>
                            <Send color="white" size={24} />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    // Story List View
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
                    <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>Stories</Text>
                </View>

                {/* Your Story */}
                <TouchableOpacity
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginHorizontal: 16,
                        padding: 16,
                        backgroundColor: colors.card,
                        borderRadius: 16,
                        marginBottom: 20,
                        borderWidth: 1,
                        borderColor: colors.border,
                    }}
                >
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center' }}>
                        <Plus color={colors.text} size={24} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Add Story</Text>
                        <Text style={{ fontSize: 13, color: colors.secondary }}>Share something with friends</Text>
                    </View>
                </TouchableOpacity>

                {/* Stories Grid */}
                <FlatList
                    data={stories}
                    keyExtractor={item => item.id}
                    numColumns={2}
                    columnWrapperStyle={{ paddingHorizontal: 16, gap: 12 }}
                    contentContainerStyle={{ gap: 12, paddingBottom: 100 }}
                    renderItem={({ item, index }) => (
                        <TouchableOpacity
                            onPress={() => openStory(index)}
                            style={{
                                flex: 1,
                                height: 200,
                                borderRadius: 16,
                                overflow: 'hidden',
                                backgroundColor: colors.card,
                            }}
                        >
                            <Image
                                source={{ uri: item.media[0].url }}
                                style={{ width: '100%', height: '100%' }}
                            />
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.7)']}
                                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Image
                                        source={{ uri: item.userAvatar }}
                                        style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'white' }}
                                    />
                                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>{item.userName}</Text>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                />
            </SafeAreaView>
        </View>
    );
}
