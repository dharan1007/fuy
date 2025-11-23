import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export default function ScreenWrapper({ children, style }: { children: React.ReactNode, style?: any }) {
    const { colors } = useTheme();
    return (
        <View style={[{ flex: 1, backgroundColor: colors.background }, style]}>
            <SafeAreaView style={{ flex: 1 }}>
                {children}
            </SafeAreaView>
        </View>
    );
}
