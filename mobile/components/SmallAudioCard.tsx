
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Music, Play } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { AudioInfo } from './AudioIndicator';

interface SmallAudioCardProps {
    audioInfo: AudioInfo;
    containerStyle?: any;
}

export default function SmallAudioCard({ audioInfo, containerStyle }: SmallAudioCardProps) {
    const router = useRouter();

    if (!audioInfo) return null;

    const handlePress = () => {
        router.push(`/audio/${audioInfo.audioAssetId}`);
    };

    return (
        <TouchableOpacity 
            onPress={handlePress} 
            style={[styles.container, containerStyle]} 
            activeOpacity={0.8}
        >
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Music size={12} color="#fff" />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.title} numberOfLines={1}>
                        {audioInfo.audioTitle || 'Original Audio'}
                    </Text>
                    <Text style={styles.creator} numberOfLines={1}>
                        @{audioInfo.audioCreatorName}
                    </Text>
                </View>
                <View style={styles.playIcon}>
                    <Play size={10} color="#fff" fill="#fff" />
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        padding: 6,
        width: 120, // Small square-ish card
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    iconContainer: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    creator: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 8,
        fontWeight: '500',
    },
    playIcon: {
        opacity: 0.8,
    }
});
