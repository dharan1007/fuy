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
    cancelAnimation,
    withSpring
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Chunk size determines how frequently we check for new content
const CHUNK_SIZE = 1000;

interface InfiniteCanvasProps {
    children: React.ReactNode;
    onRegionChange?: (region: { x: number, y: number, width: number, height: number }) => void;
    initialX?: number;
    initialY?: number;
    // Bounds for translation (negative values usually)
    // minX/Y: The minimum value translateX/Y can take (e.g., -5000)
    // maxX/Y: The maximum value translateX/Y can take (e.g., 0)
    bounds?: { minX: number; maxX: number; minY: number; maxY: number } | null;
}

export const InfiniteCanvas = ({
    children,
    onRegionChange,
    initialX = 0,
    initialY = 0,
    bounds
}: InfiniteCanvasProps) => {
    // Log to verify new code is loaded
    // console.log('[InfiniteCanvas] Using bounded version');

    // Shared values for translation
    const translateX = useSharedValue(-initialX);
    const translateY = useSharedValue(-initialY);

    // Track last region to avoid duplicate updates
    const [lastRegion, setLastRegion] = useState({ x: -9999, y: -9999 });

    // Context for gesture
    const context = useSharedValue({ x: 0, y: 0 });

    const panGesture = Gesture.Pan()
        .onStart(() => {
            cancelAnimation(translateX);
            cancelAnimation(translateY);
            context.value = { x: translateX.value, y: translateY.value };
        })
        .onUpdate((event) => {
            let nextX = context.value.x + event.translationX;
            let nextY = context.value.y + event.translationY;

            // Strict Rubberbanding or Clamping
            if (bounds) {
                // Formatting bounds for clarity:
                // If bounds.minX = -1000, bounds.maxX = 0
                // We want to resist pulling beyond these.

                // Simple Clamping for now as requested ("only let the scroll happen once loaded")
                // Adding a small resistance (rubberband) feel could be nice, but strict wall is safer for the requirement.

                // Rubber banding logic
                if (nextX > bounds.maxX) {
                    nextX = bounds.maxX + (nextX - bounds.maxX) * 0.2;
                } else if (nextX < bounds.minX) {
                    nextX = bounds.minX + (nextX - bounds.minX) * 0.2;
                }

                if (nextY > bounds.maxY) {
                    nextY = bounds.maxY + (nextY - bounds.maxY) * 0.2;
                } else if (nextY < bounds.minY) {
                    nextY = bounds.minY + (nextY - bounds.minY) * 0.2;
                }
            }

            translateX.value = nextX;
            translateY.value = nextY;
        })
        .onEnd((event) => {
            // Calculate potential decay targets
            // We use clamp in withDecay if boundaries exist because we want it to stop exactly there.

            if (bounds) {
                // If we are already out of bounds (due to rubberbanding), spring back immediately
                const currentX = translateX.value;
                const currentY = translateY.value;

                let targetX: number | null = null;
                let targetY: number | null = null;

                if (currentX > bounds.maxX) targetX = bounds.maxX;
                else if (currentX < bounds.minX) targetX = bounds.minX;

                if (currentY > bounds.maxY) targetY = bounds.maxY;
                else if (currentY < bounds.minY) targetY = bounds.minY;

                if (targetX !== null || targetY !== null) {
                    // Spring back
                    if (targetX !== null) translateX.value = withSpring(targetX);
                    else translateX.value = withDecay({ velocity: event.velocityX, clamp: [bounds.minX, bounds.maxX] });

                    if (targetY !== null) translateY.value = withSpring(targetY);
                    else translateY.value = withDecay({ velocity: event.velocityY, clamp: [bounds.minY, bounds.maxY] });

                    return;
                }

                // Otherwise decay normally but with clamp
                translateX.value = withDecay({
                    velocity: event.velocityX,
                    deceleration: 0.998,
                    clamp: [bounds.minX, bounds.maxX]
                });
                translateY.value = withDecay({
                    velocity: event.velocityY,
                    deceleration: 0.998,
                    clamp: [bounds.minY, bounds.maxY]
                });
            } else {
                // Unbounded decay
                translateX.value = withDecay({
                    velocity: event.velocityX,
                    deceleration: 0.998,
                });
                translateY.value = withDecay({
                    velocity: event.velocityY,
                    deceleration: 0.998,
                });
            }
        });

    // Block pinch gesture - does nothing but prevents any native zoom
    const pinchBlocker = Gesture.Pinch()
        .onStart(() => { })
        .onUpdate(() => { })
        .onEnd(() => { });

    // Combine gestures - pan works, pinch is blocked
    const combinedGesture = Gesture.Simultaneous(panGesture, pinchBlocker);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
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
                    width: SCREEN_WIDTH,
                    height: SCREEN_HEIGHT
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
            <GestureDetector gesture={combinedGesture}>
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
