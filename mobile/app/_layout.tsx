import '../global.css';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, TextInput } from 'react-native';
import ThemeToggle from '../components/ThemeToggle';

// Fix font scaling issues
interface TextWithDefaultProps extends Text {
    defaultProps?: { allowFontScaling?: boolean; style?: any };
}
interface TextInputWithDefaultProps extends TextInput {
    defaultProps?: { allowFontScaling?: boolean; style?: any };
}

if ((Text as unknown as TextWithDefaultProps).defaultProps == null) (Text as unknown as TextWithDefaultProps).defaultProps = {};
(Text as unknown as TextWithDefaultProps).defaultProps!.allowFontScaling = false;
(Text as unknown as TextWithDefaultProps).defaultProps!.style = { fontFamily: 'System' };

if ((TextInput as unknown as TextInputWithDefaultProps).defaultProps == null) (TextInput as unknown as TextInputWithDefaultProps).defaultProps = {};
(TextInput as unknown as TextInputWithDefaultProps).defaultProps!.allowFontScaling = false;
(TextInput as unknown as TextInputWithDefaultProps).defaultProps!.style = { fontFamily: 'System' };

// import { getLocales } from 'expo-localization';

const MainLayout = () => {
    const { session, loading } = useAuth();
    const { mode } = useTheme();
    const segments = useSegments();
    const router = useRouter();

    const [isRegionAllowed, setIsRegionAllowed] = useState(true);

    useEffect(() => {
        const checkRegion = () => {
            // TODO: Re-enable region check after rebuilding native client with expo-localization
            // const { getLocales } = require('expo-localization');
            // ... logic commented out to prevent execution errors
            setIsRegionAllowed(true);
        };
        checkRegion();
    }, []);

    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === '(auth)';
        const inProfileSetup = segments.includes('profile-setup');

        if (!session && !inAuthGroup) {
            router.replace('/(auth)/login');
        } else if (session && inAuthGroup) {
            const userMeta = session.user?.user_metadata;
            const hasProfile = userMeta?.profile_completed || userMeta?.display_name;

            if (hasProfile) {
                router.replace('/(tabs)');
            } else {
                router.replace('/profile-setup');
            }
        }
    }, [session, loading, segments]);

    if (!isRegionAllowed) {
        return (
            <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <StatusBar style="light" />
                <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 12 }}>Not Available</Text>
                <Text style={{ color: '#ccc', fontSize: 16, textAlign: 'center' }}>
                    Sorry, this app is currently only available in India.
                </Text>
            </View>
        );
    }

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-black">
                <ActivityIndicator size="large" color="#ffffff" />
            </View>
        );
    }

    const segs = segments as string[];
    const isHome = (segs.length === 0) ||
        (segs.includes('(tabs)') && (segs.length === 1 || segs[1] === 'index'));

    return (
        <View className="flex-1 relative">
            <StatusBar style={mode === 'light' ? 'dark' : 'light'} />
            <Slot />
        </View>
    );
};

import { ToastProvider } from '../context/ToastContext';

// ... (existing code)

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
                <ThemeProvider>
                    <ToastProvider>
                        <MainLayout />
                    </ToastProvider>
                </ThemeProvider>
            </AuthProvider>
        </GestureHandlerRootView>
    );
}
