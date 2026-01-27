import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, FlatList, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Ban, Ghost, EyeOff, Check, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function SafetyScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const { session } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'blocked' | 'paused' | 'hidden'>('blocked');
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]);

    useEffect(() => {
        if (session?.user) {
            fetchData();
        }
    }, [session, activeTab]);

    const fetchData = async () => {
        if (!session?.user?.id) return;
        setLoading(true);
        setItems([]);

        try {
            let data: any[] = [];
            const myId = session.user.id;
            console.log('[Safety] Fetching for user:', myId, 'Tab:', activeTab);

            if (activeTab === 'blocked') {
                const { data: blocked, error } = await supabase
                    .from('BlockedUser')
                    .select(`
                        id,
                        blockedId,
                        blocked:User!blockedId (id, name, profile:Profile(displayName, avatarUrl))
                    `)
                    .eq('blockerId', myId);

                console.log('[Safety] Blocked:', blocked?.length, 'Error:', error?.message);

                if (blocked) {
                    data = blocked.map((item: any) => {
                        const user = Array.isArray(item.blocked) ? item.blocked[0] : item.blocked;
                        return {
                            id: item.id,
                            targetId: item.blockedId,
                            name: user?.profile?.displayName || user?.name || 'Unknown',
                            avatar: user?.profile?.avatarUrl,
                            handle: user?.name,
                            type: 'user'
                        };
                    });
                }
            } else if (activeTab === 'paused') {
                const { data: muted, error } = await supabase
                    .from('MutedUser')
                    .select(`
                        id,
                        mutedUserId,
                        mutedUser:User!mutedUserId (id, name, profile:Profile(displayName, avatarUrl))
                    `)
                    .eq('muterId', myId);

                console.log('[Safety] Muted:', muted?.length, 'Error:', error?.message);

                if (muted) {
                    data = muted.map((item: any) => {
                        const user = Array.isArray(item.mutedUser) ? item.mutedUser[0] : item.mutedUser;
                        return {
                            id: item.id,
                            targetId: item.mutedUserId,
                            name: user?.profile?.displayName || user?.name || 'Unknown',
                            avatar: user?.profile?.avatarUrl,
                            handle: user?.name,
                            type: 'user'
                        };
                    });
                }
            } else if (activeTab === 'hidden') {
                const { data: hidden, error } = await supabase
                    .from('HiddenPost')
                    .select(`
                        id,
                        postId,
                        post:Post!postId (
                            id,
                            content,
                            postMedia:PostMedia (
                                media:Media (url, type)
                            )
                        )
                    `)
                    .eq('userId', myId);

                console.log('[Safety] Hidden:', hidden?.length, 'Error:', error?.message);

                if (hidden) {
                    data = hidden.map((item: any) => {
                        const post = Array.isArray(item.post) ? item.post[0] : item.post;
                        const firstMedia = post?.postMedia?.[0]?.media;
                        return {
                            id: item.id,
                            targetId: item.postId,
                            content: post?.content || 'Hidden Post',
                            mediaUrl: firstMedia?.url,
                            type: 'post'
                        };
                    });
                }
            }

            console.log('[Safety] Final data count:', data.length);
            setItems(data);
        } catch (e) {
            console.error("Fetch safety error:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (itemId: string, itemType: string) => {
        if (!session?.user?.id) return;

        const table = activeTab === 'blocked' ? 'BlockedUser'
            : activeTab === 'paused' ? 'MutedUser'
                : 'HiddenPost';

        try {
            const { error } = await supabase
                .from(table)
                .delete()
                .eq('id', itemId); // Delete by primary key of the relation table

            if (error) throw error;

            // Optimistic update
            setItems(prev => prev.filter(i => i.id !== itemId));
            const actionText = activeTab === 'blocked' ? "Unblocked user" : activeTab === 'paused' ? "Unpaused user" : "Post unhidden";
            showToast(actionText, "success");
        } catch (e: any) {
            console.error("Action error:", e);
            showToast(e.message || "Action failed", "error");
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View className="flex-row items-center justify-between p-4 mb-3 rounded-2xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <View className="flex-row items-center flex-1 gap-3">
                {activeTab === 'hidden' ? (
                    <View className="w-12 h-12 rounded-lg bg-gray-800 justify-center items-center overflow-hidden">
                        {item.mediaUrl ? (
                            <Image source={{ uri: item.mediaUrl }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                            <EyeOff size={20} color={colors.secondary} />
                        )}
                    </View>
                ) : (
                    <Image
                        source={{ uri: item.avatar }}
                        className="w-12 h-12 rounded-full bg-gray-700"
                    />
                )}

                <View className="flex-1">
                    <Text className="font-bold text-base" style={{ color: colors.text }} numberOfLines={1}>
                        {activeTab === 'hidden' ? (item.content || 'Post') : item.name}
                    </Text>
                    {activeTab !== 'hidden' && (
                        <Text className="text-xs" style={{ color: colors.secondary }}>@{item.handle}</Text>
                    )}
                </View>
            </View>

            <TouchableOpacity
                onPress={() => handleAction(item.id, item.type)}
                className="px-4 py-2 rounded-full border"
                style={{ backgroundColor: colors.background, borderColor: colors.border }}
            >
                <Text className="font-bold text-xs" style={{ color: colors.primary }}>
                    {activeTab === 'blocked' ? 'Unblock' : activeTab === 'paused' ? 'Unpause' : 'Unhide'}
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
            <LinearGradient
                colors={mode === 'light' ? ['#ffffff', '#f0f0f0'] : mode === 'eye-care' ? ['#F5E6D3', '#E6D5C0'] : ['#0f172a', '#1e293b']}
                className="absolute inset-0"
            />
            <SafeAreaView className="flex-1">
                {/* Header */}
                <View className="px-6 pt-4 pb-4 flex-row items-center gap-4">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full" style={{ backgroundColor: colors.card }}>
                        <ChevronLeft color={colors.text} size={24} />
                    </TouchableOpacity>
                    <Text className="text-2xl font-bold" style={{ color: colors.text }}>Safety</Text>
                </View>

                {/* Tabs */}
                <View className="flex-row px-6 mb-6 gap-4">
                    {['blocked', 'paused', 'hidden'].map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setActiveTab(tab as any)}
                            className={`flex-1 py-2 rounded-xl items-center border ${activeTab === tab ? 'bg-indigo-600 border-indigo-600' : 'bg-transparent'}`}
                            style={{ borderColor: activeTab === tab ? colors.primary : colors.border }}
                        >
                            <Text className={`font-bold capitalize ${activeTab === tab ? 'text-white' : ''}`} style={{ color: activeTab === tab ? 'white' : colors.secondary }}>
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator color={colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={items}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                        ListEmptyComponent={
                            <View className="items-center justify-center py-20">
                                <Text style={{ color: colors.secondary }}>No {activeTab} items found</Text>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </View>
    );
}
