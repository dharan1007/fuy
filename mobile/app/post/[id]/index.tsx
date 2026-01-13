import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Dimensions, Image as RNImage } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronDown } from 'lucide-react-native';
import { useIsFocused } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';

const { width, height } = Dimensions.get('window');

interface PostData {
    id: string;
    content: string;
    postType: string;
    postMedia?: { media: { url: string, type: string } }[];
    media?: { url: string, type: string }[];
    user?: {
        name: string;
        profile: { avatarUrl: string; displayName: string };
    };
    chanData?: {
        channelName: string;
    };
}

export default function PostScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [post, setPost] = useState<PostData | null>(null);
    const [loading, setLoading] = useState(true);

    // Playback state
    const isFocused = useIsFocused();
    const [isPlaying, setIsPlaying] = useState(true);

    // Auto-pause when screen loses focus
    useEffect(() => {
        if (!isFocused) {
            setIsPlaying(false);
        } else {
            setIsPlaying(true);
        }
    }, [isFocused]);

    useEffect(() => {
        if (id) fetchPost();
    }, [id]);

    const fetchPost = async () => {
        try {
            setLoading(true);

            // 1. Try fetching as Post
            const { data: postData, error: postError } = await supabase
                .from('Post')
                .select(`
                    id, 
                    content, 
                    postType,
                    postMedia:PostMedia(
                        media:Media(url, type)
                    ),
                    user:User(name, profile:Profile(displayName, avatarUrl)),
                    chan_data:Chan(channelName)
                `)
                .eq('id', id)
                .maybeSingle();

            if (postData) {
                // Normalize media
                const media = (postData.postMedia || []).map((pm: any) => pm.media);

                setPost({
                    ...postData,
                    media,
                    chanData: (Array.isArray(postData.chan_data) ? postData.chan_data[0] : postData.chan_data) as any
                } as any);
                return;
            }

            // 2. If not a Post, try fetching as Episode
            const { data: epData, error: epError } = await supabase
                .from('Episode')
                .select(`
                    id,
                    title,
                    description,
                    videoUrl,
                    coverUrl,
                    show:Show(
                        chan:Chan(
                            channelName,
                            post:Post(
                                user:User(
                                    profile:Profile(displayName, avatarUrl)
                                )
                            )
                        )
                    )
                `)
                .eq('id', id)
                .single();

            if (epError) throw epError;

            if (epData) {
                // Safely handle nested relations (Supabase might return arrays for 1:M even if single based on query structure)
                const show = Array.isArray(epData.show) ? epData.show[0] : epData.show;
                const chan = show ? (Array.isArray(show.chan) ? show.chan[0] : show.chan) : null;
                const post = chan ? (Array.isArray(chan.post) ? chan.post[0] : chan.post) : null;
                const user = post ? (Array.isArray(post.user) ? post.user[0] : post.user) : null;
                const profile = user ? (Array.isArray(user.profile) ? user.profile[0] : user.profile) : null;

                const avatarUrl = profile?.avatarUrl || epData.coverUrl;

                setPost({
                    id: epData.id,
                    content: epData.description || epData.title,
                    postType: 'EPISODE',
                    media: epData.videoUrl ? [{ url: epData.videoUrl, type: 'VIDEO' }] : [],
                    chanData: { channelName: chan?.channelName || 'Unknown Channel' },
                    user: {
                        name: 'Channel',
                        profile: {
                            displayName: epData.title,
                            avatarUrl: avatarUrl
                        }
                    }
                } as any);
            }

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="white" />
            </View>
        );
    }

    if (!post) {
        return (
            <View style={{ flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'white' }}>Post not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                    <Text style={{ color: 'white' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Find video or image
    const videoMedia = post.media?.find(m => m.type?.toUpperCase() === 'VIDEO');
    const imageMedia = post.media?.find(m => m.type?.toUpperCase() === 'IMAGE');
    const mediaUrl = videoMedia?.url || imageMedia?.url;
    const isVideo = !!videoMedia;

    // Layout logic
    const isLill = post.postType === 'LILL';
    // Episodes and Fills use standard player
    const useNativeControls = !isLill;

    const togglePlayback = () => {
        if (!useNativeControls) {
            setIsPlaying(prev => !prev);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'black' }}>
            {/* Header Overlay - Always Visible */}
            <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 }} edges={['top']}>
                <View style={{ padding: 16 }}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <ChevronLeft color="white" size={24} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <View style={{ flex: 1, justifyContent: isLill ? 'flex-start' : 'center' }}>
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={togglePlayback}
                    disabled={useNativeControls}
                    style={{ flex: 1, justifyContent: 'center' }}
                >
                    {mediaUrl ? (
                        isVideo ? (
                            <View style={isLill ? { flex: 1 } : { width: '100%', aspectRatio: 16 / 9 }}>
                                <Video
                                    source={{ uri: mediaUrl }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode={isLill ? ResizeMode.COVER : ResizeMode.CONTAIN}
                                    shouldPlay={isFocused && (useNativeControls ? true : isPlaying)}
                                    useNativeControls={useNativeControls}
                                    isLooping
                                />
                            </View>
                        ) : (
                            <RNImage
                                source={{ uri: mediaUrl }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode={ResizeMode.CONTAIN}
                            />
                        )
                    ) : (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: '#444' }}>No media available</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Info Overlay */}
                {isLill ? (
                    // LILL: Overlay at bottom
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 40, pointerEvents: 'none' }}
                    >
                        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                            {post.chanData?.channelName || post.user?.profile?.displayName}
                        </Text>
                        <Text style={{ color: '#eee', fontSize: 15 }}>
                            {post.content}
                        </Text>
                    </LinearGradient>
                ) : (
                    // EPISODE/FILL: Content Below
                    <View style={{ padding: 20 }}>
                        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>
                            {post.chanData?.channelName || post.user?.profile?.displayName}
                        </Text>
                        <Text style={{ color: '#aaa', fontSize: 14 }}>
                            {post.content}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}
