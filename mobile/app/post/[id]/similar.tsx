
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { ArrowLeft, Heart, MessageCircle, Share2 } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';

const { width } = Dimensions.get('window');

// Reusing FeedPost interface essentially
interface SimilarPost {
    id: string;
    content: string;
    user: {
        id: string;
        name: string;
        profile: { displayName: string; avatarUrl: string };
    };
    postMedia: { url: string; type: string }[];
    postType?: string;
    matchReason?: string;
    slashes?: { tag: string }[];
    overlap?: number;
}

export default function SimilarPostsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [posts, setPosts] = useState<SimilarPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchSimilarPosts();
    }, [id]);

    const fetchSourcePost = async () => {
        const { data } = await supabase
            .from('Post')
            .select(`
                id,
                postType,
                content
            `)
            .eq('id', id)
            .single();
        return data;
    };

    const fetchSimilarPosts = async () => {
        try {
            const source = await fetchSourcePost();

            let query = supabase
                .from('Post')
                .select(`
                    id,
                    content,
                    postType,
                    createdAt,
                    user:User (
                        id,
                        name,
                        profile:Profile (displayName, avatarUrl)
                    ),
                    postMedia:PostMedia (
                        media:Media (url, type, variant)
                    )
                `)
                .neq('id', id) // Exclude current
                .eq('visibility', 'PUBLIC')
                .order('createdAt', { ascending: false })
                .limit(50);

            // Filter by same postType to match "Vibe" since Slashes are broken
            if (source?.postType) {
                // specific filtering if needed, otherwise recent public posts match "Explore" vibe
                // query = query.eq('postType', source.postType); // Optional: enforcing this might reduce results too much.
            }

            const { data, error } = await query;

            if (error) throw error;

            let mapped: SimilarPost[] = (data || []).map((post: any) => {
                // Determine if similar based on type?
                const isSameType = source?.postType === post.postType;

                return {
                    id: post.id,
                    content: post.content,
                    user: {
                        id: post.user?.id,
                        name: post.user?.name || 'User',
                        profile: post.user?.profile || { displayName: 'User', avatarUrl: '' }
                    },
                    postMedia: (post.postMedia || []).map((pm: any) => pm.media).filter(Boolean),
                    postType: post.postType,
                    matchReason: isSameType ? 'Similar Vibe' : 'Recent',
                    slashes: [],
                    overlap: isSameType ? 1 : 0
                };
            });

            // Sort by type match
            mapped = mapped.sort((a, b) => b.overlap - a.overlap);

            setPosts(mapped);
        } catch (error) {
            console.error('Error fetching similar posts:', error);
            setPosts([]);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: SimilarPost }) => (
        <View className="mb-6 rounded-2xl mx-4 overflow-hidden bg-zinc-900 border border-zinc-800">
            {/* Match Reason Badge */}
            {item.matchReason && (
                <View className="flex-row items-center justify-center py-2 border-b border-white/10 bg-white/5">
                    <Text className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                        {item.matchReason}
                    </Text>
                </View>
            )}

            {/* Header */}
            <View className="flex-row items-center p-4">
                <Image
                    source={{ uri: item.user.profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${item.user.name}` }}
                    className="w-10 h-10 rounded-full bg-zinc-800"
                />
                <View className="ml-3 flex-1">
                    <Text className="font-bold text-base text-white">
                        {item.user.profile?.displayName || item.user.name}
                    </Text>
                    {item.slashes && item.slashes.length > 0 && (
                        <View className="flex-row flex-wrap gap-1 mt-1">
                            {item.slashes.slice(0, 3).map((slash, i) => (
                                <Text key={i} className="text-zinc-500 text-xs">/{slash.tag}</Text>
                            ))}
                        </View>
                    )}
                </View>
            </View>

            {/* Content */}
            {item.content ? (
                <Text className="px-4 pb-3 text-base leading-6 text-zinc-300">
                    {item.content}
                </Text>
            ) : null}

            {/* Media */}
            {item.postMedia && item.postMedia.length > 0 && (
                <View className="w-full bg-black relative" style={{ aspectRatio: item.postType === 'LILL' ? 9 / 16 : 16 / 9 }}>
                    <Image
                        source={{ uri: item.postMedia[0].url }}
                        className="w-full h-full"
                        resizeMode="cover"
                    />
                    {item.postMedia[0].type?.toUpperCase() === 'VIDEO' && (
                        <View className="absolute inset-0 items-center justify-center bg-black/20">
                            <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center backdrop-blur-sm">
                                <View className="w-0 h-0 border-l-[14px] border-l-white border-t-[9px] border-t-transparent border-b-[9px] border-b-transparent ml-1" />
                            </View>
                        </View>
                    )}
                </View>
            )}

            {/* Footers */}
            <View className="flex-row items-center justify-between px-4 py-3 border-t border-zinc-800">
                <View className="flex-row gap-6">
                    <Heart color="white" size={20} />
                    <MessageCircle color="white" size={20} />
                    <Share2 color="white" size={20} />
                </View>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-black">
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View className="flex-row items-center px-4 py-4 border-b border-zinc-900">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4">
                        <ArrowLeft color="white" size={24} />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-white">Similar Vibes</Text>
                </View>

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#fff" />
                    </View>
                ) : (
                    <FlatList
                        data={posts}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ paddingVertical: 20 }}
                    />
                )}
            </SafeAreaView>
        </View>
    );
}
