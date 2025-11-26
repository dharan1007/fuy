import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions, FlatList } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings, Bell, Grid, List, Plus, Heart, MessageCircle, Share2, MoreHorizontal, Edit3, Camera } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3 - 2;

// --- Mock Data ---
const ALBUMS = [
    { id: '1', title: 'Album', cover: 'https://images.unsplash.com/photo-1492633423870-43d1cd2775eb?w=500&auto=format&fit=crop&q=60' },
    { id: '2', title: 'Art', cover: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500&auto=format&fit=crop&q=60' },
    { id: '3', title: 'Summer', cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=60' },
    { id: '4', title: 'BTS', cover: 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?w=500&auto=format&fit=crop&q=60' },
];

const POSTS = Array.from({ length: 12 }).map((_, i) => ({
    id: i.toString(),
    image: `https://source.unsplash.com/random/400x400?sig=${i}`,
    likes: Math.floor(Math.random() * 1000),
}));

export default function ProfileScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'grid' | 'list'>('grid');

    const renderHeader = () => (
        <View className="relative h-64">
            <Image
                source={{ uri: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1000&auto=format&fit=crop&q=60' }}
                className="w-full h-full"
                resizeMode="cover"
            />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                className="absolute inset-0"
            />

            {/* Top Bar */}
            <SafeAreaView className="absolute top-0 w-full flex-row justify-between px-4 z-10">
                <TouchableOpacity className="p-2 rounded-full bg-black/20 backdrop-blur-md">
                    <Share2 color="white" size={24} />
                </TouchableOpacity>
                <View className="flex-row gap-4">
                    <TouchableOpacity onPress={() => router.push('/notifications')} className="p-2 rounded-full bg-black/20 backdrop-blur-md">
                        <Bell color="white" size={24} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/settings')} className="p-2 rounded-full bg-black/20 backdrop-blur-md">
                        <Settings color="white" size={24} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Profile Info Overlay */}
            <View className="absolute -bottom-16 left-0 right-0 items-center z-10">
                <View className="relative">
                    <LinearGradient
                        colors={['#c084fc', '#6366f1']}
                        className="p-[3px] rounded-[35px]"
                    >
                        <Image
                            source={{ uri: 'https://api.dicebear.com/7.x/avataaars/png?seed=bboya' }}
                            className="w-28 h-28 rounded-[32px] border-4 border-black"
                        />
                    </LinearGradient>
                    <View className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-1.5 border-2 border-black">
                        <Plus color="white" size={16} />
                    </View>
                </View>
            </View>
        </View>
    );

    const renderStats = () => (
        <View className="mt-20 px-6 items-center">
            <Text className="text-white text-2xl font-bold mb-1">bboya</Text>
            <View className="flex-row items-center gap-2 mb-6">
                <Edit3 color="#94a3b8" size={14} />
                <Text className="text-slate-400 text-sm italic">
                    You haven't add any intro. Tell something about yourself :)
                </Text>
            </View>

            <View className="flex-row justify-between w-full px-8 mb-8">
                <View className="items-center">
                    <Text className="text-white text-lg font-bold">113</Text>
                    <Text className="text-slate-400 text-xs">Following</Text>
                </View>
                <View className="items-center">
                    <Text className="text-white text-lg font-bold">8.10K</Text>
                    <Text className="text-slate-400 text-xs">Followers</Text>
                </View>
                <View className="items-center">
                    <Text className="text-white text-lg font-bold">517</Text>
                    <Text className="text-slate-400 text-xs">Posts</Text>
                </View>
            </View>
        </View>
    );

    const renderAlbums = () => (
        <View className="pl-6 mb-8">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-4">
                <TouchableOpacity className="items-center mr-4">
                    <View className="w-20 h-20 rounded-2xl border-2 border-dashed border-white/30 items-center justify-center bg-white/5">
                        <Plus color="white" size={24} />
                    </View>
                    <Text className="text-white/70 text-xs mt-2 font-medium">Album</Text>
                </TouchableOpacity>

                {ALBUMS.map((album) => (
                    <TouchableOpacity key={album.id} className="items-center mr-4">
                        <Image
                            source={{ uri: album.cover }}
                            className="w-20 h-20 rounded-2xl border border-white/10"
                        />
                        <Text className="text-white/70 text-xs mt-2 font-medium">{album.title}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    const renderContent = () => (
        <View className="flex-1 bg-black/20 rounded-t-[40px] overflow-hidden mt-4">
            <BlurView intensity={20} tint="dark" className="flex-1">
                {/* Tabs */}
                <View className="flex-row justify-between items-center px-8 py-4 border-b border-white/5">
                    <Text className="text-white font-bold text-lg">Posts</Text>
                    <View className="flex-row gap-6">
                        <TouchableOpacity onPress={() => setActiveTab('grid')}>
                            <Grid color={activeTab === 'grid' ? '#c084fc' : '#64748b'} size={24} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setActiveTab('list')}>
                            <List color={activeTab === 'list' ? '#c084fc' : '#64748b'} size={24} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Grid */}
                <View className="flex-row flex-wrap">
                    {POSTS.map((post) => (
                        <TouchableOpacity
                            key={post.id}
                            style={{ width: COLUMN_WIDTH, height: COLUMN_WIDTH }}
                            className="m-[1px]"
                        >
                            <Image
                                source={{ uri: post.image }}
                                className="w-full h-full"
                            />
                            {activeTab === 'list' && (
                                <View className="absolute bottom-2 left-2 flex-row items-center gap-1">
                                    <Heart color="white" size={12} fill="white" />
                                    <Text className="text-white text-xs font-bold">{post.likes}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
                <View className="h-20" />
            </BlurView>
        </View>
    );

    return (
        <View className="flex-1 bg-[#0f0c29]">
            <LinearGradient
                colors={['#0f0c29', '#302b63', '#24243e']}
                className="absolute inset-0"
            />
            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                {renderHeader()}
                {renderStats()}
                {renderAlbums()}
                {renderContent()}
            </ScrollView>
        </View>
    );
}
