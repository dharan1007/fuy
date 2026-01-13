import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions, RefreshControl, ActivityIndicator, Alert, Animated, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Check, X, Ghost, ThumbsUp, Bell, Settings } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

// Starfield Component
const StarField = () => {
    // Generate static stars
    const stars = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        top: Math.random() * height,
        left: Math.random() * width,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.7 + 0.3,
    }));

    return (
        <View className="absolute inset-0 z-0">
            {stars.map(star => (
                <View
                    key={star.id}
                    className="absolute bg-white rounded-full"
                    style={{
                        top: star.top,
                        left: star.left,
                        width: star.size,
                        height: star.size,
                        opacity: star.opacity
                    }}
                />
            ))}
        </View>
    );
};

// Asteroid Component
const Asteroid = () => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const runAnimation = () => {
            anim.setValue(0);
            Animated.timing(anim, {
                toValue: 1,
                duration: 8000,
                useNativeDriver: true,
                easing: Easing.linear
            }).start(() => runAnimation());
        };
        runAnimation();
    }, []);

    const translateX = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [-100, width + 100]
    });

    const translateY = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [50, height / 2]
    });

    return (
        <Animated.View
            className="absolute z-0 w-2 h-2 bg-white rounded-full shadow-lg shadow-white"
            style={{
                transform: [{ translateX }, { translateY }],
                opacity: 0.8,
                shadowOpacity: 0.8,
                shadowRadius: 10,
                elevation: 5
            }}
        >
            {/* Trail */}
            <View className="absolute right-0 top-0 w-20 h-2 bg-gradient-to-l from-transparent to-white opacity-20 transform -rotate-12 origin-right" />
        </Animated.View>
    );
};

// Combined type for UI
interface NotificationItem {
    id: string; // This matches Friendship ID for requests, Notification ID for alerts
    type: 'request' | 'notification' | 'alert';
    user: {
        id: string;
        name: string;
        avatar: string;
    };
    content: string;
    time: string;
    read?: boolean;
    data?: any;
}

