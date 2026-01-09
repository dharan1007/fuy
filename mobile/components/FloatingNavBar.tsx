import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Animated, PanResponder, Image, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Home, Search, PlusSquare, MessageCircle, User, Circle } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BUTTON_SIZE = 48;
// FIX: Constrain width to 90% of screen, maxing out at 400px
const EXPANDED_WIDTH = Math.min(SCREEN_WIDTH * 0.90, 400);
const BOTTOM_PADDING = 30;

// Use the user's uploaded image for the collapsed nav icon
const NavIcon = require('../assets/nav-icon.png');

interface FloatingNavBarProps {
    currentRoute: string;
    onNavigate: (route: string) => void;
}

export default function FloatingNavBar({ currentRoute, onNavigate }: FloatingNavBarProps) {
    const { colors, mode } = useTheme();
    const segments = useSegments();
    const insets = useSafeAreaInsets(); // FIX: Use safe area insets

    const [isExpanded, setIsExpanded] = useState(true);
    const isExpandedRef = useRef(true);

    useEffect(() => { isExpandedRef.current = isExpanded; }, [isExpanded]);

    const expandAnim = useRef(new Animated.Value(1)).current;

    const collapse = () => {
        Animated.spring(expandAnim, {
            toValue: 0,
            useNativeDriver: false,
            friction: 8,
        }).start();
        setIsExpanded(false);
    };

    const expand = () => {
        Animated.spring(expandAnim, {
            toValue: 1,
            useNativeDriver: false,
            friction: 8,
        }).start();
        setIsExpanded(true);
    };

    // Swipe to collapse when expanded
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gesture) =>
                isExpandedRef.current && (Math.abs(gesture.dx) > 20 || Math.abs(gesture.dy) > 20),
            onPanResponderRelease: (_, gesture) => {
                if (isExpandedRef.current && (Math.abs(gesture.dx) > 30 || Math.abs(gesture.dy) > 30)) {
                    collapse();
                }
            },
        })
    ).current;

    // Hide on certain screens
    const segmentsArray = segments as string[];
    if (segmentsArray.includes('bonding') ||
        (segmentsArray.includes('chat') && segmentsArray.length > 2)) {
        return null;
    }

    const navItems = [
        { route: 'index', icon: Home, label: 'Home' },
        { route: 'explore', icon: Search, label: 'Explore' },
        { route: 'dots', icon: Circle, label: 'Dots' },
        { route: 'create', icon: PlusSquare, label: 'Create' },
        { route: 'chat', icon: MessageCircle, label: 'Chat' },
        { route: 'profile', icon: User, label: 'Profile' },
    ];

    const animatedWidth = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [BUTTON_SIZE, EXPANDED_WIDTH],
    });

    const animatedBorderRadius = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [BUTTON_SIZE / 2, 30],
    });

    const iconOpacity = expandAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [1, 0, 0],
    });

    const navOpacity = expandAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0, 1],
    });

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    width: animatedWidth,
                    // FIX: Add safe area bottom inset to base padding
                    bottom: BOTTOM_PADDING + (Platform.OS === 'ios' ? 0 : insets.bottom),
                }
            ]}
            {...panResponder.panHandlers}
        >
            <Animated.View style={{
                width: animatedWidth,
                borderRadius: animatedBorderRadius,
                overflow: 'hidden',
                height: '100%' // FIX: Ensure height is inherited so it doesn't collapse
            }}>
                <BlurView intensity={80} tint={mode === 'dark' ? 'dark' : 'light'} style={[styles.blurView, { borderColor: colors.border }]}>
                    {/* Collapsed state - tap to expand */}
                    {!isExpanded && (
                        <TouchableOpacity
                            onPress={expand}
                            style={styles.collapsedButton}
                            activeOpacity={0.8}
                        >
                            <Image source={NavIcon} style={{ width: 44, height: 44, borderRadius: 22 }} resizeMode="cover" />
                        </TouchableOpacity>
                    )}

                    {/* Expanded state - nav items */}
                    {isExpanded && (
                        <Animated.View style={[styles.navContainer, { opacity: navOpacity }]}>
                            {navItems.map((item) => {
                                const isFocused = currentRoute === item.route;
                                const IconComponent = item.icon;
                                return (
                                    <TouchableOpacity
                                        key={item.route}
                                        onPress={() => onNavigate(item.route)}
                                        style={styles.navItem}
                                    >
                                        <IconComponent
                                            color={isFocused ? colors.primary : colors.secondary}
                                            size={24}
                                        />
                                    </TouchableOpacity>
                                );
                            })}
                        </Animated.View>
                    )}
                </BlurView>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        // alignSelf: 'center' automatically centers it horizontally
        alignSelf: 'center',
        zIndex: 1000,
        height: BUTTON_SIZE,
        // FIX: Ensure it never exceeds 400px even if calculation fails
        maxWidth: 400,
    },
    blurView: {
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 1,
        flex: 1,
    },
    collapsedButton: {
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    navContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: BUTTON_SIZE,
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 10,
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
    },
});
