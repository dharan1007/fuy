import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';

interface VerifiedBadgeProps {
    size?: number;
    show?: boolean;
}

/**
 * Verified Badge - Red circle with white tick
 * Shown next to verified users' names
 */
export function VerifiedBadge({ size = 16, isHumanVerified = false }: { size?: number, isHumanVerified?: boolean }) {
    return (
        <View style={[styles.badge, {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: isHumanVerified ? '#FFFFFF' : '#DC2626' // White for Human, Red for others
        }]} />
    );
}

const styles = StyleSheet.create({
    badge: {
        backgroundColor: '#DC2626', // Red-600
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4,
    },
});

export default VerifiedBadge;
