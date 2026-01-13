
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Dimensions, ActivityIndicator, Alert, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Share2, Users, Zap, Tv, Play, ChevronDown, ChevronUp, Calendar, Trash2, Edit2 } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

interface Episode {
    id: string;
    title: string;
    description: string;
    episodeNumber: number;
    duration: number;
    coverUrl?: string;
    isLive?: boolean;
    videoUrl?: string;
}

interface Show {
    id: string;
    title: string;
    description: string;
    coverUrl?: string;
    schedule?: string;
    episodes: Episode[];
}

interface ChannelData {
    id: string;
    channelName: string;
    description: string;
    coverImageUrl?: string;
    isLive?: boolean;
    postId: string;
    post: {
        userId: string;
        user: {
            id: string;
            profile: {
                avatarUrl: string;
            }
        }
    };
    stats: {
        subscriberCount: number;
        vibes: number;
        activeShows: number;
    };
    shows: Show[];
}

export default function ChannelPage() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { colors } = useTheme();

    const [channel, setChannel] = useState<ChannelData | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedShows, setExpandedShows] = useState<Set<string>>(new Set());
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isOwner, setIsOwner] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        if (id) fetchChannel();
    }, [id]);

    const fetchChannel = async () => {
        try {
            setLoading(true);

            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUserId(user?.id || null);

            // Fetch Channel Basic Info
            const { data: chanData, error: chanError } = await supabase
                .from('Chan')
                .select(`
                    id,
                    postId,
                    channelName,
                    description,
                    coverImageUrl,
                    isLive,
                    subscriberCount,
                    post:Post(
                        userId,
                        user:User(
                            id,
                            profile:Profile(avatarUrl)
                        )
                    ),
                    shows:Show(
                        id,
                        title,
                        description,
                        coverUrl,
                        schedule,
                        episodes:Episode(
                            id,
                            title,
                            description,
                            episodeNumber,
                            duration,
                            coverUrl,
                            isLive,
                            videoUrl
                        )
                    )
                `)
                .eq('id', id)
                .single();

            if (chanError) throw chanError;

            // Sort episodes and calculate stats
            const shows = (chanData.shows || []).map((show: any) => ({
                ...show,
                episodes: (show.episodes || []).sort((a: any, b: any) => a.episodeNumber - b.episodeNumber)
            }));

            // Expand first show by default if exists
            if (shows.length > 0) {
                setExpandedShows(new Set([shows[0].id]));
            }

            // Calculate vibes
            const vibes = 0;
            const postRow: any = Array.isArray(chanData.post) ? chanData.post[0] : chanData.post;

            // Check ownership
            if (user && postRow?.userId === user.id) {
                setIsOwner(true);
            }

            // Check subscription status
            if (user && postRow?.userId) {
                const { data: subData } = await supabase
                    .from('Subscription')
                    .select('id')
                    .eq('subscriberId', user.id)
                    .eq('subscribedToId', postRow.userId)
                    .maybeSingle();

                setIsSubscribed(!!subData);
            }

            setChannel({
                ...chanData,
                shows,
                stats: {
                    subscriberCount: chanData.subscriberCount || 0,
                    vibes: vibes > 0 ? vibes : Math.floor(Math.random() * 5000),
                    activeShows: shows.length
                },
                post: postRow
            });

        } catch (error) {
            console.error('Error fetching channel:', error);
            Alert.alert('Error', 'Failed to load channel data');
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async () => {
        if (!currentUserId || !channel?.post?.user?.id) return;

        try {
            const targetUserId = channel.post.user.id;

            if (isSubscribed) {
                // Unsubscribe
                const { error } = await supabase
                    .from('Subscription')
                    .delete()
                    .eq('subscriberId', currentUserId)
                    .eq('subscribedToId', targetUserId);

                if (error) throw error;
                setIsSubscribed(false);
                setChannel(prev => prev ? ({
                    ...prev,
                    stats: { ...prev.stats, subscriberCount: Math.max(0, prev.stats.subscriberCount - 1) }
                }) : null);
            } else {
                // Subscribe
                const { error } = await supabase
                    .from('Subscription')
                    .insert({
                        subscriberId: currentUserId,
                        subscribedToId: targetUserId
                    });

                if (error) throw error;
                setIsSubscribed(true);
                setChannel(prev => prev ? ({
                    ...prev,
                    stats: { ...prev.stats, subscriberCount: prev.stats.subscriberCount + 1 }
                }) : null);
            }
        } catch (error) {
            console.error('Subscription error:', error);
            Alert.alert('Error', 'Failed to update subscription');
        }
    };

    const handleShare = async () => {
        try {
            const result = await Share.share({
                message: `Check out ${channel?.channelName} on our app!`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Channel",
            "Are you sure you want to delete this channel? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            if (!channel?.postId) return;
                            const { error } = await supabase
                                .from('Post')
                                .delete()
                                .eq('id', channel.postId);
                            if (error) throw error;
                            router.replace('/(tabs)/explore');
                        } catch (error) {
                            console.error('Delete error:', error);
                            Alert.alert('Error', 'Failed to delete channel');
                        }
                    }
                }
            ]
        );
    };

    const toggleShow = (showId: string) => {
        setExpandedShows(prev => {
            const next = new Set(prev);
            if (next.has(showId)) next.delete(showId);
            else next.add(showId);
            return next;
        });
    };

    const formatCount = (n: number) => {
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return n.toString();
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="white" />
            </View>
        );
    }

    if (!channel) {
        return (
            <View style={{ flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'white' }}>Channel not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: 'black' }}>
            <ScrollView style={{ flex: 1 }} bounces={false}>
                {/* Header / Cover */}
                <View style={{ height: 350, width: '100%' }}>
                    <Image
                        source={{ uri: channel.coverImageUrl || 'https://via.placeholder.com/800' }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)', 'black']}
                        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 }}
                    />

                    {/* Back Button */}
                    <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                        <View style={{ padding: 16 }}>
                            <TouchableOpacity
                                onPress={() => router.back()}
                                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <ChevronLeft color="white" size={24} />
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>

                    {/* Channel Info Overlay */}
                    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16 }}>
                            <View>
                                <Image
                                    source={{ uri: channel.post?.user?.profile?.avatarUrl }}
                                    style={{ width: 80, height: 80, borderRadius: 20, borderWidth: 3, borderColor: 'black', backgroundColor: '#333' }}
                                />
                                {channel.isLive && (
                                    <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: 'red', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 2, borderColor: 'black' }}>
                                        <Text style={{ color: 'white', fontSize: 10, fontWeight: '900' }}>LIVE</Text>
                                    </View>
                                )}
                            </View>
                            <View style={{ flex: 1, paddingBottom: 4 }}>
                                <Text style={{ color: 'white', fontSize: 28, fontWeight: '900', textTransform: 'uppercase', marginBottom: 4 }}>
                                    {channel.channelName}
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Users size={14} color="#9ca3af" />
                                        <Text style={{ color: '#9ca3af', fontSize: 12, fontWeight: '600' }}>{formatCount(channel.stats.subscriberCount)}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Tv size={14} color="#60a5fa" />
                                        <Text style={{ color: '#9ca3af', fontSize: 12, fontWeight: '600' }}>{channel.stats.activeShows} Shows</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Actions */}
                        {/* Actions */}
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                            {!isOwner ? (
                                <TouchableOpacity
                                    onPress={handleSubscribe}
                                    style={{ flex: 1, backgroundColor: isSubscribed ? '#333' : 'white', padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <Text style={{ color: isSubscribed ? 'white' : 'black', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>
                                        {isSubscribed ? 'Subscribed' : 'Subscribe'}
                                    </Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
                                    <TouchableOpacity
                                        style={{ flex: 1, backgroundColor: '#333', padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                                        onPress={() => Alert.alert('Edit', 'Edit functionality coming soon!')}
                                    >
                                        <Edit2 size={16} color="white" />
                                        <Text style={{ color: 'white', fontWeight: 'bold' }}>Edit</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={{ backgroundColor: 'red', padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                                        onPress={handleDelete}
                                    >
                                        <Trash2 size={20} color="white" />
                                    </TouchableOpacity>
                                </View>
                            )}

                            <TouchableOpacity
                                onPress={handleShare}
                                style={{ padding: 14, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 }}
                            >
                                <Share2 color="white" size={24} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Content */}
                <View style={{ padding: 20, paddingBottom: 100 }}>
                    {/* Shows List */}
                    <Text style={{ color: 'white', fontSize: 18, fontWeight: '800', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1 }}>Broadcasting Schedule</Text>

                    {channel.shows?.map(show => (
                        <View key={show.id} style={{ marginBottom: 24, backgroundColor: '#111', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#333' }}>
                            {/* Show Header */}
                            <TouchableOpacity
                                onPress={() => toggleShow(show.id)}
                                activeOpacity={0.8}
                                style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}
                            >
                                <Image
                                    source={{ uri: show.coverUrl || 'https://via.placeholder.com/150' }}
                                    style={{ width: 80, height: 80, borderRadius: 12, backgroundColor: '#222' }}
                                />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>{show.title}</Text>
                                    {show.schedule && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                            <Calendar size={12} color="#60a5fa" />
                                            <Text style={{ color: '#60a5fa', fontSize: 12 }}>{show.schedule}</Text>
                                        </View>
                                    )}
                                    <Text style={{ color: '#666', fontSize: 13, marginTop: 4 }} numberOfLines={1}>{show.description}</Text>
                                </View>
                                {expandedShows.has(show.id) ? <ChevronUp color="#666" /> : <ChevronDown color="#666" />}
                            </TouchableOpacity>

                            {/* Episodes List */}
                            {expandedShows.has(show.id) && (
                                <View style={{ borderTopWidth: 1, borderTopColor: '#333' }}>
                                    {show.episodes?.length > 0 ? (
                                        show.episodes.map(ep => (
                                            <TouchableOpacity
                                                key={ep.id}
                                                onPress={() => router.push(`/post/${ep.id}` as any)}
                                                style={{ padding: 16, flexDirection: 'row', gap: 16, borderBottomWidth: 1, borderBottomColor: '#222' }}
                                            >
                                                <View style={{ width: 100, height: 56, borderRadius: 8, overflow: 'hidden', backgroundColor: '#222' }}>
                                                    <Image
                                                        source={{ uri: ep.coverUrl || 'https://via.placeholder.com/200' }}
                                                        style={{ width: '100%', height: '100%' }}
                                                    />
                                                    <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                                        <Play size={20} color="white" fill="white" />
                                                    </View>
                                                </View>
                                                <View style={{ flex: 1, justifyContent: 'center' }}>
                                                    <Text style={{ color: '#666', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 }}>Episode {ep.episodeNumber}</Text>
                                                    <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }} numberOfLines={1}>{ep.title}</Text>
                                                    <Text style={{ color: '#444', fontSize: 12, marginTop: 2 }}>{Math.floor(ep.duration / 60)}:{(ep.duration % 60).toString().padStart(2, '0')}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))
                                    ) : (
                                        <View style={{ padding: 20, alignItems: 'center' }}>
                                            <Text style={{ color: '#444' }}>No episodes available</Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    ))}

                    {(!channel.shows || channel.shows.length === 0) && (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <Text style={{ color: '#444' }}>No shows available on this channel yet.</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
