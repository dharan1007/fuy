import { Text, View } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';

export default function CreateScreen() {
    const { colors } = useTheme();
    return (
        <ScreenWrapper>
            <View className="flex-1 items-center justify-center">
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold' }}>Create</Text>
            </View>
        </ScreenWrapper>
    );
}
