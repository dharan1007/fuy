import React, { memo, useState } from 'react';
import { Image, View, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Film, Music, Tv, Image as ImageIcon } from 'lucide-react-native';

interface InstantMediaCardProps {
    imageUrl?: string | null;
    postType?: string;
    postId: string;
    style?: any;
}

/**
 * INSTANT Media Card - Never blank, never loading.
 * 
 * Strategy:
 * 1. ALWAYS show colorful placeholder INSTANTLY (0ms)
 * 2. If imageUrl exists, load Image on top (async)
 * 3. NEVER use Video components (too slow for grids)
 * 
 * The placeholder color is deterministic based on postId,
 * so the same post always gets the same color.
 */
const InstantMediaCard: React.FC<InstantMediaCardProps> = memo(({
    imageUrl,
    postType = 'POST',
    postId,
    style
}) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    // Generate deterministic color from post ID (same post = same color)
    const getColorsFromId = (id: string): [string, string, string] => {
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = ((hash << 5) - hash) + id.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }

        const hue = Math.abs(hash % 360);
        const saturation = 30 + (Math.abs((hash >> 8) % 20));
        const lightness = 15 + (Math.abs((hash >> 16) % 10));

        return [
            `hsl(${hue}, ${saturation}%, ${lightness}%)`,
            `hsl(${(hue + 30) % 360}, ${saturation}%, ${lightness + 5}%)`,
            `hsl(${(hue + 60) % 360}, ${saturation}%, ${lightness + 10}%)`
        ];
    };

    // Get icon based on post type
    const getIcon = () => {
        const size = 20;
        const color = 'rgba(255,255,255,0.5)';

        switch (postType?.toUpperCase()) {
            case 'FILL':
            case 'LILL':
                return <Film size={size} color={color} />;
            case 'AUD':
                return <Music size={size} color={color} />;
            case 'CHAN':
                return <Tv size={size} color={color} />;
            case 'XRAY':
                return <ImageIcon size={size} color={color} />;
            default:
                return <Play size={size} color={color} fill="rgba(255,255,255,0.2)" />;
        }
    };

    const gradientColors = getColorsFromId(postId);
    const showImage = imageUrl && !imageError;

    return (
        <View style={[styles.container, style]}>
            {/* Layer 1: Colorful placeholder - ALWAYS rendered, instant */}
            <LinearGradient
                colors={gradientColors}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Placeholder content - shown when no image or image loading */}
            {!imageLoaded && (
                <View style={styles.placeholderContent}>
                    <View style={styles.iconCircle}>
                        {getIcon()}
                    </View>
                </View>
            )}

            {/* Layer 2: Actual image - loads async, replaces placeholder */}
            {showImage && (
                <Image
                    source={{ uri: imageUrl }}
                    style={[StyleSheet.absoluteFill, { opacity: imageLoaded ? 1 : 0 }]}
                    resizeMode="cover"
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                />
            )}

            {/* Play icon overlay for video posts with loaded images */}
            {imageLoaded && (postType === 'FILL' || postType === 'LILL') && (
                <View style={styles.playBadge}>
                    <Play size={10} color="#fff" fill="#fff" />
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
    },
    placeholderContent: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    playBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default InstantMediaCard;
