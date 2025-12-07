import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Animated, PanResponder, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { Home, Search, PlusSquare, MessageCircle, User, Circle } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUTTON_SIZE = 48;
const EXPANDED_HEIGHT = 44;
const EXPANDED_WIDTH = SCREEN_WIDTH - 40;
const CORNER_PADDING = 16;
const BOTTOM_PADDING = 24;

type Corner = 'bottom-left' | 'bottom-right';

// Use the user's uploaded image for the collapsed nav icon
const NavIcon = require('../assets/nav-icon.png');

interface FloatingNavBarProps {
    currentRoute: string;
    onNavigate: (route: string) => void;
}

export default function FloatingNavBar({ currentRoute, onNavigate }: FloatingNavBarProps) {
    const { colors, mode } = useTheme();
    const router = useRouter();
    const segments = useSegments();

    const [isExpanded, setIsExpanded] = useState(false);
    const [corner, setCorner] = useState<Corner>('bottom-right');

    const expandAnim = useRef(new Animated.Value(0)).current;
    const positionX = useRef(new Animated.Value(SCREEN_WIDTH - BUTTON_SIZE - CORNER_PADDING)).current;
    const positionY = useRef(new Animated.Value(SCREEN_HEIGHT - BUTTON_SIZE - BOTTOM_PADDING - 60)).current;

    // Load saved corner position
    useEffect(() => {
        loadCornerPosition();
    }, []);

    const loadCornerPosition = async () => {
        try {
            const saved = await AsyncStorage.getItem('nav_corner');
            if (saved) {
                setCorner(saved as Corner);
                updatePosition(saved as Corner, false);
            }
        } catch (e) {
            console.error('Error loading corner:', e);
        }
    };

    const saveCornerPosition = async (newCorner: Corner) => {
        try {
            await AsyncStorage.setItem('nav_corner', newCorner);
        } catch (e) {
            console.error('Error saving corner:', e);
        }
    };

    const updatePosition = (targetCorner: Corner, animate = true) => {
        const targetX = targetCorner === 'bottom-left'
            ? CORNER_PADDING
            : SCREEN_WIDTH - (isExpanded ? EXPANDED_WIDTH : BUTTON_SIZE) - CORNER_PADDING;
        const targetY = SCREEN_HEIGHT - BUTTON_SIZE - BOTTOM_PADDING - 60;

        if (animate) {
            Animated.spring(positionX, {
                toValue: targetX,
                useNativeDriver: false,
                friction: 8,
            }).start();
        } else {
            positionX.setValue(targetX);
        }
        positionY.setValue(targetY);
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !isExpanded,
            onMoveShouldSetPanResponder: (_, gesture) => !isExpanded && (Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10),
            onPanResponderMove: (_, gesture) => {
                if (isExpanded) return;
                const newX = (corner === 'bottom-left' ? CORNER_PADDING : SCREEN_WIDTH - BUTTON_SIZE - CORNER_PADDING) + gesture.dx;
                positionX.setValue(Math.max(CORNER_PADDING, Math.min(SCREEN_WIDTH - BUTTON_SIZE - CORNER_PADDING, newX)));
            },
            onPanResponderRelease: (_, gesture) => {
                if (isExpanded) return;
                // Determine which corner to snap to
                const currentX = (corner === 'bottom-left' ? CORNER_PADDING : SCREEN_WIDTH - BUTTON_SIZE - CORNER_PADDING) + gesture.dx;
                const newCorner: Corner = currentX < SCREEN_WIDTH / 2 ? 'bottom-left' : 'bottom-right';
                setCorner(newCorner);
                saveCornerPosition(newCorner);
                updatePosition(newCorner);
            },
        })
    ).current;

    const toggleExpand = () => {
        const toValue = isExpanded ? 0 : 1;
        Animated.spring(expandAnim, {
            toValue,
            useNativeDriver: false,
            friction: 8,
        }).start();

        // Adjust position for expanded width
        if (!isExpanded) {
            // Expanding - center the bar
            Animated.spring(positionX, {
                toValue: 20,
                useNativeDriver: false,
                friction: 8,
            }).start();
        } else {
            // Collapsing - return to corner
            updatePosition(corner);
        }

        setIsExpanded(!isExpanded);
    };

    const handleNavPress = (route: string) => {
        onNavigate(route);
        toggleExpand();
    };

    // Hide on chat/messages screens
    const segmentsArray = segments as string[];
    const hideNavBar = segmentsArray.includes('chat') || segmentsArray.includes('messages') || segmentsArray.includes('bonding');
    if (hideNavBar && segmentsArray.length > 1 && segmentsArray[0] === '(tabs)' && segmentsArray[1] === 'chat') {
        // Only hide when inside a chat conversation, not the chat list
        // For now, keep nav visible on chat list
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
                    left: positionX,
                    bottom: BOTTOM_PADDING,
                    width: animatedWidth,
                }
            ]}
            {...(isExpanded ? {} : panResponder.panHandlers)}
        >
            <Animated.View style={{ width: animatedWidth, borderRadius: animatedBorderRadius, overflow: 'hidden' }}>
                <BlurView intensity={80} tint={mode === 'dark' ? 'dark' : 'light'} style={[styles.blurView, { borderColor: colors.border }]}>
                    <TouchableOpacity
                        onPress={toggleExpand}
                        style={styles.touchArea}
                        activeOpacity={0.9}
                    >
                        {/* Collapsed Icon - using user's uploaded image */}
                        <Animated.View style={[styles.iconContainer, { opacity: iconOpacity }]}>
                            <Image source={NavIcon} style={{ width: 32, height: 32, borderRadius: 8 }} resizeMode="contain" />
                        </Animated.View>

                        {/* Expanded Nav Items */}
                        <Animated.View style={[styles.navContainer, { opacity: navOpacity }]}>
                            {navItems.map((item) => {
                                const isFocused = currentRoute === item.route;
                                const IconComponent = item.icon;
                                return (
                                    <TouchableOpacity
                                        key={item.route}
                                        onPress={() => handleNavPress(item.route)}
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
                    </TouchableOpacity>
                </BlurView>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        zIndex: 1000,
        height: BUTTON_SIZE,
    },
    blurView: {
        borderRadius: BUTTON_SIZE / 2,
        overflow: 'hidden',
        borderWidth: 1,
    },
    touchArea: {
        height: BUTTON_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    iconContainer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    navContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 10,
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
    },
});