export default function NotificationsScreen() {
    const router = useRouter();
    // Force dark space theme regardless of system mode for this screen
    const colors = { text: '#ffffff', secondary: '#9ca3af', card: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' };
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Friend Requests (Pending Friendships where friendId == currentUser)
            const { data: requests, error: reqError } = await supabase
                .from('Friendship')
                .select(`
                    id,
                    userId,
                    user:userId (id, name, profile:Profile(avatarUrl, displayName)),
                    createdAt,
                    isGhosted
                `)
                .eq('friendId', user.id)
                .eq('status', 'PENDING');

            if (reqError) console.error('Error fetching requests:', reqError);

            // 2. Fetch General Notifications
            const { data: notifs, error: notifError } = await supabase
                .from('Notification')
                .select('*')
                .eq('userId', user.id)
                .order('createdAt', { ascending: false })
                .limit(20);

            if (notifError) console.error('Error fetching notifs:', notifError);

            // Transform Requests to UI model
            const mappedRequests: NotificationItem[] = (requests || [])
                .filter((req: any) => !req.isGhosted)
                .map((req: any) => ({
                    id: req.id,
                    type: 'request',
                    user: {
                        id: req.user?.id || req.userId,
                        name: req.user?.name || req.user?.profile?.displayName || 'Unknown User',
                        avatar: req.user?.profile?.avatarUrl || null
                    },
                    content: 'wants to follow you',
                    time: new Date(req.createdAt).toLocaleDateString(),
                    data: req
                }));

            // Transform Notifs to UI model
            const mappedNotifs: NotificationItem[] = (notifs || []).map((n: any) => {
                // Fix "Someone" text issue here
                let cleanContent = n.message || '';
                // If it starts with "Someone ", strip it.
                cleanContent = cleanContent.replace(/^Someone\s+/, '');
                // Also capitalize first letter if needed
                cleanContent = cleanContent.charAt(0).toUpperCase() + cleanContent.slice(1);

                return {
                    id: n.id,
                    type: 'alert',
                    user: {
                        id: 'system',
                        name: 'System',
                        avatar: null
                    },
                    content: cleanContent,
                    time: new Date(n.createdAt).toLocaleDateString(),
                    read: n.read,
                    data: n
                };
            });

            setNotifications([...mappedRequests, ...mappedNotifs]);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const updateCounts = async (senderId: string, receiverId: string) => {
        try {
            // 1. Sender (Following + 1)
            const { data: sender } = await supabase.from('User').select('followingCount').eq('id', senderId).single();
            if (sender) {
                await supabase.from('User').update({ followingCount: (sender.followingCount || 0) + 1 }).eq('id', senderId);
            }

            // 2. Receiver (Followers + 1)
            const { data: receiver } = await supabase.from('User').select('followersCount').eq('id', receiverId).single();
            if (receiver) {
                await supabase.from('User').update({ followersCount: (receiver.followersCount || 0) + 1 }).eq('id', receiverId);
            }
        } catch (e) {
            console.error("Failed to update counts", e);
        }
    };

    const handleAction = async (id: string, action: 'accept' | 'reject' | 'ghost', item: NotificationItem) => {
        try {
            if (item.type === 'request') {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                if (action === 'accept') {
                    const { error } = await supabase
                        .from('Friendship')
                        .update({ status: 'ACCEPTED' })
                        .eq('id', id);

                    if (error) throw error;
                    await updateCounts(item.data.userId, user.id);
                    Alert.alert("Success", "You are now connected!");
                }
                else if (action === 'reject') {
                    const { error } = await supabase
                        .from('Friendship')
                        .update({ status: 'REJECTED' })
                        .eq('id', id);
                    if (error) throw error;
                    Alert.alert("Rejected", "Request rejected.");
                }
                else if (action === 'ghost') {
                    const { error } = await supabase
                        .from('Friendship')
                        .update({
                            isGhosted: true,
                            ghostedBy: user.id
                        })
                        .eq('id', id);
                    if (error) throw error;
                    Alert.alert("Ghosted", "This request won't bother you again.");
                }

                // Remove from list
                setNotifications(prev => prev.filter(n => n.id !== id));
            }
        } catch (e: any) {
            Alert.alert("Error", e.message);
        }
    };

    const renderHeader = () => (
        <View className="px-6 pt-4 pb-6 flex-row justify-between items-center pl-16 rounded-b-[30px] z-10">
            <View className="flex-row items-center gap-4">
                <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full bg-white/10 backdrop-blur-md">
                    <ChevronLeft color="white" size={24} />
                </TouchableOpacity>
                <Text className="text-3xl font-bold text-white tracking-widest" style={{ textShadowColor: '#000', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>
                    NOTIFICATIONS
                </Text>
            </View>
            <TouchableOpacity className="p-2 rounded-full bg-white/10 backdrop-blur-md">
                <Settings color="white" size={24} />
            </TouchableOpacity>
        </View>
    );

    const renderNotificationItem = (item: NotificationItem) => (
        <View key={item.id} className="mb-4">
            {/* Transparent Card with white border/glow */}
            <View
                className="rounded-3xl overflow-hidden border backdrop-blur-md"
                style={{
                    borderColor: 'rgba(255,255,255,0.1)',
                    backgroundColor: 'rgba(0,0,0,0.4)', // Slightly darker transparency for contrast
                    shadowColor: 'white',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.1,
                    shadowRadius: 10
                }}
            >
                <View className="p-5">
                    <View className="flex-row gap-4">
                        {item.user.avatar ? (
                            <Image
                                source={{ uri: item.user.avatar }}
                                className="w-12 h-12 rounded-full border-2 border-white/20"
                            />
                        ) : (
                            <View className="w-12 h-12 rounded-full border-2 border-white/20 items-center justify-center bg-gray-800">
                                <Bell size={20} color="white" />
                            </View>
                        )}
                        <View className="flex-1">
                            <View className="flex-row justify-between items-start">
                                <Text className="font-bold text-base flex-1 mr-2 text-white">{item.user.name}</Text>
                                <Text className="text-xs text-blue-200">{item.time}</Text>
                            </View>

                            <Text className="mt-1 leading-5 text-gray-300">
                                {item.content}
                            </Text>

                            {item.type === 'request' && (
                                <View className="flex-row gap-3 mt-4">
                                    <TouchableOpacity
                                        onPress={() => handleAction(item.id, 'accept', item)}
                                        className="flex-1 bg-white py-3 rounded-xl items-center flex-row justify-center gap-2"
                                    >
                                        <Check color="black" size={16} />
                                        <Text className="text-black font-bold">Accept</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => handleAction(item.id, 'reject', item)}
                                        className="flex-1 py-3 rounded-xl items-center flex-row justify-center gap-2 border border-white/20"
                                        style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
                                    >
                                        <X color="white" size={16} />
                                        <Text className="font-bold text-white">Reject</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-black">
            {/* Space Background */}
            <LinearGradient
                colors={['#000000', '#111827', '#1e1b4b']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="absolute inset-0 z-0"
            />
            <StarField />
            <Asteroid />

            <SafeAreaView className="flex-1 z-10">
                {renderHeader()}

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="white" />
                    </View>
                ) : (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="white" />}
                        contentContainerStyle={{ paddingBottom: 50, paddingHorizontal: 16 }}
                    >
                        {notifications.length === 0 ? (
                            <View className="items-center py-20 opacity-50">
                                <Bell color="white" size={48} />
                                <Text className="mt-4 text-lg text-white">No signals from space...</Text>
                            </View>
                        ) : (
                            notifications.map(renderNotificationItem)
                        )}
                    </ScrollView>
                )}
            </SafeAreaView>
        </View>
    );
}
