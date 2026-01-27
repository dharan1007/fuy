import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import Svg, { Rect, Circle, G } from 'react-native-svg';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';

interface HumanBodySVGProps {
    onPartClick?: (partName: string) => void;
    selectedPart?: string | null;
    width?: number;
    height?: number;
    initialGender?: 'male' | 'female';
    initialSide?: 'front' | 'back';
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Side = 'front' | 'back';
type BodyGender = 'male' | 'female';

// Matching web version dimensions
const BOARD_W = 320;
const BOARD_H = 540;

interface BodyShape {
    id: string;
    label: string;
    kind: 'circle' | 'rect';
    x?: number; y?: number; w?: number; h?: number; rx?: number;
    cx?: number; cy?: number; r?: number;
    rotation?: number;
}

// Generate shapes matching web version
const createHumanShapes = (gender: BodyGender, side: Side): BodyShape[] => {
    const isMale = gender === 'male';
    const shoulderW = isMale ? 120 : 90;
    const hipW = isMale ? 75 : 100;
    const chestW = isMale ? 110 : 90;
    const waistW = isMale ? 85 : 70;
    const CX = BOARD_W / 2;

    const common: BodyShape[] = [
        { kind: 'rect', id: 'neck', label: 'Neck', x: CX - 15, y: 75, w: 30, h: 40, rx: 0 },
        { kind: 'circle', id: 'head', label: 'Head', cx: CX, cy: 50, r: 35 },
    ];

    const shoulders: BodyShape[] = [
        { kind: 'rect', id: 'shoulders', label: 'L-Shoulder', x: CX - shoulderW / 2, y: 100, w: 40, h: 40, rx: 4 },
        { kind: 'rect', id: 'shoulders', label: 'R-Shoulder', x: CX + shoulderW / 2 - 40, y: 100, w: 40, h: 40, rx: 4 },
    ];

    const startY = 140;
    const torso: BodyShape[] = side === 'front' ? [
        { kind: 'rect', id: 'chest', label: 'Chest', x: CX - chestW / 2, y: startY, w: chestW, h: 60, rx: 4 },
        { kind: 'rect', id: 'abdomen', label: 'Abdomen', x: CX - waistW / 2, y: startY + 65, w: waistW, h: 65, rx: 4 },
        { kind: 'rect', id: 'hips', label: 'Pelvis', x: CX - hipW / 2, y: startY + 135, w: hipW, h: 50, rx: 4 },
    ] : [
        { kind: 'rect', id: 'upperBack', label: 'Upper Back', x: CX - chestW / 2, y: startY, w: chestW, h: 80, rx: 4 },
        { kind: 'rect', id: 'lowerBack', label: 'Lower Back', x: CX - waistW / 2, y: startY + 85, w: waistW, h: 45, rx: 4 },
        { kind: 'rect', id: 'hips', label: 'Hips', x: CX - hipW / 2, y: startY + 135, w: hipW, h: 50, rx: 4 },
    ];

    const armW = 32;
    const armXOffset = isMale ? 10 : 5;
    const armX_L = CX - shoulderW / 2 - armW + armXOffset;
    const armX_R = CX + shoulderW / 2 - armXOffset;

    const arms: BodyShape[] = [
        { kind: 'rect', id: 'arms', label: 'L-Arm', x: armX_L - 10, y: 125, w: armW, h: 90, rx: 4, rotation: 5 },
        { kind: 'rect', id: 'arms', label: 'R-Arm', x: armX_R + 10, y: 125, w: armW, h: 90, rx: 4, rotation: -5 },
        { kind: 'rect', id: 'forearms', label: 'L-Forearm', x: armX_L - 25, y: 210, w: 30, h: 80, rx: 4, rotation: 8 },
        { kind: 'rect', id: 'forearms', label: 'R-Forearm', x: armX_R + 25, y: 210, w: 30, h: 80, rx: 4, rotation: -8 },
        { kind: 'circle', id: 'hands', label: 'L-Hand', cx: armX_L - 28, cy: 305, r: 16 },
        { kind: 'circle', id: 'hands', label: 'R-Hand', cx: armX_R + 45, cy: 305, r: 16 },
    ];

    const legW = 38;
    const legX_L = CX - hipW / 2 - (isMale ? 10 : 0);
    const legX_R = CX + hipW / 2 - legW + (isMale ? 10 : 0);

    const legs: BodyShape[] = [
        { kind: 'rect', id: 'thighs', label: 'L-Thigh', x: legX_L, y: 325, w: legW, h: 100, rx: 4, rotation: 3 },
        { kind: 'rect', id: 'thighs', label: 'R-Thigh', x: legX_R, y: 325, w: legW, h: 100, rx: 4, rotation: -3 },
        { kind: 'rect', id: 'calves', label: 'L-Calf', x: legX_L + 2, y: 420, w: 34, h: 90, rx: 4, rotation: 1 },
        { kind: 'rect', id: 'calves', label: 'R-Calf', x: legX_R + 2, y: 420, w: 34, h: 90, rx: 4, rotation: -1 },
        { kind: 'rect', id: 'feet', label: 'L-Foot', x: legX_L - 8, y: 505, w: 40, h: 20, rx: 2 },
        { kind: 'rect', id: 'feet', label: 'R-Foot', x: legX_R + 5, y: 505, w: 40, h: 20, rx: 2 },
    ];

    return [...common, ...shoulders, ...torso, ...arms, ...legs];
};

export default function HumanBodySVG({
    onPartClick,
    selectedPart,
    width = SCREEN_WIDTH * 0.85,
    height = 480,
    initialGender = 'male',
    initialSide = 'front'
}: HumanBodySVGProps) {
    const [hoveredPart, setHoveredPart] = useState<string | null>(null);
    const [gender, setGender] = useState<BodyGender>(initialGender);
    const [side, setSide] = useState<Side>(initialSide);

    const shapes = useMemo(() => createHumanShapes(gender, side), [gender, side]);

    // Pinch-to-zoom state
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const offsetX = useSharedValue(0);
    const offsetY = useSharedValue(0);
    const savedOffsetX = useSharedValue(0);
    const savedOffsetY = useSharedValue(0);

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = Math.min(Math.max(savedScale.value * e.scale, 0.5), 3);
        })
        .onEnd(() => {
            savedScale.value = scale.value;
        });

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            if (scale.value > 1) {
                offsetX.value = savedOffsetX.value + e.translationX;
                offsetY.value = savedOffsetY.value + e.translationY;
            }
        })
        .onEnd(() => {
            savedOffsetX.value = offsetX.value;
            savedOffsetY.value = offsetY.value;
        });

    const doubleTapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            if (scale.value > 1) {
                scale.value = withSpring(1);
                savedScale.value = 1;
                offsetX.value = withSpring(0);
                offsetY.value = withSpring(0);
                savedOffsetX.value = 0;
                savedOffsetY.value = 0;
            } else {
                scale.value = withSpring(2);
                savedScale.value = 2;
            }
        });

    const composedGesture = Gesture.Simultaneous(
        pinchGesture,
        Gesture.Race(panGesture, doubleTapGesture)
    );

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { scale: scale.value },
                { translateX: offsetX.value },
                { translateY: offsetY.value },
            ] as const,
        };
    });

    const handleShapePress = useCallback((shape: BodyShape) => {
        if (onPartClick) {
            onPartClick(shape.label);
        }
    }, [onPartClick]);

    const handleGenderChange = useCallback((newGender: BodyGender) => {
        setGender(newGender);
    }, []);

    const handleSideChange = useCallback((newSide: Side) => {
        setSide(newSide);
    }, []);

    const getShapeStroke = (shape: BodyShape) => {
        if (selectedPart === shape.label) return '#FFFFFF';
        if (hoveredPart === shape.label) return '#FFFFFF';
        return '#444444';
    };

    const getShapeStrokeWidth = (shape: BodyShape) => {
        if (selectedPart === shape.label) return 2;
        if (hoveredPart === shape.label) return 2;
        return 1;
    };

    const svgWidth = Math.min(width, 320);
    const svgHeight = height;

    return (
        <View style={[styles.container, { width }]}>
            {/* Toggle Controls */}
            <View style={styles.controlsRow}>
                {/* Front/Back Toggle */}
                <View style={styles.toggleGroup}>
                    <TouchableOpacity
                        onPress={() => handleSideChange('front')}
                        style={[
                            styles.toggleBtn,
                            styles.toggleBtnLeft,
                            side === 'front' && styles.toggleBtnActive
                        ]}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.toggleBtnText,
                            side === 'front' && styles.toggleBtnTextActive
                        ]}>FRONT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => handleSideChange('back')}
                        style={[
                            styles.toggleBtn,
                            styles.toggleBtnRight,
                            side === 'back' && styles.toggleBtnActive
                        ]}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.toggleBtnText,
                            side === 'back' && styles.toggleBtnTextActive
                        ]}>DORSAL</Text>
                    </TouchableOpacity>
                </View>

                {/* Gender Toggle */}
                <View style={styles.toggleGroup}>
                    <TouchableOpacity
                        onPress={() => handleGenderChange('male')}
                        style={[
                            styles.toggleBtn,
                            styles.toggleBtnLeft,
                            gender === 'male' && styles.toggleBtnActiveAlt
                        ]}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.toggleBtnText,
                            gender === 'male' && styles.toggleBtnTextActiveAlt
                        ]}>XY</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => handleGenderChange('female')}
                        style={[
                            styles.toggleBtn,
                            styles.toggleBtnRight,
                            gender === 'female' && styles.toggleBtnActiveAlt
                        ]}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.toggleBtnText,
                            gender === 'female' && styles.toggleBtnTextActiveAlt
                        ]}>XX</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Body Map */}
            <GestureHandlerRootView style={styles.gestureContainer}>
                <GestureDetector gesture={composedGesture}>
                    <Animated.View style={[styles.svgContainer, animatedStyle]}>
                        <Svg
                            width={svgWidth}
                            height={svgHeight}
                            viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
                        >
                            {/* Grid background */}
                            <G opacity={0.1}>
                                {Array.from({ length: 17 }).map((_, i) => (
                                    <Rect key={`h-${i}`} x={0} y={i * 32} width={BOARD_W} height={1} fill="#444" />
                                ))}
                                {Array.from({ length: 10 }).map((_, i) => (
                                    <Rect key={`v-${i}`} x={i * 32} y={0} width={1} height={BOARD_H} fill="#444" />
                                ))}
                            </G>

                            {/* Body shapes */}
                            <G>
                                {shapes.map((shape, index) => {
                                    const stroke = getShapeStroke(shape);
                                    const strokeWidth = getShapeStrokeWidth(shape);

                                    if (shape.kind === 'circle') {
                                        return (
                                            <Circle
                                                key={index}
                                                cx={shape.cx}
                                                cy={shape.cy}
                                                r={shape.r}
                                                fill="none"
                                                stroke={stroke}
                                                strokeWidth={strokeWidth}
                                                onPress={() => handleShapePress(shape)}
                                                onPressIn={() => setHoveredPart(shape.label)}
                                                onPressOut={() => setHoveredPart(null)}
                                            />
                                        );
                                    } else {
                                        const transform = shape.rotation
                                            ? `rotate(${shape.rotation}, ${(shape.x || 0) + (shape.w || 0) / 2}, ${(shape.y || 0) + (shape.h || 0) / 2})`
                                            : undefined;
                                        return (
                                            <Rect
                                                key={index}
                                                x={shape.x}
                                                y={shape.y}
                                                width={shape.w}
                                                height={shape.h}
                                                rx={shape.rx}
                                                fill="none"
                                                stroke={stroke}
                                                strokeWidth={strokeWidth}
                                                transform={transform}
                                                onPress={() => handleShapePress(shape)}
                                                onPressIn={() => setHoveredPart(shape.label)}
                                                onPressOut={() => setHoveredPart(null)}
                                            />
                                        );
                                    }
                                })}
                            </G>
                        </Svg>
                    </Animated.View>
                </GestureDetector>
            </GestureHandlerRootView>

            {/* Hovered Region Label */}
            <View style={styles.labelContainer}>
                <Text style={styles.hoveredLabel}>
                    {hoveredPart || selectedPart || ''}
                </Text>
            </View>

            <Text style={styles.hint}>Pinch to zoom | Double-tap to reset</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 8,
        marginBottom: 12,
    },
    toggleGroup: {
        flexDirection: 'row',
    },
    toggleBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'transparent',
    },
    toggleBtnLeft: {
        borderTopLeftRadius: 4,
        borderBottomLeftRadius: 4,
        borderRightWidth: 0,
    },
    toggleBtnRight: {
        borderTopRightRadius: 4,
        borderBottomRightRadius: 4,
    },
    toggleBtnActive: {
        backgroundColor: '#FFFFFF',
        borderColor: '#FFFFFF',
    },
    toggleBtnActiveAlt: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderColor: 'rgba(255,255,255,0.3)',
    },
    toggleBtnText: {
        fontSize: 10,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
    },
    toggleBtnTextActive: {
        color: '#000000',
    },
    toggleBtnTextActiveAlt: {
        color: 'rgba(255,255,255,0.8)',
    },
    gestureContainer: {
        flex: 1,
        overflow: 'hidden',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    svgContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    labelContainer: {
        height: 24,
        justifyContent: 'center',
        marginTop: 8,
    },
    hoveredLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FF0000',
        textTransform: 'uppercase',
        letterSpacing: 2,
        fontFamily: 'monospace',
    },
    hint: {
        fontSize: 10,
        color: '#666666',
        marginTop: 4,
    },
});
