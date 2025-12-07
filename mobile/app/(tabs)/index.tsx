import { Text, View, TouchableOpacity, ScrollView, Image } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { BookOpen, Bell, Settings, LayoutDashboard } from 'lucide-react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function FeedScreen() {
    const { colors, mode } = useTheme();
    const router = useRouter();

    const renderHeader = () => (
        <View className="px-6 pt-4 pb-2 flex-row justify-between items-center pl-16">
            <Text
                className="text-3xl font-bold"
                style={{ color: colors.text }}
            >
                Fuy
            </Text>
            <View className="flex-row gap-4">
                <TouchableOpacity
                    onPress={() => router.push('/dashboard')}
                    className="p-2 rounded-full"
                    style={{ backgroundColor: colors.card }}
                >
                    <LayoutDashboard color={colors.text} size={24} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => router.push('/notifications')}
                    className="p-2 rounded-full"
                    style={{ backgroundColor: colors.card }}
                >
                    <Bell color={colors.text} size={24} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
            <LinearGradient
                colors={mode === 'light' ? ['#ffffff', '#f0f0f0'] : ['#000000', '#111111']}
                className="absolute inset-0"
            />
            <SafeAreaView className="flex-1" edges={['top']}>
                {renderHeader()}
                <View className="flex-1 items-center justify-center">
                    <Text style={{ color: colors.secondary }}>Feed Content Coming Soon</Text>
                </View>
            </SafeAreaView>
        </View>
    );
}
