import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Home, Search, PlusSquare, MessageCircle, User } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const { colors } = useTheme();

    return (
        <View style={styles.container}>
            <BlurView intensity={80} tint="dark" style={[styles.blurView, { borderColor: colors.border }]}>
                <View style={styles.content}>
                    {state.routes.map((route: any, index: number) => {
                        const { options } = descriptors[route.key];
                        const isFocused = state.index === index;

                        const onPress = () => {
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });

                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate(route.name);
                            }
                        };

                        const iconColor = isFocused ? colors.primary : colors.secondary;
                        const IconComponent = () => {
                            const iconProps = { color: iconColor, size: 24 } as any;
                            switch (route.name) {
                                case 'index': return <Home {...iconProps} />;
                                case 'explore': return <Search {...iconProps} />;
                                case 'create': return <PlusSquare {...iconProps} />;
                                case 'chat': return <MessageCircle {...iconProps} />;
                                case 'profile': return <User {...iconProps} />;
                                default: return <Home {...iconProps} />;
                            }
                        };

                        return (
                            <TouchableOpacity
                                key={index}
                                accessibilityRole="button"
                                accessibilityState={isFocused ? { selected: true } : {}}
                                accessibilityLabel={options.tabBarAccessibilityLabel}
                                testID={(options as any).tabBarTestID}
                                onPress={onPress}
                                style={styles.tabButton}
                            >
                                <IconComponent />
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        alignItems: 'center', // Center properly
    },
    blurView: {
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 1,
        width: '85%', // Consistent width
        maxWidth: 400, // Tablet friendly
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(0,0,0,0.3)', // Slight dark overlay
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
