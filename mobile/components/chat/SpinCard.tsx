/**
 * /spin sub-component: SpinCard
 *
 * SVG wheel rendered via react-native-svg. Rotation animation via
 * Animated.timing (2.8s, Easing.out cubic). Result broadcast so both
 * users see the same winner. "Spin Again" button after result.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import Svg, { Path, G, Text as SvgText } from 'react-native-svg';
import { ChannelPool } from '../../lib/ChannelPool';
import * as Haptics from 'expo-haptics';

export interface SpinData {
    id: string;
    options: string[];
    result?: number; // index of winner
}

interface SpinCardProps {
    spin: SpinData;
    roomId: string;
    currentUserId: string;
    isMe: boolean;
}

const WHEEL_SIZE = 200;
const WHEEL_RADIUS = WHEEL_SIZE / 2;

const COLORS = [
    '#EF4444', '#3B82F6', '#10B981', '#F59E0B',
    '#EC4899', '#8B5CF6', '#06B6D4', '#F97316',
];

const AnimatedG = Animated.createAnimatedComponent(G);

export const SpinCard: React.FC<SpinCardProps> = ({
    spin,
    roomId,
    currentUserId,
    isMe,
}) => {
    const [result, setResult] = useState<number | undefined>(spin.result);
    const [isSpinning, setIsSpinning] = useState(false);
    const rotationAnim = useRef(new Animated.Value(0)).current;
    const currentRotation = useRef(0);

    const segmentAngle = 360 / spin.options.length;

    // Listen for spin results from partner
    useEffect(() => {
        const unsub = ChannelPool.on(roomId, 'spin:result', (payload: any) => {
            if (payload.spinId !== spin.id) return;
            if (payload.userId === currentUserId) return;

            // Animate to the same result
            animateToResult(payload.resultIndex);
        });

        return unsub;
    }, [roomId, spin.id, currentUserId]);

    const animateToResult = (targetIndex: number) => {
        setIsSpinning(true);

        // Calculate target rotation: 3 full spins + land on target segment
        const targetAngle = 360 * 3 + (360 - targetIndex * segmentAngle - segmentAngle / 2);

        Animated.timing(rotationAnim, {
            toValue: currentRotation.current + targetAngle,
            duration: 2800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start(() => {
            currentRotation.current += targetAngle;
            setResult(targetIndex);
            setIsSpinning(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        });
    };

    const handleSpin = () => {
        if (isSpinning) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        // Pick a random result
        const targetIndex = Math.floor(Math.random() * spin.options.length);

        // Broadcast result to partner
        ChannelPool.emit(roomId, 'spin:result', {
            spinId: spin.id,
            resultIndex: targetIndex,
            userId: currentUserId,
        });

        animateToResult(targetIndex);
    };

    const spinAgain = () => {
        setResult(undefined);
        handleSpin();
    };

    // Build SVG pie segments
    const renderWheel = () => {
        const segments = spin.options.map((option, i) => {
            const startAngle = i * segmentAngle;
            const endAngle = (i + 1) * segmentAngle;
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;

            const x1 = WHEEL_RADIUS + WHEEL_RADIUS * Math.cos(startRad);
            const y1 = WHEEL_RADIUS + WHEEL_RADIUS * Math.sin(startRad);
            const x2 = WHEEL_RADIUS + WHEEL_RADIUS * Math.cos(endRad);
            const y2 = WHEEL_RADIUS + WHEEL_RADIUS * Math.sin(endRad);

            const largeArc = segmentAngle > 180 ? 1 : 0;

            const d = `M${WHEEL_RADIUS},${WHEEL_RADIUS} L${x1},${y1} A${WHEEL_RADIUS},${WHEEL_RADIUS} 0 ${largeArc},1 ${x2},${y2} Z`;

            // Text position (center of arc)
            const midRad = ((startAngle + endAngle) / 2) * (Math.PI / 180);
            const textR = WHEEL_RADIUS * 0.65;
            const tx = WHEEL_RADIUS + textR * Math.cos(midRad);
            const ty = WHEEL_RADIUS + textR * Math.sin(midRad);

            return (
                <G key={i}>
                    <Path d={d} fill={COLORS[i % COLORS.length]} />
                    <SvgText
                        x={tx}
                        y={ty}
                        fill="#fff"
                        fontSize={10}
                        fontWeight="bold"
                        textAnchor="middle"
                        alignmentBaseline="central"
                    >
                        {option.length > 8 ? option.substring(0, 7) + '..' : option}
                    </SvgText>
                </G>
            );
        });

        return segments;
    };

    const rotateStr = rotationAnim.interpolate({
        inputRange: [0, 360],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View
            style={{
                alignItems: 'center',
                padding: 16,
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
                width: 240,
            }}
        >
            {/* Header */}
            <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
                Spin Wheel
            </Text>

            {/* Wheel */}
            <View style={{ position: 'relative', marginBottom: 12 }}>
                {/* Pointer triangle */}
                <View
                    style={{
                        position: 'absolute',
                        top: -8,
                        left: WHEEL_RADIUS - 8,
                        zIndex: 10,
                        width: 0,
                        height: 0,
                        borderLeftWidth: 8,
                        borderRightWidth: 8,
                        borderTopWidth: 14,
                        borderLeftColor: 'transparent',
                        borderRightColor: 'transparent',
                        borderTopColor: '#fff',
                    }}
                />

                <Animated.View style={{ transform: [{ rotate: rotateStr }] }}>
                    <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
                        {renderWheel()}
                    </Svg>
                </Animated.View>
            </View>

            {/* Result */}
            {result !== undefined && !isSpinning && (
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
                    {spin.options[result]}
                </Text>
            )}

            {/* Spin / Spin Again Button */}
            <TouchableOpacity
                onPress={result !== undefined ? spinAgain : handleSpin}
                disabled={isSpinning}
                style={{
                    paddingHorizontal: 24,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: isSpinning ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                    opacity: isSpinning ? 0.5 : 1,
                }}
            >
                <Text style={{ color: isSpinning ? '#fff' : '#000', fontSize: 13, fontWeight: '700' }}>
                    {isSpinning ? 'Spinning...' : result !== undefined ? 'Spin Again' : 'Spin!'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default SpinCard;
