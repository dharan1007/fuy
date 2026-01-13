import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';

export default function TasksScreen() {
    const { colors } = useTheme();
    const router = useRouter();

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SafeAreaView>
                <View className="px-6 pt-4 flex-row items-center gap-4">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full" style={{ backgroundColor: colors.card }}>
                        <ArrowLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text className="text-3xl font-bold" style={{ color: colors.text }}>Tasks</Text>
                </View>
                <View className="flex-1 items-center justify-center p-6">
                    <Text style={{ color: colors.secondary }}>Tasks Dashboard Coming Soon!</Text>
                </View>
            </SafeAreaView>
        </View>
    );
}
