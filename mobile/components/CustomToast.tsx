import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay } from 'react-native-reanimated';
import { CheckCircle2, AlertCircle } from 'lucide-react-native';

export type ToastType = 'success' | 'error' | 'info';

export interface CustomToastProps {
    visible: boolean;
    message: string;
    type?: ToastType;
    onHide: () => void;
}

export default function CustomToast({ visible, message, type = 'success', onHide }: CustomToastProps) {
    const translateY = useSharedValue(-100);
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            translateY.value = withSpring(50, { damping: 12, stiffness: 90 });
            opacity.value = withTiming(1, { duration: 300 });

            // Auto hide after 3 seconds
            const timeout = setTimeout(() => {
                translateY.value = withTiming(-100, { duration: 300 });
                opacity.value = withTiming(0, { duration: 300 });
                setTimeout(onHide, 300); // Wait for animation to finish
            }, 3000);

            return () => clearTimeout(timeout);
        } else {
            translateY.value = withTiming(-100, { duration: 300 });
            opacity.value = withTiming(0, { duration: 300 });
        }
    }, [visible, message]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
            opacity: opacity.value,
        };
    });

    return (
        <Animated.View style={[styles.container, animatedStyle]} pointerEvents="none">
            <View style={styles.content}>
                {type === 'success' ? (
                    <CheckCircle2 color="#FFFFFF" size={20} />
                ) : (
                    <AlertCircle color="#FFFFFF" size={20} />
                )}
                <Text style={styles.text}>{message}</Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9999,
        elevation: 9999,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111111',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 26,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        gap: 8,
    },
    text: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    }
});
