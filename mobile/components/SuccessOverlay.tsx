import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Check } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface SuccessOverlayProps {
    visible: boolean;
    message?: string;
    onFinish: () => void;
}

export default function SuccessOverlay({ visible, message = 'Posted Successfully!', onFinish }: SuccessOverlayProps) {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            scaleAnim.setValue(0);
            fadeAnim.setValue(0);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" visible={visible}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}>
                <BlurView intensity={20} tint="dark" style={{ position: 'absolute', width, height }} />

                <Animated.View
                    style={{
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#1a1a1a',
                        padding: 32,
                        borderRadius: 32,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.1)',
                        width: width * 0.7,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.3,
                        shadowRadius: 20,
                        elevation: 10
                    }}
                >
                    <View style={{
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        backgroundColor: '#22c55e',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 24,
                        shadowColor: "#22c55e",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.4,
                        shadowRadius: 12,
                    }}>
                        <Check size={40} color="#fff" strokeWidth={3} />
                    </View>

                    <Text style={{
                        color: '#fff',
                        fontSize: 20,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        marginBottom: 8,
                        letterSpacing: 0.5
                    }}>
                        Success!
                    </Text>

                    <Text style={{
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: 14,
                        textAlign: 'center',
                        marginBottom: 32
                    }}>
                        {message}
                    </Text>

                    <TouchableOpacity
                        onPress={onFinish}
                        style={{
                            backgroundColor: '#fff',
                            paddingVertical: 14,
                            paddingHorizontal: 32,
                            borderRadius: 16,
                            width: '100%',
                            alignItems: 'center'
                        }}
                    >
                        <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 16 }}>Done</Text>
                    </TouchableOpacity>

                </Animated.View>
            </View>
        </Modal>
    );
}
