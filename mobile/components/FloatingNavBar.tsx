import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Animated, PanResponder, Image, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Home, Search, PlusSquare, MessageCircle, User, Circle, ChevronUp, PenTool, Timer, X } from 'lucide-react-native';
import Svg, { Path, Circle as SvgCircle, Line } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Custom WREX Body Icon Component for Nav
function WrexNavIcon({ color, size = 24 }: { color: string; size?: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            {/* Head */}
            <SvgCircle cx="12" cy="4" r="2.5" stroke={color} strokeWidth="1.5" fill="none" />
            {/* Neck */}
            <Line x1="12" y1="6.5" x2="12" y2="8" stroke={color} strokeWidth="1.5" />
            {/* Torso */}
            <Path
                d="M 8 8 L 16 8 L 15 16 L 9 16 Z"
                stroke={color}
                strokeWidth="1.5"
                fill="none"
                strokeLinejoin="round"
            />
            {/* Abs lines */}
            <Line x1="12" y1="9" x2="12" y2="15" stroke={color} strokeWidth="0.75" opacity="0.5" />
            <Line x1="9.5" y1="11" x2="14.5" y2="11" stroke={color} strokeWidth="0.75" opacity="0.5" />
            <Line x1="9.5" y1="13" x2="14.5" y2="13" stroke={color} strokeWidth="0.75" opacity="0.5" />
            {/* Left arm */}
            <Path
                d="M 8 8 L 4 12 L 3 17"
                stroke={color}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* Right arm */}
            <Path
                d="M 16 8 L 20 12 L 21 17"
                stroke={color}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* Left leg */}
            <Path
                d="M 9 16 L 7 22"
                stroke={color}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
            />
            {/* Right leg */}
            <Path
                d="M 15 16 L 17 22"
                stroke={color}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
            />
        </Svg>
    );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Updated to match image size (44) for a tighter fit
const BUTTON_SIZE = 46;
// FIX: Constrain width to 90% of screen, maxing out at 400px
const EXPANDED_WIDTH = Math.min(SCREEN_WIDTH * 0.90, 400);
const BOTTOM_PADDING = 0; // Dropped to the very bottom
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
    const router = useRouter();
    const segments = useSegments();
    const insets = useSafeAreaInsets();

    const [isExpanded, setIsExpanded] = useState(true);
    const [toolsExpanded, setToolsExpanded] = useState(false);
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
        setToolsExpanded(false);
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

    // Tools box draggable logic
    const toolsPanX = useRef(new Animated.Value(0)).current;
    const toolsPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 5,
            onPanResponderGrant: () => {
                const currentVal = (toolsPanX as any)._value;
                toolsPanX.setOffset(currentVal);
                toolsPanX.setValue(0);
            },
            onPanResponderMove: Animated.event(
                [null, { dx: toolsPanX }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (_, gesture) => {
                toolsPanX.flattenOffset();

                // Constrain position within the nav bar roughly
                const currentX = (toolsPanX as any)._value;
                let targetX = currentX;

                // Initial position is visually right-aligned. Positive X moves it off-screen right. Negative X moves it left along the bar.
                if (targetX > 20) targetX = 0; // Don't let it go off the right edge too much
                else if (targetX < -EXPANDED_WIDTH + 60) targetX = -EXPANDED_WIDTH + 60; // Don't let it go off the left edge

                Animated.spring(toolsPanX, {
                    toValue: targetX,
                    useNativeDriver: false,
                    friction: 7,
                    tension: 50
                }).start();
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
        { route: 'grounding', icon: null, label: 'Wrex', isWrex: true },
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
                width: '100%',
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
                                        {(item as any).isWrex ? (
                                            <WrexNavIcon
                                                color={isFocused ? '#ffffff' : '#888888'}
                                                size={24}
                                            />
                                        ) : IconComponent ? (
                                            <IconComponent
                                                color={isFocused ? '#ffffff' : '#888888'}
                                                size={24}
                                            />
                                        ) : null}
                                    </TouchableOpacity>
                                );
                            })}
                        </Animated.View>
                    )}
                </View>
            </Animated.View>

            {/* Attached Floating Tools Box (Canvas & Focus) */}
            <Animated.View
                style={{
                    position: 'absolute',
                    right: 24, // Initial right margin
                    bottom: BUTTON_SIZE, // Exactly touching the top of the nav bar
                    opacity: navOpacity, // Fades out perfectly when nav bar collapses
                    alignItems: 'center',
                    pointerEvents: isExpanded ? 'auto' : 'none',
                    zIndex: 1001,
                    transform: [{ translateX: toolsPanX }]
                }}
                {...toolsPanResponder.panHandlers}
            >
                <View style={{
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    borderBottomLeftRadius: 0, // Flat bottom to seem 'attached'
                    borderBottomRightRadius: 0,
                    borderWidth: 1,
                    borderBottomWidth: 0,
                    borderColor: 'rgba(255,255,255,0.1)',
                    overflow: 'hidden',
                }}>
                    <View style={{ padding: 2, alignItems: 'center' }}>
                        {toolsExpanded ? (
                            <>
                                <TouchableOpacity onPress={() => { router.push('/canvas'); setToolsExpanded(false); }} style={{ padding: 6, marginBottom: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 }}>
                                    <PenTool color="#fff" size={16} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => { router.push('/focus'); setToolsExpanded(false); }} style={{ padding: 6, marginBottom: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 }}>
                                    <Timer color="#fff" size={16} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setToolsExpanded(false)} style={{ padding: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 }}>
                                    <X color="#fff" size={16} />
                                </TouchableOpacity>
                            </>
                        ) : (
                            <TouchableOpacity onPress={() => setToolsExpanded(true)} style={{ paddingVertical: 4, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }}>
                                <ChevronUp color="#ccc" size={16} />
                            </TouchableOpacity>
                        )}
                    </View>
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
