import React, { memo, useState, useCallback, useEffect } from 'react';
import { Image, View, StyleSheet, Text } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Film, Music, Tv } from 'lucide-react-native';

interface VideoThumbnailProps {
    videoUrl: string;
    fallbackImageUrl?: string | null;
    style?: any;
    showPlayIcon?: boolean;
    postType?: string;
}

/**
 * Video thumbnail component that uses multiple strategies:
 * 1. Pre-stored thumbnail image (most reliable)
 * 2. Native Video component with shouldPlay=false (for first frame)
 * 3. Styled gradient placeholder as fallback
 * 
 * Instagram/TikTok generate thumbnails server-side. Since we can't do that,
 * we use a combination of approaches for best UX.
 */
const VideoThumbnail: React.FC<VideoThumbnailProps> = memo(({
    videoUrl,
    fallbackImageUrl,
    style,
    showPlayIcon = true,
    postType = 'Video'
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [useVideoComponent, setUseVideoComponent] = useState(true);

    const player = useVideoPlayer(videoUrl, player => {
        player.loop = false;
        player.muted = true;
    });

    useEffect(() => {
        if (!fallbackImageUrl) {
            const t = setTimeout(() => setIsLoaded(true), 300);
            return () => clearTimeout(t);
        }
    }, [fallbackImageUrl]);

    // If we have a pre-stored thumbnail image, use it (most efficient)
    if (fallbackImageUrl) {
        return (
            <View style={[styles.container, style]}>
                <Image
                    source={{ uri: fallbackImageUrl }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                />
                {showPlayIcon && (
                    <View style={styles.playOverlay}>
                        <View style={styles.playButton}>
                            <Play size={18} color="#000" fill="#000" />
                        </View>
                    </View>
                )}
            </View>
        );
    }

    const handleError = useCallback(() => {
        setHasError(true);
        setUseVideoComponent(false);
    }, []);

    // Get gradient colors and icon based on post type
    const getPostTypeStyle = () => {
        switch (postType?.toUpperCase()) {
            case 'FILL':
                return {
                    colors: ['#1a1a2e', '#16213e', '#0f3460'] as const,
                    icon: <Film size={20} color="rgba(255,255,255,0.6)" />,
                    label: 'FILL'
                };
            case 'LILL':
                return {
                    colors: ['#2d132c', '#801336', '#c72c41'] as const,
                    icon: <Film size={20} color="rgba(255,255,255,0.6)" />,
                    label: 'LILL'
                };
            case 'AUD':
                return {
                    colors: ['#1a1a2e', '#0d7377', '#14ffec'] as const,
                    icon: <Music size={20} color="rgba(255,255,255,0.6)" />,
                    label: 'AUDIO'
                };
            case 'CHAN':
                return {
                    colors: ['#1a1a1a', '#2d2d2d', '#3d3d3d'] as const,
                    icon: <Tv size={20} color="rgba(255,255,255,0.6)" />,
                    label: 'CHAN'
                };
            default:
                return {
                    colors: ['#1a1a1a', '#2a2a2a', '#3a3a3a'] as const,
                    icon: <Play size={20} color="rgba(255,255,255,0.6)" fill="rgba(255,255,255,0.3)" />,
                    label: 'VIDEO'
                };
        }
    };

    const { colors, icon, label } = getPostTypeStyle();

    // Show styled placeholder if Video failed or hasn't loaded
    if (hasError || !useVideoComponent) {
        return (
            <View style={[styles.container, style]}>
                <LinearGradient
                    colors={colors}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View style={styles.placeholderContent}>
                    <View style={styles.iconCircle}>
                        {icon}
                    </View>
                    <Text style={styles.typeLabel}>{label}</Text>
                </View>
                {showPlayIcon && (
                    <View style={styles.playOverlaySmall}>
                        <View style={styles.playButtonSmall}>
                            <Play size={14} color="#000" fill="#000" />
                        </View>
                    </View>
                )}
            </View>
        );
    }

    return (
        <View style={[styles.container, style]}>
            {/* Background gradient while loading */}
            <LinearGradient
                colors={colors}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Loading state */}
            {!isLoaded && (
                <View style={styles.placeholderContent}>
                    <View style={styles.iconCircle}>
                        {icon}
                    </View>
                </View>
            )}

            {/* Video component paused at first frame */}
            <VideoView
                player={player}
                style={[StyleSheet.absoluteFill, { opacity: isLoaded ? 1 : 0 }]}
                contentFit="cover"
                nativeControls={false}
            />

            {/* Play icon overlay */}
            {showPlayIcon && isLoaded && (
                <View style={styles.playOverlay}>
                    <View style={styles.playButton}>
                        <Play size={18} color="#000" fill="#000" />
                    </View>
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1a1a1a',
        overflow: 'hidden',
    },
    placeholderContent: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    typeLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 9,
        fontWeight: '700',
        marginTop: 6,
        letterSpacing: 1,
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    playButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playOverlaySmall: {
        position: 'absolute',
        bottom: 6,
        right: 6,
    },
    playButtonSmall: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default VideoThumbnail;
