/**
 * TrendingStrip — Horizontally scrollable trending topic pills
 * Positioned above the FlashList grid, below the header.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { ExploreService } from '../../services/ExploreService';

interface TrendingStripProps {
    selectedTag: string | null;
    onSelectTag: (tag: string | null) => void;
    forceRefresh?: number; // increment to trigger refetch
}

// Cache
let cachedTags: { tag: string; velocity: number }[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export default function TrendingStrip({ selectedTag, onSelectTag, forceRefresh }: TrendingStripProps) {
    const { colors } = useTheme();
    const [tags, setTags] = useState<{ tag: string; velocity: number }[]>([]);

    const fetchTags = useCallback(async (skipCache = false) => {
        if (!skipCache && cachedTags && Date.now() - cacheTimestamp < CACHE_TTL) {
            setTags(cachedTags);
            return;
        }

        try {
            const result = await ExploreService.getTrendingTags();
            if (result && result.length > 0) {
                cachedTags = result;
                cacheTimestamp = Date.now();
                setTags(result);
            } else {
                setTags([]);
            }
        } catch {
            setTags([]);
        }
    }, []);

    useEffect(() => {
        fetchTags();
    }, [fetchTags]);

    useEffect(() => {
        if (forceRefresh && forceRefresh > 0) {
            fetchTags(true);
        }
    }, [forceRefresh, fetchTags]);

    if (tags.length === 0) return null;

    return (
        <Animated.View entering={FadeIn.duration(200)} style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {tags.map(item => {
                    const isSelected = selectedTag === item.tag;
                    return (
                        <TouchableOpacity
                            key={item.tag}
                            onPress={() => onSelectTag(isSelected ? null : item.tag)}
                            activeOpacity={0.7}
                            style={[
                                styles.pill,
                                {
                                    backgroundColor: isSelected ? colors.accent : colors.card,
                                    borderColor: isSelected ? colors.accent : colors.border,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.pillText,
                                    { color: isSelected ? '#000' : colors.text },
                                ]}
                            >
                                #{item.tag}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 8,
    },
    scrollContent: {
        paddingHorizontal: 14,
        gap: 8,
    },
    pill: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 0.5,
    },
    pillText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
