import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, MoreHorizontal, Check, X, Ghost, ThumbsUp, MessageCircle, Settings } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// --- Mock Data ---
const TODAY_MEMBERS = [
    { id: '1', image: 'https://api.dicebear.com/7.x/avataaars/png?seed=1' },
    { id: '2', image: 'https://api.dicebear.com/7.x/avataaars/png?seed=2' },
    { id: '3', image: 'https://api.dicebear.com/7.x/avataaars/png?seed=3' },
];

const NOTIFICATIONS = [
    {
        id: '1',
        type: 'request',
        user: { name: 'Lets Explore', avatar: 'https://api.dicebear.com/7.x/shapes/png?seed=explore' },
        content: 'your simple Notifications',
        time: 'Yesterday',
        status: 'pending'
    },
    {
        id: '2',
        type: 'message',
        user: { name: 'ChiragPanchal@gmail.com', avatar: 'https://api.dicebear.com/7.x/avataaars/png?seed=chirag' },
        content: 'In publishing and graphic design, Lorem ipsum is a placeholder text',
        time: '12:12 pm',
        likes: 10
    },
    {
        id: '3',
        type: 'alert',
        user: { name: 'Chirag Panchal', avatar: 'https://api.dicebear.com/7.x/initials/png?seed=CP' },
        content: 'complated Design Review',
        time: '2.54 pm'
    },
    {
        id: '4',
        type: 'message',
        user: { name: 'kaira@gmail.com', avatar: 'https://api.dicebear.com/7.x/avataaars/png?seed=kaira' },
        content: 'Dark Mode Icons file.',
        time: '2.54 pm'
    }
];

export default function NotificationsScreen() {
    const router = useRouter();
    const [notifications, setNotifications] = useState(NOTIFICATIONS);

    const handleAction = (id: string, action: 'accept' | 'reject' | 'ghost') => {
        // In a real app, this would call an API
        console.log(`Action ${action} on notification ${id}`);
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const renderHeader = () => (
        <View className="px-6 pt-4 pb-6 flex-row justify-between items-center">
            <View className="flex-row items-center gap-4">
                <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full bg-white/10">
                    <ChevronLeft color="white" size={24} />
                </TouchableOpacity>
                <Text className="text-white text-3xl font-bold">Notifications</Text>
            </View>
            <View className="flex-row gap-4">
                <TouchableOpacity className="p-2 rounded-full bg-white/10">
                    <Settings color="white" size={24} />
                </TouchableOpacity>
                <TouchableOpacity className="p-2 rounded-full bg-white/10">
                    <MoreHorizontal color="white" size={24} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderTodayMembers = () => (
        <View className="px-6 mb-8">
            <Text className="text-slate-400 text-base mb-4">This Member Today Message</Text>
            <View className="flex-row items-center justify-between">
                <View className="flex-row">
                    {TODAY_MEMBERS.map((member, index) => (
                        <Image
                            key={member.id}
                            source={{ uri: member.image }}
                            className="w-12 h-12 rounded-full border-2 border-black"
                            style={{ marginLeft: index > 0 ? -15 : 0 }}
                        />
                    ))}
                </View>
                <Text className="text-slate-500 text-sm">Yesterday</Text>
            </View>
        </View>
    );

    const renderNotificationItem = (item: any) => (
        <View key={item.id} className="mb-4">
            <BlurView intensity={20} tint="dark" className="rounded-3xl overflow-hidden border border-white/5">
                <View className="p-5">
                    <View className="flex-row gap-4">
                        <Image source={{ uri: item.user.avatar }} className="w-12 h-12 rounded-full bg-gray-700" />
                        <View className="flex-1">
                            <View className="flex-row justify-between items-start">
                                <Text className="text-white font-bold text-base flex-1 mr-2">{item.user.name}</Text>
                                <Text className="text-slate-500 text-xs">{item.time}</Text>
                            </View>

                            <Text className="text-slate-300 mt-1 leading-5">
                                {item.content}
                            </Text>

                            {item.likes && (
                                <View className="flex-row items-center gap-2 mt-3 bg-[#fbbf24] self-start px-3 py-1.5 rounded-full">
                                    <ThumbsUp color="black" size={14} fill="black" />
                                    <Text className="text-black font-bold text-xs">{item.likes}+</Text>
                                </View>
                            )}

                            {item.type === 'request' && (
                                <View className="flex-row gap-3 mt-4">
                                    <TouchableOpacity
                                        onPress={() => handleAction(item.id, 'accept')}
                                        className="flex-1 bg-blue-600 py-2.5 rounded-xl items-center flex-row justify-center gap-2"
                                    >
                                        <Check color="white" size={16} />
                                        <Text className="text-white font-bold">Accept</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleAction(item.id, 'reject')}
                                        className="flex-1 bg-white/10 py-2.5 rounded-xl items-center flex-row justify-center gap-2"
                                    >
                                        <X color="white" size={16} />
                                        <Text className="text-white font-bold">Reject</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleAction(item.id, 'ghost')}
                                        className="w-12 bg-white/5 py-2.5 rounded-xl items-center justify-center"
                                    >
                                        <Ghost color="white" size={16} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </BlurView>
        </View>
    );

    return (
        <View className="flex-1 bg-black">
            <LinearGradient
                colors={['#000000', '#111827']}
                className="absolute inset-0"
            />
            <SafeAreaView className="flex-1">
                <ScrollView showsVerticalScrollIndicator={false}>
                    {renderHeader()}
                    {renderTodayMembers()}
                    <View className="px-4 pb-10">
                        {notifications.map(renderNotificationItem)}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
