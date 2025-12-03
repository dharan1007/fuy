import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Smile } from 'lucide-react-native';

interface JournalEntry {
    id: string;
    title: string;
    content: string;
    date: string;
    time: string;
    mood: 'happy' | 'neutral' | 'sad';
    imageUrl?: string;
}

interface JournalCardProps {
    entry: JournalEntry;
    onPress: () => void;
    variant?: 'large' | 'list';
}

export function JournalCard({ entry, onPress, variant = 'large' }: JournalCardProps) {
    if (variant === 'large') {
        return (
            <TouchableOpacity
                onPress={onPress}
                className="w-48 h-64 mr-4 rounded-3xl overflow-hidden relative bg-black"
                activeOpacity={0.9}
            >
                {entry.imageUrl ? (
                    <Image
                        source={{ uri: entry.imageUrl }}
                        className="absolute inset-0 w-full h-full opacity-60"
                        resizeMode="cover"
                    />
                ) : (
                    <View className="absolute inset-0 bg-gray-900" />
                )}

                <View className="absolute inset-0 bg-black/20" />

                <View className="flex-1 p-4 justify-between">
                    <View className="flex-row justify-between items-start">
                        <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center backdrop-blur-md">
                            <Smile size={16} color="white" />
                        </View>
                    </View>

                    <View>
                        <Text className="text-white text-lg font-bold leading-tight mb-1">
                            {entry.title}
                        </Text>
                        <Text className="text-white/70 text-xs font-medium">
                            {entry.time}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            className="flex-row items-center p-4 mb-3 bg-white rounded-3xl shadow-sm border border-gray-100"
            activeOpacity={0.7}
        >
            <View className="w-1 h-12 bg-black rounded-full mr-4" />
            <View className="flex-1">
                <Text className="text-base font-bold text-gray-900 mb-1">{entry.title}</Text>
                <Text className="text-xs text-gray-400">{entry.time} • {entry.date}</Text>
            </View>
            <View className="w-8 h-8 rounded-full bg-gray-50 items-center justify-center">
                <Smile size={16} color="#9CA3AF" />
            </View>
        </TouchableOpacity>
    );
}
