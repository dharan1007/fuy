/**
 * PeekOverlay — Long-press preview card for explore grid tiles.
 * Shows creator info, stalk-me media, and profile link.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';
import { ExploreService } from '../../services/ExploreService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PeekOverlayProps {
    visible: boolean;
    creatorUserId: string | null;
    thumbnailUrl: string | null;
    onDismiss: () => void;
}

interface PeekData {
    displayName: string;
    username: string;
    avatarUrl: string;
    currentlyInto: string;
    stalkMeMedia: { url: string; type: string }[];
    userId: string;
}

export default function PeekOverlay({ visible, creatorUserId, thumbnailUrl, onDismiss }: PeekOverlayProps) {
    const { colors } = useTheme();
    const router = useRouter();
    const [data, setData] = useState<PeekData | null>(null);
    const [loading, setLoading] = useState(true);

    const overlayOpacity = useSharedValue(0);
    const cardScale = useSharedValue(0.92);

    useEffect(() => {
        if (visible && creatorUserId) {
            overlayOpacity.value = withTiming(1, { duration: 150 });
            cardScale.value = withSpring(1, { damping: 18, stiffness: 200 });
            setLoading(true);

            ExploreService.getCreatorPeekData(creatorUserId).then(result => {
                setData(result);
                setLoading(false);
            }).catch(() => setLoading(false));
        } else {
            overlayOpacity.value = withTiming(0, { duration: 120 });
            cardScale.value = withTiming(0.92, { duration: 120 });
        }
    }, [visible, creatorUserId]);

    const overlayStyle = useAnimatedStyle(() => ({
        opacity: overlayOpacity.value,
    }));

    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ scale: cardScale.value }],
        opacity: overlayOpacity.value,
    }));

    if (!visible) return null;

    const handleDismiss = () => {
        overlayOpacity.value = withTiming(0, { duration: 120 });
        cardScale.value = withTiming(0.92, { duration: 120 });
        setTimeout(onDismiss, 130);
    };

    // Shimmer placeholder blocks
    const ShimmerBlock = ({ width, height }: { width: number; height: number }) => (
        <View style={{ width, height, borderRadius: 8, backgroundColor: colors.border + '30' }} />
    );

    return (
        <TouchableWithoutFeedback onPress={handleDismiss}>
            <Animated.View style={[styles.overlay, overlayStyle]}>
                <TouchableWithoutFeedback>
                    <Animated.View style={[styles.card, cardStyle, { backgroundColor: colors.card }]}>
                        {/* Top thumbnail */}
                        <View style={styles.thumbContainer}>
                            {thumbnailUrl ? (
                                <Image
                                    source={{ uri: thumbnailUrl }}
                                    style={styles.thumbnail}
                                    contentFit="cover"
                                    cachePolicy="memory-disk"
                                />
                            ) : (
                                <View style={[styles.thumbnail, { backgroundColor: '#1a1a1a' }]} />
                            )}
                        </View>

                        {/* Creator row */}
                        <View style={styles.creatorRow}>
                            {loading ? (
                                <>
                                    <ShimmerBlock width={32} height={32} />
                                    <View style={{ marginLeft: 10, flex: 1 }}>
                                        <ShimmerBlock width={100} height={14} />
                                        <View style={{ height: 4 }} />
                                        <ShimmerBlock width={70} height={12} />
                                    </View>
                                </>
                            ) : data ? (
                                <>
                                    {data.avatarUrl ? (
                                        <Image
                                            source={{ uri: data.avatarUrl }}
                                            style={styles.avatar}
                                            cachePolicy="memory-disk"
                                        />
                                    ) : (
                                        <View style={[styles.avatar, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
                                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
                                                {(data.displayName || '?').charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={{ marginLeft: 10, flex: 1 }}>
                                        <Text
                                            style={{ color: colors.text, fontSize: 14, fontWeight: '500' }}
                                            numberOfLines={1}
                                        >
                                            {data.displayName}
                                        </Text>
                                        <Text
                                            style={{ color: colors.secondary, fontSize: 12 }}
                                            numberOfLines={1}
                                        >
                                            @{data.username}
                                        </Text>
                                    </View>
                                </>
                            ) : null}
                        </View>

                        {/* Currently into */}
                        {data?.currentlyInto ? (
                            <Text
                                style={{ color: colors.secondary, fontSize: 13, fontStyle: 'italic', paddingHorizontal: 14, marginTop: 4 }}
                                numberOfLines={1}
                            >
                                {data.currentlyInto}
                            </Text>
                        ) : null}

                        {/* Stalk Me thumbnails */}
                        {loading ? (
                            <View style={styles.stalkRow}>
                                <ShimmerBlock width={80} height={80} />
                                <ShimmerBlock width={80} height={80} />
                                <ShimmerBlock width={80} height={80} />
                            </View>
                        ) : data && data.stalkMeMedia.length > 0 ? (
                            <View style={styles.stalkRow}>
                                {data.stalkMeMedia.slice(0, 3).map((m, i) => (
                                    <Image
                                        key={i}
                                        source={{ uri: m.url }}
                                        style={styles.stalkThumb}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                    />
                                ))}
                            </View>
                        ) : null}

                        {/* View profile link */}
                        {data && (
                            <TouchableOpacity
                                onPress={() => {
                                    handleDismiss();
                                    setTimeout(() => router.push(`/profile/${data.userId}` as any), 200);
                                }}
                                style={styles.profileLink}
                            >
                                <Text style={{ color: colors.accent, fontSize: 12 }}>
                                    View profile
                                </Text>
                            </TouchableOpacity>
                        )}
                    </Animated.View>
                </TouchableWithoutFeedback>
            </Animated.View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        width: 300,
        borderRadius: 16,
        overflow: 'hidden',
    },
    thumbContainer: {
        width: 300,
        height: 180,
        overflow: 'hidden',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    creatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        paddingBottom: 8,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    stalkRow: {
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    stalkThumb: {
        width: 80,
        height: 80,
        borderRadius: 8,
    },
    profileLink: {
        paddingHorizontal: 14,
        paddingBottom: 14,
        paddingTop: 4,
    },
});
