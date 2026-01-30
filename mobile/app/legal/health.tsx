
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

export default function HealthDisclaimerScreen() {
    const router = useRouter();
    const { colors } = useTheme();

    return (
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
            <SafeAreaView className="flex-1">
                <View className="px-6 py-4 flex-row items-center gap-4 border-b border-gray-800">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full" style={{ backgroundColor: colors.card }}>
                        <ChevronLeft color={colors.text} size={24} />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold" style={{ color: colors.text }}>Health Disclaimer</Text>
                </View>
                <ScrollView className="flex-1 p-6">
                    <Text style={{ color: colors.text, lineHeight: 24, fontSize: 16 }}>
                        [Mobile Health Disclaimer Content Placeholder - Please paste content here]
                    </Text>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
