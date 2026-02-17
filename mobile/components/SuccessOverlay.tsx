import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, Animated, Dimensions, StyleSheet } from 'react-native';
import { Check, Sparkles } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface SuccessOverlayProps {
    visible: boolean;
    message?: string;
    onFinish: () => void;
}

export default function SuccessOverlay({ visible, message = 'Your post is live.', onFinish }: SuccessOverlayProps) {
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 7,
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
            scaleAnim.setValue(0.8);
            fadeAnim.setValue(0);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal transparent animationType="none" visible={visible}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                {/* Full Screen Blur Backdrop */}
                <BlurView
                    intensity={40}
                    tint="dark"
                    style={StyleSheet.absoluteFill}
                />

                <Animated.View
                    style={{
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                    }}
                >
                    {/* Glass Card */}
                    <BlurView
                        intensity={80}
                        tint="dark"
                        style={{
                            overflow: 'hidden',
                            borderRadius: 32,
                            width: width * 0.75,
                            maxWidth: 340,
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.1)',
                        }}
                    >
                        <View style={{ padding: 32, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>

                            {/* Icon Circle with Gradient & Glow */}
                            <View style={{ marginBottom: 24, shadowColor: "#22c55e", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 12 }}>
                                <LinearGradient
                                    colors={['#22c55e', '#15803d']} // Vibrant Green Gradient
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: 40,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderWidth: 2,
                                        borderColor: 'rgba(255,255,255,0.2)'
                                    }}
                                >
                                    <Check size={40} color="white" strokeWidth={3.5} />
                                    {/* Subtle Sparkle Accent */}
                                    <View style={{ position: 'absolute', top: 12, right: 14, opacity: 0.8 }}>
                                        <Sparkles size={12} color="rgba(255,255,255,0.8)" fill="white" />
                                    </View>
                                </LinearGradient>
                            </View>

                            {/* Title */}
                            <Text style={{
                                color: '#fff',
                                fontSize: 22,
                                fontWeight: '800',
                                textAlign: 'center',
                                marginBottom: 8,
                                letterSpacing: 0.5
                            }}>
                                Success!
                            </Text>

                            {/* Message */}
                            <Text style={{
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: 15,
                                textAlign: 'center',
                                marginBottom: 32,
                                lineHeight: 22
                            }}>
                                {message}
                            </Text>

                            {/* Gradient Button */}
                            <TouchableOpacity
                                onPress={onFinish}
                                activeOpacity={0.8}
                                style={{ width: '100%', shadowColor: "white", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 10 }}
                            >
                                <LinearGradient
                                    colors={['#ffffff', '#e2e2e2']} // White Gradient
                                    style={{
                                        width: '100%',
                                        paddingVertical: 16,
                                        borderRadius: 18,
                                        alignItems: 'center'
                                    }}
                                >
                                    <Text style={{
                                        color: '#000',
                                        fontWeight: '800',
                                        fontSize: 16,
                                        letterSpacing: 1,
                                        textTransform: 'uppercase'
                                    }}>
                                        Done
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>

                        </View>
                    </BlurView>
                </Animated.View>
            </View>
        </Modal>
    );
}
