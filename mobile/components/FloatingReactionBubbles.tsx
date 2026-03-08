import React, { useState } from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { User as UserIcon } from 'lucide-react-native';

interface Bubble {
    id: string;
    mediaUrl: string;
    mediaType: string;
    user?: { profile?: { avatarUrl?: string }, name?: string };
}

interface Props {
    bubbles: Bubble[];
    onExpand?: () => void;
}

export default function FloatingReactionBubbles({ bubbles = [], onExpand }: Props) {
    const [collapsed, setCollapsed] = useState(false);

    if (!bubbles || bubbles.length === 0) return null;

    // Show up to 5 max visually to not clutter
    const displayBubbles = bubbles.slice(0, 5);

    return (
        <View style={styles.container} pointerEvents="box-none">
            {displayBubbles.map((bubble, index) => {
                const isStackTop = index === 0;

                const animatedStyle = useAnimatedStyle(() => {
                    if (collapsed) {
                        return {
                            transform: [
                                { translateY: withSpring(index * -15) },
                                { scale: withTiming(1 - index * 0.1) },
                                { translateX: 0 }
                            ] as any,
                            opacity: withTiming(1 - index * 0.2),
                            zIndex: 10 - index,
                        };
                    } else {
                        return {
                            transform: [
                                { translateY: withSpring(index * -65) },
                                { scale: withTiming(1) },
                                { translateX: 0 }
                            ] as any,
                            opacity: withTiming(1),
                            zIndex: 10 - index,
                        };
                    }
                }, [collapsed]);

                return (
                    <Animated.View key={bubble.id} style={[styles.bubbleWrapper, animatedStyle]}>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                if (collapsed && onExpand) {
                                    onExpand();
                                } else {
                                    setCollapsed(!collapsed);
                                }
                            }}
                        >
                            <View style={styles.bubble}>
                                {bubble.mediaUrl ? (
                                    <Image source={{ uri: bubble.mediaUrl }} style={styles.image} />
                                ) : (
                                    <View style={styles.placeholder}>
                                        <UserIcon color="white" size={24} />
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: 16,
        bottom: 150, // Above the right action icons
        alignItems: 'center',
        justifyContent: 'flex-end',
        width: 60,
        height: 350, // Give space for expansion
    },
    bubbleWrapper: {
        position: 'absolute',
        bottom: 0,
    },
    bubble: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#222',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    placeholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#333',
        alignItems: 'center',
        justifyContent: 'center',
    }
});
