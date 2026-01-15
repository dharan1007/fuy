import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useTheme } from '../context/ThemeContext';
import { User, Play } from 'lucide-react-native';

interface PostData {
    postId: string;
    mediaUrl?: string;
    mediaType?: 'IMAGE' | 'VIDEO';
    authorName?: string;
    authorAvatar?: string;
    caption?: string;
}

interface ChatPostCardProps {
    data: PostData;
    isMe: boolean;
    onPress?: () => void;
}

export default function ChatPostCard({ data, isMe, onPress }: ChatPostCardProps) {
    const { colors, mode } = useTheme();

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.9}
            className="rounded-2xl overflow-hidden border"
            style={{
                width: 200,
                backgroundColor: isMe ? (mode === 'light' ? '#000000' : '#FFFFFF') : (mode === 'light' ? '#ffffff' : '#262626'),
                borderColor: colors.border
            }}
        >
            {/* Header: Author Info */}
            <View className="flex-row items-center p-2 gap-2">
                {data.authorAvatar ? (
                    <Image source={{ uri: data.authorAvatar }} className="w-6 h-6 rounded-full bg-zinc-800" />
                ) : (
                    <View className="w-6 h-6 rounded-full bg-zinc-800 items-center justify-center">
                        <User size={12} color="white" />
                    </View>
                )}
                <Text
                    className="text-xs font-bold"
                    numberOfLines={1}
                    style={{ color: isMe ? (mode === 'light' ? '#fff' : '#000') : colors.text }}
                >
                    {data.authorName || 'User'}
                </Text>
            </View>

            {/* Media */}
            <View className="w-full h-[200px] bg-black">
                {data.mediaType === 'VIDEO' ? (
                    <View className="w-full h-full justify-center items-center">
                        <Video
                            source={{ uri: data.mediaUrl || '' }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={false}
                            isMuted={true}
                        />
                        <View className="absolute bg-black/40 p-2 rounded-full">
                            <Play size={20} color="white" fill="white" />
                        </View>
                    </View>
                ) : (
                    <Image
                        source={{ uri: data.mediaUrl }}
                        className="w-full h-full"
                        resizeMode="cover"
                    />
                )}
            </View>

            {/* Footer: Caption */}
            {data.caption ? (
                <View className="p-2">
                    <Text
                        className="text-xs"
                        numberOfLines={2}
                        style={{ color: isMe ? (mode === 'light' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)') : colors.secondary }}
                    >
                        <Text className="font-bold">{data.authorName} </Text>
                        {data.caption}
                    </Text>
                </View>
            ) : null}
        </TouchableOpacity>
    );
}
