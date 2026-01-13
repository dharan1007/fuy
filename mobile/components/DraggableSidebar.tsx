import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, Animated, PanResponder, Dimensions, StyleSheet } from 'react-native';
import { LayoutDashboard, Check } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUTTON_SIZE = 30; // Reduced from 50
const MARGIN = 0; // Removed margin to attach to side

export default function DraggableSidebar() {
    const { colors } = useTheme();
    const router = useRouter();

    // Initial position: Left side, vertically centered
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

                // Snap Logic
                // X: Snap to Left (0) or Right (SCREEN_WIDTH - BUTTON_SIZE)
                let targetX = 0;
                if (currentX + BUTTON_SIZE / 2 > SCREEN_WIDTH / 2) {
                    targetX = SCREEN_WIDTH - BUTTON_SIZE;
                }

                // Y: Constrain within screen bounds (with padding)
                let targetY = currentY;
                if (targetY < 100) targetY = 100; // Top Buffer
                if (targetY > SCREEN_HEIGHT - 200) targetY = SCREEN_HEIGHT - 200; // Bottom Buffer

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
                {/* Visual Indicator of Drag Handle if needed, or just draggable buttons */}

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
