import React, { useEffect, useRef } from 'react';
import { Text, Animated, View, TouchableOpacity, Platform } from 'react-native';
import { Check, X, AlertCircle, Info } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

export type ToastType = 'success' | 'error' | 'info';

interface CustomToastProps {
    message: string;
    type: ToastType;
    onHide: () => void;
}

export default function CustomToast({ message, type, onHide }: CustomToastProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        // Show
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: Platform.OS === 'ios' ? 60 : 40, // Top offset
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto hide handled by parent or manual close
    }, []);

    const getIcon = () => {
        switch (type) {
            case 'success': return <Check color="#000" size={16} />;
            case 'error': return <X color="#fff" size={16} />;
            default: return <Info color="#fff" size={16} />;
        }
    };

    const getBgColor = () => {
        switch (type) {
            case 'success': return 'bg-white';
            case 'error': return 'bg-red-500';
            default: return 'bg-blue-500';
        }
    };

    return (
        <Animated.View
            style={{
                position: 'absolute',
                top: 0,
                transform: [{ translateY: slideAnim }],
                left: 20,
                right: 20,
                opacity: fadeAnim,
                zIndex: 9999,
                alignItems: 'center'
            }}
        >
            <BlurView intensity={80} tint="dark" className="overflow-hidden rounded-2xl w-full max-w-sm mx-auto p-1 border border-white/10">
                <View className="bg-black/60 px-4 py-3 rounded-xl flex-row items-center gap-3">
                    <View className={`w-6 h-6 rounded-full items-center justify-center ${getBgColor()}`}>
                        {getIcon()}
                    </View>
                    <Text className="flex-1 text-white font-medium text-sm tracking-wide">
                        {message}
                    </Text>
                </View>
            </BlurView>
        </Animated.View>
    );
}
