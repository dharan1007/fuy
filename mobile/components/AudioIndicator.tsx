/**
 * AudioIndicator - Marquee-style audio attribution bar
 * Shown at the bottom of video/audio posts to indicate the audio source.
 * Tapping navigates to the Audio Detail Page.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Music } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export interface AudioInfo {
    audioAssetId: string;
    audioTitle?: string;
    audioCreatorName?: string;
    isOriginalAudio?: boolean;
}

interface AudioIndicatorProps {
    audioInfo: AudioInfo;
}

export default function AudioIndicator({ audioInfo }: AudioIndicatorProps) {
    const router = useRouter();
    const scrollAnim = useRef(new Animated.Value(0)).current;

    const label = audioInfo.isOriginalAudio
        ? `Original audio - @${audioInfo.audioCreatorName}`
        : `${audioInfo.audioTitle} - @${audioInfo.audioCreatorName}`;

    useEffect(() => {
        // Marquee scroll animation
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(scrollAnim, {
                    toValue: -200,
                    duration: 6000,
                    useNativeDriver: true,
                }),
                Animated.timing(scrollAnim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [scrollAnim]);

    const handlePress = () => {
        router.push(`/audio/${audioInfo.audioAssetId}`);
    };

    return (
        <TouchableOpacity onPress={handlePress} style={styles.container} activeOpacity={0.7}>
            <View style={styles.iconBox}>
                <Music size={12} color="#fff" />
            </View>
            <View style={styles.textContainer}>
                <Animated.Text
                    style={[styles.label, { transform: [{ translateX: scrollAnim }] }]}
                    numberOfLines={1}
                >
                    {label}
                </Animated.Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 6,
    },
    iconBox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    textContainer: {
        flex: 1,
        overflow: 'hidden',
    },
    label: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        width: 400,
    },
});
