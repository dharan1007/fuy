import '../global.css';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import ThemeToggle from '../components/ThemeToggle';

const MainLayout = () => {
    const { session, loading } = useAuth();
    const { mode } = useTheme();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (!session && !inAuthGroup) {
            // Redirect to the login page if not authenticated
            router.replace('/(auth)/login');
        } else if (session && inAuthGroup) {
            // Redirect to the tabs page if authenticated
            router.replace('/(tabs)');
        }
    }, [session, loading, segments]);

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-black">
                <ActivityIndicator size="large" color="#ffffff" />
            </View>
        );
    }

    const hideToggle = segments.includes('(auth)') ||
        segments.includes('chat') ||
        segments.includes('messages') ||
        segments.includes('grounding') ||
        segments.includes('bonding') ||
        segments.includes('profile-card') ||
        segments.includes('dots') ||
        segments.includes('create') ||
        segments.includes('hopin');

    return (
        <View className="flex-1 relative">
            <StatusBar style={mode === 'light' ? 'dark' : 'light'} />
            <Slot />
            {!hideToggle && <ThemeToggle />}
        </View>
    );
};

export default function RootLayout() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <MainLayout />
            </ThemeProvider>
        </AuthProvider>
    );
}
