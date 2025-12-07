import { Tabs, useSegments } from 'expo-router';
import { View } from 'react-native';
import FloatingNavBar from '../../components/FloatingNavBar';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { NavVisibilityProvider, useNavVisibility } from '../../context/NavContext';

function TabLayoutContent() {
    const router = useRouter();
    const segments = useSegments();
    const [currentRoute, setCurrentRoute] = useState('index');
    const { hideNav } = useNavVisibility();

    // Track current route - cast segments to string[] to fix type issues
    useEffect(() => {
        const segArr = segments as string[];
        if (segArr.length > 1 && segArr[1]) {
            setCurrentRoute(segArr[1]);
        }
    }, [segments]);

    const handleNavigate = (route: string) => {
        // 'index' is the home screen, use the base tabs path
        if (route === 'index') {
            router.push('/(tabs)/' as any);
        } else {
            router.push(`/(tabs)/${route}` as any);
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: { display: 'none' }, // Hide default tab bar
                }}
            >
                <Tabs.Screen name="index" options={{ title: 'Home' }} />
                <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
                <Tabs.Screen name="dots" options={{ title: 'Dots' }} />
                <Tabs.Screen name="create" options={{ title: 'Create' }} />
                <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
                <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
            </Tabs>

            {!hideNav && (
                <FloatingNavBar
                    currentRoute={currentRoute}
                    onNavigate={handleNavigate}
                />
            )}
        </View>
    );
}

export default function TabLayout() {
    return (
        <NavVisibilityProvider>
            <TabLayoutContent />
        </NavVisibilityProvider>
    );
}
