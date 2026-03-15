/**
 * ModeSwitcher — Segmented pill control for switching explore modes.
 * Four modes: For You, Fresh, Nearby, Following
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import type { ExploreMode } from '../../services/ExploreService';

interface ModeSwitcherProps {
    activeMode: ExploreMode;
    onModeChange: (mode: ExploreMode) => void;
}

const MODES: { id: ExploreMode; label: string }[] = [
    { id: 'foryou', label: 'For You' },
    { id: 'fresh', label: 'Fresh' },
    { id: 'nearby', label: 'Nearby' },
    { id: 'following', label: 'Following' },
];

export default function ModeSwitcher({ activeMode, onModeChange }: ModeSwitcherProps) {
    const { colors } = useTheme();

    return (
        <View style={styles.container}>
            {MODES.map(mode => {
                const isActive = activeMode === mode.id;
                return (
                    <TouchableOpacity
                        key={mode.id}
                        onPress={() => onModeChange(mode.id)}
                        activeOpacity={0.7}
                        style={[
                            styles.pill,
                            {
                                backgroundColor: isActive ? colors.accent + '26' : 'transparent',
                                borderColor: isActive ? colors.accent : 'transparent',
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.label,
                                { color: isActive ? colors.accent : colors.secondary },
                            ]}
                        >
                            {mode.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingHorizontal: 14,
        paddingVertical: 6,
    },
    pill: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 0.5,
        marginHorizontal: 2,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
    },
});
