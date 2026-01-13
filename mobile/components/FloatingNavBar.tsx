import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Animated, PanResponder, Image, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Home, Search, PlusSquare, MessageCircle, User, Circle, ShoppingBag } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Updated to match image size (44) for a tighter fit
const BUTTON_SIZE = 46;
// FIX: Constrain width to 90% of screen, maxing out at 400px
const EXPANDED_WIDTH = Math.min(SCREEN_WIDTH * 0.90, 400);
const BOTTOM_PADDING = 10; // Slightly increased for better corner aesthetic
const SIDE_MARGIN = 16;

// Corner Positions
const LEFT_X = SIDE_MARGIN;
const RIGHT_X = SCREEN_WIDTH - BUTTON_SIZE - SIDE_MARGIN;
const CENTER_X = (SCREEN_WIDTH - EXPANDED_WIDTH) / 2;

// Use the user's uploaded image for the collapsed nav icon
const NavIcon = require('../assets/nav-icon.png');

interface FloatingNavBarProps {
    currentRoute: string;
    onNavigate: (route: string) => void;
}

export default function FloatingNavBar({ currentRoute, onNavigate }: FloatingNavBarProps) {
    const { colors, mode } = useTheme();
    const segments = useSegments();
    const insets = useSafeAreaInsets();

    const [isExpanded, setIsExpanded] = useState(true);
    const isExpandedRef = useRef(true);
    // Track side preference: 'left' or 'right'
    const sideRef = useRef<'left' | 'right'>('left');

    useEffect(() => { isExpandedRef.current = isExpanded; }, [isExpanded]);

    const expandAnim = useRef(new Animated.Value(1)).current;

    // X Position state for dragging (independent of expansion)
    // Initialized to Center because we start Expanded
    const panX = useRef(new Animated.Value(CENTER_X)).current;

    const collapse = () => {
        // Target X based on last side preference
        const targetX = sideRef.current === 'right' ? RIGHT_X : LEFT_X;

        Animated.parallel([
            Animated.spring(expandAnim, {
                toValue: 0,
                useNativeDriver: false,
                friction: 8,
            }),
            Animated.spring(panX, {
                toValue: targetX,
                useNativeDriver: false,
                friction: 8,
            })
        ]).start();
        setIsExpanded(false);
    };

    const expand = () => {
        Animated.parallel([
            Animated.spring(expandAnim, {
                toValue: 1,
                useNativeDriver: false,
                friction: 8,
            }),
            Animated.spring(panX, {
                toValue: CENTER_X,
                useNativeDriver: false,
                friction: 8,
            })
        ]).start();
        setIsExpanded(true);
    };

    // PanResponder for Dragging (Only when Collapsed)
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !isExpandedRef.current,
            onMoveShouldSetPanResponder: (_, gesture) => !isExpandedRef.current && (Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5),
            onPanResponderGrant: () => {
                // Determine start value based on current side
                // We don't use extractOffset to simplify "snap to corner" logic logic reset
                const currentVal = (panX as any)._value; // Access internal value or keep track
                panX.setOffset(currentVal);
                panX.setValue(0);
            },
            onPanResponderMove: Animated.event(
                [null, { dx: panX }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (_, gesture) => {
                panX.flattenOffset();

                // Determine closest corner
                // Current absolute position
                const currentX = (panX as any)._value;
                const midPoint = SCREEN_WIDTH / 2;

                // Default to Left if closer to left, Right if closer to right
                // NEVER Center
                let targetSide: 'left' | 'right' = 'left';
                let targetX = LEFT_X;

                // Center of the button
                const buttonCenter = currentX + (BUTTON_SIZE / 2);

                if (buttonCenter > midPoint) {
                    targetSide = 'right';
                    targetX = RIGHT_X;
                }

                sideRef.current = targetSide;

                Animated.spring(panX, {
                    toValue: targetX,
                    useNativeDriver: false,
                    friction: 7,
                    tension: 50
                }).start();
            },
        })
    ).current;

    // Swipe to collapse logic (when expanded) - kept simple
    const expandPanResponder = useRef(
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
        { route: 'shop', icon: ShoppingBag, label: 'Shop' },
    ];

    const animatedWidth = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [BUTTON_SIZE, EXPANDED_WIDTH],
    });

    const animatedBorderRadius = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [BUTTON_SIZE / 2, 30],
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
                    left: panX, // Controlled by PanResponder/Animation
                    // Fixed bottom position
                    bottom: BOTTOM_PADDING + (Platform.OS === 'ios' ? 0 : insets.bottom),
                }
            ]}
            {...(isExpanded ? expandPanResponder.panHandlers : panResponder.panHandlers)}
        >
            <Animated.View style={{
                width: animatedWidth,
                borderRadius: animatedBorderRadius,
                overflow: 'hidden',
                height: '100%',
                // Shadow for visibility
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 4.65,
                elevation: 8,
            }}>
                <View style={[styles.blurView, { backgroundColor: '#000000', borderColor: colors.border }]}>
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
                                            color={isFocused ? '#ffffff' : '#888888'}
                                            size={24}
                                        />
                                    </TouchableOpacity>
                                );
                            })}
                        </Animated.View>
                    )}
                </View>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        zIndex: 1000,
        height: BUTTON_SIZE,
        // Removed alignSelf: 'center' to allow positioning via 'left'
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
