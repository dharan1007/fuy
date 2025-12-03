import { Text, View, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';

export default function ExploreScreen() {
    const { colors } = useTheme();
    return (
        <ScreenWrapper>
            <View className="flex-1 items-center justify-center">
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Explore</Text>

                <Link href="/journal" asChild>
                    <TouchableOpacity className="bg-black px-6 py-3 rounded-full">
                        <Text className="text-white font-bold">Open Journal 📖</Text>
                    </TouchableOpacity>
                </Link>
            </View>
        </ScreenWrapper>
    );
}
