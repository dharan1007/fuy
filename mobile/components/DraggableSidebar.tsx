import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, Animated, PanResponder, Dimensions, StyleSheet } from 'react-native';
import { LayoutDashboard, Check, PenTool, Timer } from 'lucide-react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUTTON_SIZE = 30;
const MARGIN = 0;

// Custom WREX Body Icon Component
function WrexIcon({ color, size = 16 }: { color: string; size?: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            {/* Head */}
            <Circle cx="12" cy="4" r="2.5" stroke={color} strokeWidth="1.5" fill="none" />
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

export default function DraggableSidebar() {
    const { colors } = useTheme();
    const router = useRouter();

    const pan = useRef(new Animated.ValueXY({ x: 0, y: SCREEN_HEIGHT / 2 - BUTTON_SIZE })).current;
    const [isDragging, setIsDragging] = useState(false);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5,
            onPanResponderGrant: () => {
                setIsDragging(true);
                pan.setOffset({
                    x: (pan.x as any)._value,
                    y: (pan.y as any)._value
                });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (_, gesture) => {
                setIsDragging(false);
                pan.flattenOffset();

                const currentX = (pan.x as any)._value;
                const currentY = (pan.y as any)._value;

                let targetX = 0;
                if (currentX + BUTTON_SIZE / 2 > SCREEN_WIDTH / 2) {
                    targetX = SCREEN_WIDTH - BUTTON_SIZE;
                }

                let targetY = currentY;
                if (targetY < 100) targetY = 100;
                if (targetY > SCREEN_HEIGHT - 200) targetY = SCREEN_HEIGHT - 200;

                Animated.spring(pan, {
                    toValue: { x: targetX, y: targetY },
                    useNativeDriver: false,
                    friction: 6,
                    tension: 40
                }).start();
            }
        })
    ).current;

    return (
        <Animated.View
            style={{
                position: 'absolute',
                zIndex: 900,
                transform: [{ translateX: pan.x }, { translateY: pan.y }],
            }}
            {...panResponder.panHandlers}
        >
            <View style={styles.container}>
                <TouchableOpacity
                    onPress={() => !isDragging && router.push('/dashboard')}
                    style={[styles.circleButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                    <LayoutDashboard color={colors.text} size={16} />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => !isDragging && router.push('/tasks')}
                    style={[styles.circleButton, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 8 }]}
                >
                    <Check color={colors.text} size={16} />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => !isDragging && router.push('/canvas')}
                    style={[styles.circleButton, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 8 }]}
                >
                    <PenTool color={colors.text} size={16} />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => !isDragging && router.push('/focus')}
                    style={[styles.circleButton, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 8 }]}
                >
                    <Timer color={colors.text} size={16} />
                </TouchableOpacity>

                {/* WREX Body Icon */}
                <TouchableOpacity
                    onPress={() => !isDragging && router.push('/grounding')}
                    style={[styles.circleButton, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 8 }]}
                >
                    <WrexIcon color={colors.text} size={16} />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: 4,
    },
    circleButton: {
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        borderRadius: BUTTON_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        // Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    }
});
