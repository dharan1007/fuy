import { Tabs } from 'expo-router';
import TabBar from '../../components/TabBar';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

export default function TabLayout() {
    return (
        <Tabs
            tabBar={(props: BottomTabBarProps) => <TabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tabs.Screen name="index" options={{ title: 'Home' }} />
            <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
            <Tabs.Screen name="create" options={{ title: 'Create' }} />
            <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
            <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        </Tabs>
    );
}
