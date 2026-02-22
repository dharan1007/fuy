import '../global.css';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, TextInput } from 'react-native';
import ThemeToggle from '../components/ThemeToggle';
import PinModal from '../components/PinModal';
import { useEncryption } from '../context/EncryptionContext';

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
    const { isLocked, hasKeys, isLoading: encryptLoading } = useEncryption();

    useEffect(() => {
        const checkRegion = () => {
            try {
                const { getLocales } = require('expo-localization');
                const locales = getLocales();
                const regionCode = locales[0]?.regionCode;
                console.log('User Region:', regionCode);

                const ALLOWED_REGIONS = ['IN', 'India'];
                if (regionCode && !ALLOWED_REGIONS.includes(regionCode)) {
                    setIsRegionAllowed(false);
                } else {
                    setIsRegionAllowed(true);
                }
            } catch (e) {
                console.error('Region check failed, defaulting to allowed for safety:', e);
                // Default to true if module is missing during dev, but technically should be false for strictness
                // For production build, this module WILL be present.
                setIsRegionAllowed(true);
            }
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



    // ...

    const segs = segments as string[];
    const isHome = (segs.length === 0) ||
        (segs.includes('(tabs)') && (segs.length === 1 || segs[1] === 'index'));

    // E2EE Logic
    // const { isLocked, hasKeys, isLoading: encryptLoading } = useEncryption(); // Moved up
    const showPinModal = !!session && !loading && !encryptLoading;

    return (
        <View className="flex-1 relative">
            <StatusBar style={mode === 'light' ? 'dark' : 'light'} />
            <Slot />

            {showPinModal && (
                <PinModal
                    visible={!hasKeys || isLocked}
                    mode={!hasKeys ? 'setup' : 'unlock'}
                // No onClose implies mandatory (cannot use app without unlocking)
                />
            )}
        </View>
    );
};

import { ToastProvider } from '../context/ToastContext';
import { NotificationProvider } from '../context/NotificationContext';
import { EncryptionProvider } from '../context/EncryptionContext';

// ... (existing code)

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
                <ThemeProvider>
                    <EncryptionProvider>
                        <NotificationProvider>
                            <ToastProvider>
                                <MainLayout />
                            </ToastProvider>
                        </NotificationProvider>
                    </EncryptionProvider>
                </ThemeProvider>
            </AuthProvider>
        </GestureHandlerRootView>
    );
}
