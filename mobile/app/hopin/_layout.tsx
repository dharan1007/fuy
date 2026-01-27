import { Stack } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

export default function HopinLayout() {
    const { colors } = useTheme();

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="map" />
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="create" />
            <Stack.Screen name="[id]" />
        </Stack>
    );
}
