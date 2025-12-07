import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Map } from 'lucide-react-native';

export default function HopinScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();

    const getGradientColors = (): [string, string, string] => {
        return mode === 'light' ? ['#ffffff', '#f8f9fa', '#e9ecef'] :
            mode === 'eye-care' ? ['#F5E6D3', '#E6D5C0', '#DBC4A0'] :
                ['#000000', '#0a0a0a', '#171717'];
    };

    return (
        <LinearGradient colors={getGradientColors()} className="flex-1">
            <SafeAreaView className="flex-1 px-6">
                <View className="flex-row items-center justify-between py-4">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full bg-gray-200/20">
                        <ChevronLeft color={colors.text} size={24} />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold" style={{ color: colors.text }}>Hopin</Text>
                    <View className="w-10" />
                </View>

                <View className="flex-1 items-center justify-center">
                    <View className="p-6 rounded-full bg-blue-500/20 mb-6">
                        <Map size={64} color="#3b82f6" />
                    </View>
                    <Text className="text-2xl font-bold mb-2" style={{ color: colors.text }}>Hopin Trips</Text>
                    <Text className="text-center opacity-70" style={{ color: colors.secondary }}>
                        Plan your next adventure. Feature coming soon.
                    </Text>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
}
