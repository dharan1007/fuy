import { Text, View, TouchableOpacity } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';

export default function ProfileScreen() {
    const { colors, toggleMode, mode } = useTheme();
    return (
        <ScreenWrapper>
            <View className="flex-1 items-center justify-center gap-4">
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold' }}>Profile</Text>
                <TouchableOpacity
                    onPress={toggleMode}
                    style={{ padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8 }}
                >
                    <Text style={{ color: colors.text }}>
                        Switch to {mode === 'default' ? 'Eye Protection' : 'Default'} Mode
                    </Text>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}
