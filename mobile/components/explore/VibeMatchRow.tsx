/**
 * VibeMatchRow — "People You May Vibe With" horizontal profile card row.
 * Inserted after the 6th post in the FlashList grid.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Check } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { ExploreService } from '../../services/ExploreService';
import { supabase } from '../../lib/supabase';

interface VibeProfile {
    userId: string;
    displayName: string;
    avatarUrl: string;
    overlapCount: number;
    sharedTags: string[];
}

// Session cache
let cachedProfiles: VibeProfile[] | null = null;

export default function VibeMatchRow() {
    const { colors } = useTheme();
    const { session } = useAuth();
    const router = useRouter();
    const [profiles, setProfiles] = useState<VibeProfile[]>([]);
    const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!session?.user?.id) return;

        if (cachedProfiles) {
            setProfiles(cachedProfiles);
            return;
        }

        (async () => {
            const data = await ExploreService.getVibeMatchProfiles(session.user.id);
            cachedProfiles = data;
            setProfiles(data);
        })();
    }, [session?.user?.id]);

    const handleFollow = async (userId: string) => {
        if (!session?.user?.id) return;
        setFollowedIds(prev => new Set([...prev, userId]));

        try {
            const { error } = await supabase.from('Subscription').insert({
                subscriberId: session.user.id,
                subscribedToId: userId,
            });
            if (error && error.code !== '23505') throw error;
        } catch {
            setFollowedIds(prev => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
            Alert.alert('Error', 'Could not follow user');
        }
    };

    if (profiles.length === 0) return null;

    return (
        <View style={styles.container}>
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>
                People you may vibe with
            </Text>
            <FlatList
                horizontal
                data={profiles}
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => item.userId}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => {
                    const isFollowed = followedIds.has(item.userId);
                    return (
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => router.push(`/profile/${item.userId}` as any)}
                            style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}
                        >
                            {/* Avatar */}
                            {item.avatarUrl ? (
                                <Image
                                    source={{ uri: item.avatarUrl }}
                                    style={styles.avatar}
                                    cachePolicy="memory-disk"
                                />
                            ) : (
                                <View style={[styles.avatar, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
                                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                                        {(item.displayName || '?').charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}

                            {/* Name */}
                            <Text
                                style={[styles.displayName, { color: colors.text }]}
                                numberOfLines={1}
                            >
                                {item.displayName || 'Unknown'}
                            </Text>

                            {/* Shared tags */}
                            <View style={styles.tagsRow}>
                                {item.sharedTags.slice(0, 3).map(tag => (
                                    <View
                                        key={tag}
                                        style={[styles.tagPill, { backgroundColor: colors.border + '40' }]}
                                    >
                                        <Text style={[styles.tagText, { color: colors.secondary }]}>
                                            {tag}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            {/* Follow button */}
                            <TouchableOpacity
                                onPress={(e) => {
                                    e.stopPropagation();
                                    if (!isFollowed) handleFollow(item.userId);
                                }}
                                style={[
                                    styles.followBtn,
                                    {
                                        backgroundColor: isFollowed ? 'rgba(255,255,255,0.1)' : colors.accent,
                                        borderColor: isFollowed ? colors.border : colors.accent,
                                    },
                                ]}
                            >
                                {isFollowed ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Check size={12} color={colors.secondary} />
                                        <Text style={[styles.followText, { color: colors.secondary }]}>Following</Text>
                                    </View>
                                ) : (
                                    <Text style={[styles.followText, { color: '#000' }]}>Follow</Text>
                                )}
                            </TouchableOpacity>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '500',
        marginHorizontal: 14,
        marginBottom: 10,
    },
    listContent: {
        paddingHorizontal: 10,
        gap: 10,
    },
    card: {
        width: 140,
        height: 190,
        borderRadius: 12,
        borderWidth: 0.5,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    displayName: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 3,
    },
    tagPill: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    tagText: {
        fontSize: 10,
    },
    followBtn: {
        width: '100%',
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0.5,
    },
    followText: {
        fontSize: 12,
        fontWeight: '700',
    },
});
