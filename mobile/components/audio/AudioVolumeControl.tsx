import React from 'react';
import { View, Text, StyleSheet, Pressable, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AudioVolumeControlProps {
    label: string;
    volume: number;
    isMuted?: boolean;
    onVolumeChange: (volume: number) => void;
    onMuteToggle?: () => void;
    showMuteButton?: boolean;
}

export default function AudioVolumeControl({
    label,
    volume,
    isMuted = false,
    onVolumeChange,
    onMuteToggle,
    showMuteButton = true,
}: AudioVolumeControlProps) {
    const displayVolume = isMuted ? 0 : volume;

    const getVolumeIcon = (): 'volume-mute' | 'volume-low' | 'volume-high' => {
        if (isMuted || displayVolume === 0) {
            return 'volume-mute';
        }
        if (displayVolume < 0.5) {
            return 'volume-low';
        }
        return 'volume-high';
    };

    // Simple volume buttons instead of slider for compatibility
    const decreaseVolume = () => {
        const newVolume = Math.max(0, volume - 0.1);
        onVolumeChange(Math.round(newVolume * 10) / 10);
    };

    const increaseVolume = () => {
        const newVolume = Math.min(1, volume + 0.1);
        onVolumeChange(Math.round(newVolume * 10) / 10);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label} numberOfLines={1}>
                {label}
            </Text>

            {showMuteButton && onMuteToggle && (
                <Pressable
                    onPress={onMuteToggle}
                    style={[styles.muteButton, isMuted && styles.muteButtonActive]}
                >
                    <Ionicons
                        name={getVolumeIcon()}
                        size={16}
                        color={isMuted ? '#ef4444' : 'rgba(255,255,255,0.8)'}
                    />
                </Pressable>
            )}

            {/* Volume bar visualization */}
            <View style={styles.volumeBarContainer}>
                <Pressable onPress={decreaseVolume} style={styles.volumeButton}>
                    <Ionicons name="remove" size={14} color="rgba(255,255,255,0.6)" />
                </Pressable>

                <View style={styles.volumeBar}>
                    <View
                        style={[
                            styles.volumeFill,
                            { width: `${displayVolume * 100}%` }
                        ]}
                    />
                </View>

                <Pressable onPress={increaseVolume} style={styles.volumeButton}>
                    <Ionicons name="add" size={14} color="rgba(255,255,255,0.6)" />
                </Pressable>
            </View>

            <Text style={styles.percentage}>{Math.round(displayVolume * 100)}%</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    label: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
        width: 80,
    },
    muteButton: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    muteButtonActive: {
        backgroundColor: 'rgba(239,68,68,0.2)',
    },
    volumeBarContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    volumeButton: {
        padding: 6,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    volumeBar: {
        flex: 1,
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    volumeFill: {
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 3,
    },
    percentage: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        width: 36,
        textAlign: 'right',
    },
});
