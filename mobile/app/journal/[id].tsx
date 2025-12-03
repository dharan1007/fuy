import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, SafeAreaView, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Share, MoreHorizontal, Smile, Image as ImageIcon, AtSign, Type, Trash2 } from 'lucide-react-native';

export default function JournalDetail() {
    const router = useRouter();
    const { id } = useLocalSearchParams();

    // Mock data fetching based on ID
    const entry = {
        id: '1',
        title: 'First day at work',
        content: `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut placerat orci nulla pellentesque dignissim enim sit amet venenatis.

Aliquam faucibus purus in massa tempor nec feugiat nisi. Sapien faucibus et molestie ac feugiat sed. Odio ut enim blandit volutpat maecenas. Lectus magna fringilla urna porttitor rhoncus. Nunc mi ipsum faucibus vitae aliquet nec ullamcorper.`,
        date: 'Tuesday, February 9, 2022',
        time: '12:14',
        imageUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&auto=format&fit=crop&q=60',
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* Header */}
            <View className="px-6 py-4 flex-row justify-between items-center">
                <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                    <ChevronLeft size={24} color="#1F2937" />
                </TouchableOpacity>
                <View className="flex-row gap-4">
                    <TouchableOpacity>
                        <Share size={20} color="#1F2937" />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <MoreHorizontal size={20} color="#1F2937" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
                {/* Date Header */}
                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-lg font-bold text-gray-900">{entry.date}</Text>
                    <TouchableOpacity>
                        <Smile size={24} color="#374151" />
                    </TouchableOpacity>
                </View>

                {/* Title */}
                <View className="flex-row justify-between items-start mb-4">
                    <Text className="text-3xl font-bold text-gray-900 flex-1 mr-4 leading-tight">
                        {entry.title}
                    </Text>
                    <Text className="text-gray-400 text-sm mt-2">{entry.time}</Text>
                </View>

                {/* Content Part 1 */}
                <Text className="text-gray-500 text-base leading-relaxed mb-6">
                    {entry.content.split('\n\n')[0]}
                </Text>

                {/* Image */}
                {entry.imageUrl && (
                    <View className="w-full h-56 rounded-3xl overflow-hidden mb-6">
                        <Image
                            source={{ uri: entry.imageUrl }}
                            className="w-full h-full"
                            resizeMode="cover"
                        />
                    </View>
                )}

                {/* Content Part 2 */}
                <Text className="text-gray-500 text-base leading-relaxed mb-20">
                    {entry.content.split('\n\n')[1]}
                </Text>
            </ScrollView>

            {/* Bottom Toolbar */}
            <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 flex-row justify-between items-center pb-8">
                <View className="flex-row gap-6">
                    <TouchableOpacity>
                        <PlusIcon />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <ImageIcon size={22} color="#9CA3AF" />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <AtSign size={22} color="#9CA3AF" />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Type size={22} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity>
                    <Trash2 size={22} color="#9CA3AF" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

function PlusIcon() {
    return (
        <View className="w-6 h-6 items-center justify-center">
            <View className="w-3 h-0.5 bg-gray-400 absolute" />
            <View className="w-0.5 h-3 bg-gray-400 absolute" />
        </View>
    );
}
