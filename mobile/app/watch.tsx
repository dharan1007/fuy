import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Dimensions, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause, Heart, MessageCircle, Share2, ChevronLeft, Volume2, VolumeX } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Video, ResizeMode } from 'expo-av';

const { width, height } = Dimensions.get('window');

interface WatchItem {
    id: string;
    videoUrl: string;
    thumbnailUrl: string;
    title: string;
    user: { name: string; avatarUrl: string };
    viewCount: number;
    likeCount: number;
}

const DEMO_VIDEOS: WatchItem[] = Array.from({ length: 10 }).map((_, i) => ({
    id: `watch-${i}`,
    videoUrl: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`,
    thumbnailUrl: `https://picsum.photos/seed/watch${i}/1080/1920`,
    title: ['Amazing sunset', 'City vibes', 'Adventure awaits', 'Creative flow', 'Night life'][i % 5],
    user: {
        name: ['Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan'][i % 5],
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/png?seed=watch${i}`,
    },
    viewCount: Math.floor(Math.random() * 100000) + 1000,
    likeCount: Math.floor(Math.random() * 10000) + 100,
}));

export default function WatchScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const [videos, setVideos] = useState<WatchItem[]>(DEMO_VIDEOS);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [liked, setLiked] = useState<Set<string>>(new Set());
    const flatListRef = useRef<FlatList>(null);

    const formatCount = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const toggleLike = (id: string) => {
        setLiked(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const renderVideoItem = ({ item, index }: { item: WatchItem; index: number }) => (
        <View style={{ width, height: height - 90, backgroundColor: '#000' }}>
            {/* Video/Thumbnail */}
            <Image
                source={{ uri: item.thumbnailUrl }}
                style={{ width: '100%', height: '100%', position: 'absolute' }}
                resizeMode="cover"
            />

            {/* Gradient overlays */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 }}
            />

            {/* Right side actions */}
            <View style={{ position: 'absolute', right: 16, bottom: 120, alignItems: 'center', gap: 20 }}>
                <TouchableOpacity style={{ alignItems: 'center' }}>
                    <Image
                        source={{ uri: item.user.avatarUrl }}
                        style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: 'white' }}
                    />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => toggleLike(item.id)} style={{ alignItems: 'center' }}>
                    <Heart size={32} color="white" fill={liked.has(item.id) ? '#ef4444' : 'transparent'} />
                    <Text style={{ color: 'white', fontSize: 12, marginTop: 4 }}>{formatCount(item.likeCount)}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ alignItems: 'center' }}>
                    <MessageCircle size={32} color="white" />
                    <Text style={{ color: 'white', fontSize: 12, marginTop: 4 }}>Comment</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ alignItems: 'center' }}>
                    <Share2 size={32} color="white" />
                    <Text style={{ color: 'white', fontSize: 12, marginTop: 4 }}>Share</Text>
                </TouchableOpacity>
            </View>

            {/* Bottom info */}
            <View style={{ position: 'absolute', bottom: 30, left: 16, right: 80 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>@{item.user.name}</Text>
                </View>
                <Text style={{ color: 'white', fontSize: 14, lineHeight: 20 }}>{item.title}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 8 }}>
                    {formatCount(item.viewCount)} views
                </Text>
            </View>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={{ position: 'absolute', top: 50, left: 16, right: 16, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }}>
                        <ChevronLeft color="white" size={24} />
                    </TouchableOpacity>
                    <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>Watch</Text>
                    <TouchableOpacity onPress={() => setIsMuted(!isMuted)} style={{ padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }}>
                        {isMuted ? <VolumeX color="white" size={24} /> : <Volume2 color="white" size={24} />}
                    </TouchableOpacity>
                </View>

                <FlatList
                    ref={flatListRef}
                    data={videos}
                    keyExtractor={item => item.id}
                    renderItem={renderVideoItem}
                    pagingEnabled
                    showsVerticalScrollIndicator={false}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                    snapToInterval={height - 90}
                    decelerationRate="fast"
                />
            </SafeAreaView>
        </View>
    );
}
