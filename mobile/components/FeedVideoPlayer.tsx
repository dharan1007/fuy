import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

interface FeedVideoPlayerProps {
    url: string;
    isActive: boolean;
    isPaused?: boolean;
    isMuted?: boolean;
    isScreenFocused?: boolean;
    posterUrl?: string;
    contentFit?: "contain" | "cover" | "fill";
    nativeControls?: boolean;
    isLooping?: boolean;
    onPlayToEnd?: () => void;
}

export default function FeedVideoPlayer({
    url,
    isActive,
    isPaused = false,
    isMuted = false,
    isScreenFocused = true,
    posterUrl,
    contentFit = "cover",
    nativeControls = false,
    isLooping = true,
    onPlayToEnd
}: FeedVideoPlayerProps) {
    const player = useVideoPlayer(url, player => {
        player.loop = isLooping;
        player.muted = isMuted;
    });

    const shouldPlay = isActive && !isPaused && isScreenFocused;

    useEffect(() => {
        if (shouldPlay) {
            player.play();
        } else {
            player.pause();
        }
    }, [shouldPlay, player]);

    useEffect(() => {
        player.muted = isMuted;
    }, [isMuted, player]);

    useEffect(() => {
        player.loop = isLooping;
    }, [isLooping, player]);

    useEffect(() => {
        if (onPlayToEnd) {
            const subscription = player.addListener('playToEnd', onPlayToEnd);
            return () => {
                subscription.remove();
            };
        }
    }, [player, onPlayToEnd]);

    return (
        <View style={StyleSheet.absoluteFill}>
            <VideoView
                player={player}
                style={StyleSheet.absoluteFill}
                contentFit={contentFit}
                nativeControls={nativeControls}
            />
        </View>
    );
}
