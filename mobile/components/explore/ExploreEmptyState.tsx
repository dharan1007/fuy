/**
 * ExploreEmptyState — Shown when the filtered post pool is empty.
 * Shows interest suggestions, profile recommendation, and add-interests link.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../context/ThemeContext';

interface ExploreEmptyStateProps {
    selectedTag: string | null;
    onClearTag: () => void;
    topInterests: string[];
    onSelectInterest: (tag: string) => void;
    vibeMatchProfile: {
        userId: string;
        displayName: string;
        avatarUrl: string;
    } | null;
    onFollowProfile: (userId: string) => void;
    onNavigateToProfile: (userId: string) => void;
}

export default function ExploreEmptyState({
    selectedTag,
    onClearTag,
    topInterests,
    onSelectInterest,
    vibeMatchProfile,
    onFollowProfile,
    onNavigateToProfile,
}: ExploreEmptyStateProps) {
    const { colors } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={[styles.title, { color: colors.text }]}>
                Nothing here yet
            </Text>

            {selectedTag && (
                <View style={styles.tagSection}>
                    <Text style={[styles.subtitle, { color: colors.secondary }]}>
                        No posts with #{selectedTag} found
                    </Text>
                    <TouchableOpacity
                        onPress={onClearTag}
                        style={[styles.actionButton, { backgroundColor: colors.accent }]}
                    >
                        <Text style={[styles.actionText, { color: '#000' }]}>
                            See all #{selectedTag} posts
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {topInterests.length > 0 && (
                <View style={styles.interestsSection}>
                    <Text style={[styles.subtitle, { color: colors.secondary }]}>
                        Try one of your interests
                    </Text>
                    <View style={styles.pillsRow}>
                        {topInterests.slice(0, 3).map(tag => (
                            <TouchableOpacity
                                key={tag}
                                onPress={() => onSelectInterest(tag)}
                                style={[styles.interestPill, { borderColor: colors.border, backgroundColor: colors.card }]}
                            >
                                <Text style={[styles.interestText, { color: colors.text }]}>
                                    #{tag}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {vibeMatchProfile && (
                <View style={styles.profileSection}>
                    <TouchableOpacity
                        onPress={() => onNavigateToProfile(vibeMatchProfile.userId)}
                        style={[styles.profileCard, { borderColor: colors.border, backgroundColor: colors.card }]}
                    >
                        {vibeMatchProfile.avatarUrl ? (
                            <Image
                                source={{ uri: vibeMatchProfile.avatarUrl }}
                                style={styles.profileAvatar}
                                cachePolicy="memory-disk"
                            />
                        ) : (
                            <View style={[styles.profileAvatar, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
                                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                                    {(vibeMatchProfile.displayName || '?').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500' }}>
                                {vibeMatchProfile.displayName}
                            </Text>
                            <Text style={{ color: colors.secondary, fontSize: 12, marginTop: 2 }}>
                                Follow them to see their posts
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={(e) => {
                                e.stopPropagation();
                                onFollowProfile(vibeMatchProfile.userId);
                            }}
                            style={[styles.followBtn, { backgroundColor: colors.accent }]}
                        >
                            <Text style={{ color: '#000', fontSize: 12, fontWeight: '700' }}>Follow</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingTop: 60,
    },
    title: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 16,
    },
    tagSection: {
        alignItems: 'center',
        marginBottom: 20,
    },
    subtitle: {
        fontSize: 13,
        marginBottom: 10,
    },
    actionButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    actionText: {
        fontSize: 13,
        fontWeight: '600',
    },
    interestsSection: {
        alignItems: 'center',
        marginBottom: 20,
    },
    pillsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    interestPill: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 0.5,
    },
    interestText: {
        fontSize: 12,
        fontWeight: '600',
    },
    profileSection: {
        width: '100%',
        marginTop: 10,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 0.5,
    },
    profileAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    followBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
    },
});
