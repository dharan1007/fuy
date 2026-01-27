import React, { useCallback, useEffect, useState } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withDecay,
    withTiming,
    runOnJS,
    useDerivedValue,
    cancelAnimation
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Chunk size determines how frequently we check for new content
const CHUNK_SIZE = 1000;

interface InfiniteCanvasProps {
    children: React.ReactNode;
    onRegionChange?: (region: { x: number, y: number, width: number, height: number }) => void;
    initialX?: number;
    initialY?: number;
}

export const InfiniteCanvas = ({
    children,
    onRegionChange,
    initialX = 0,
    initialY = 0
}: InfiniteCanvasProps) => {
    // Shared values for translation
    const translateX = useSharedValue(-initialX);
    const translateY = useSharedValue(-initialY);

    // Track last region to avoid duplicate updates
    const [lastRegion, setLastRegion] = useState({ x: -9999, y: -9999 });

    // Context for gesture
    const context = useSharedValue({ x: 0, y: 0 });

    // Zoom scale state
    const scale = useSharedValue(1);
    const startScale = useSharedValue(1);

    const pinchGesture = Gesture.Pinch()
        .onStart(() => {
            startScale.value = scale.value;
        })
        .onUpdate((event) => {
            // Clamping scale between 0.3 and 3
            scale.value = Math.max(0.3, Math.min(3, startScale.value * event.scale));
        });

    const panGesture = Gesture.Pan()
        .onStart(() => {
            cancelAnimation(translateX);
            cancelAnimation(translateY);
            context.value = { x: translateX.value, y: translateY.value };
        })
        .onUpdate((event) => {
            // Adjust translation speed based on scale? Optional, but feels better
            // Ideally panning matches finger movement regardless of scale
            translateX.value = context.value.x + event.translationX / scale.value;
            translateY.value = context.value.y + event.translationY / scale.value;
        })
        .onEnd((event) => {
            translateX.value = withDecay({
                velocity: event.velocityX / scale.value,
                deceleration: 0.998,
            });
            translateY.value = withDecay({
                velocity: event.velocityY / scale.value,
                deceleration: 0.998,
            });
        });

    // Combine gestures
    const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { scale: scale.value },
                { translateX: translateX.value },
                { translateY: translateY.value }
            ] as any,
        };
    });

    // Monitor position to trigger updates
    useDerivedValue(() => {
        const currentX = -translateX.value;
        const currentY = -translateY.value;

        // Calculate current center chunk
        const chunkX = Math.floor(currentX / CHUNK_SIZE);
        const chunkY = Math.floor(currentY / CHUNK_SIZE);

        if (chunkX !== lastRegion.x || chunkY !== lastRegion.y) {
            runOnJS(setLastRegion)({ x: chunkX, y: chunkY });
            if (onRegionChange) {
                runOnJS(onRegionChange)({
                    x: currentX,
                    y: currentY,
                    width: SCREEN_WIDTH / scale.value, // viewport grows when zoomed out
                    height: SCREEN_HEIGHT / scale.value
                });
            }
        }
    });

    // Trigger initial region change on mount
    useEffect(() => {
        if (onRegionChange) {
            onRegionChange({
                x: -translateX.value,
                y: -translateY.value,
                width: SCREEN_WIDTH,
                height: SCREEN_HEIGHT
            });
        }
    }, []);

    return (
        <View style={styles.container}>
            <GestureDetector gesture={composedGesture}>
                <View style={styles.contentContainer}>
                    <Animated.View style={[styles.canvas, animatedStyle]}>
                        {children}
                    </Animated.View>
                </View>
            </GestureDetector>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        overflow: 'hidden',
    },
    contentContainer: {
        flex: 1,
    },
    canvas: {
        flex: 1,
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
    }
});
