import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useRouter } from 'expo-router';
import { UserPlus, ChevronRight } from 'lucide-react-native';

interface SuggestedUser {
    id: string;
    name: string;
    displayName: string;
    avatarUrl: string | null;
    followersCount: number;
    isFollowing: boolean;
    mutualCount?: number;
}

export default function SuggestedUsersRow() {
    const { session } = useAuth();
    const { colors, mode } = useTheme();
    const router = useRouter();
    const [users, setUsers] = useState<SuggestedUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (session?.user) fetchSuggestions();
    }, [session]);

    const fetchSuggestions = async () => {
        if (!session?.user) return;
        const myId = session.user.id;

        try {
            // 1. Get who I follow
            const { data: myFollowing } = await supabase
                .from('Subscription')
                .select('subscribedToId')
                .eq('subscriberId', myId);

            const followingIds = (myFollowing || []).map(f => f.subscribedToId);
            const isNewUser = followingIds.length === 0;

            let suggestions: SuggestedUser[] = [];

            if (isNewUser) {
                // New user: show most followed accounts
                const { data: popular } = await supabase
                    .from('User')
                    .select('id, name, profile:Profile(displayName, avatarUrl)')
                    .neq('id', myId)
                    .order('trustScore', { ascending: false })
                    .limit(15);

                // Get follower counts for each
                if (popular) {
                    const enriched = await Promise.all(popular.map(async (u: any) => {
                        const { count } = await supabase
                            .from('Subscription')
                            .select('*', { count: 'exact', head: true })
                            .eq('subscribedToId', u.id);

                        const prof = Array.isArray(u.profile) ? u.profile[0] : u.profile;
                        return {
                            id: u.id,
                            name: u.name,
                            displayName: prof?.displayName || u.name || 'User',
                            avatarUrl: prof?.avatarUrl || null,
                            followersCount: count || 0,
                            isFollowing: false,
                        };
                    }));
                    suggestions = enriched.sort((a, b) => b.followersCount - a.followersCount);
                }
            } else {
                // Existing user: find mutuals (people followed by people I follow)
                const { data: mutualCandidates } = await supabase
                    .from('Subscription')
                    .select('subscribedToId')
                    .in('subscriberId', followingIds)
                    .not('subscribedToId', 'in', `(${[myId, ...followingIds].join(',')})`)
                    .limit(30);

                const candidateIds = [...new Set((mutualCandidates || []).map(m => m.subscribedToId))];

                if (candidateIds.length > 0) {
                    const { data: candidateUsers } = await supabase
                        .from('User')
                        .select('id, name, profile:Profile(displayName, avatarUrl)')
                        .in('id', candidateIds.slice(0, 15));

                    if (candidateUsers) {
                        suggestions = candidateUsers.map((u: any) => {
                            const prof = Array.isArray(u.profile) ? u.profile[0] : u.profile;
                            const mutualCount = (mutualCandidates || []).filter(m => m.subscribedToId === u.id).length;
                            return {
                                id: u.id,
                                name: u.name,
                                displayName: prof?.displayName || u.name || 'User',
                                avatarUrl: prof?.avatarUrl || null,
                                followersCount: 0,
                                isFollowing: false,
                                mutualCount,
                            };
                        }).sort((a, b) => (b.mutualCount || 0) - (a.mutualCount || 0));
                    }
                }

                // Fallback: if not enough mutuals, add popular accounts
                if (suggestions.length < 5) {
                    const { data: popular } = await supabase
                        .from('User')
                        .select('id, name, profile:Profile(displayName, avatarUrl)')
                        .neq('id', myId)
                        .not('id', 'in', `(${followingIds.join(',')})`)
                        .order('trustScore', { ascending: false })
                        .limit(10);

                    if (popular) {
                        const existingIds = new Set(suggestions.map(s => s.id));
                        popular.forEach((u: any) => {
                            if (!existingIds.has(u.id)) {
                                const prof = Array.isArray(u.profile) ? u.profile[0] : u.profile;
                                suggestions.push({
                                    id: u.id,
                                    name: u.name,
                                    displayName: prof?.displayName || u.name || 'User',
                                    avatarUrl: prof?.avatarUrl || null,
                                    followersCount: 0,
                                    isFollowing: false,
                                });
                            }
                        });
                    }
                }
            }

            setUsers(suggestions.slice(0, 12));
        } catch (e) {
            console.error('[SuggestedUsers] Error:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async (userId: string) => {
        if (!session?.user) return;
        // Optimistic
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isFollowing: true } : u));

        try {
            await supabase.from('Subscription').insert({
                subscriberId: session.user.id,
                subscribedToId: userId,
            });
        } catch (e) {
            // Revert
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, isFollowing: false } : u));
        }
    };

    if (loading || users.length === 0) return null;

    const formatCount = (n: number) => {
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return n.toString();
    };

    return (
        <View style={[styles.container, { backgroundColor: mode === 'dark' ? '#0a0a0a' : '#f8f8f8' }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Suggested for you</Text>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {users.map((user) => (
                    <View key={user.id} style={[styles.card, { backgroundColor: mode === 'dark' ? '#141414' : '#fff', borderColor: mode === 'dark' ? '#222' : '#eee' }]}>
                        <TouchableOpacity onPress={() => router.push(`/profile/${user.id}`)} style={styles.cardContent}>
                            {user.avatarUrl ? (
                                <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, { backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }]}>
                                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                                        {user.displayName.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{user.displayName}</Text>
                            {user.mutualCount && user.mutualCount > 0 ? (
                                <Text style={[styles.subtitle, { color: colors.secondary }]}>{user.mutualCount} mutual{user.mutualCount > 1 ? 's' : ''}</Text>
                            ) : user.followersCount > 0 ? (
                                <Text style={[styles.subtitle, { color: colors.secondary }]}>{formatCount(user.followersCount)} followers</Text>
                            ) : null}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => handleFollow(user.id)}
                            disabled={user.isFollowing}
                            style={[styles.followBtn, {
                                backgroundColor: user.isFollowing ? 'rgba(255,255,255,0.1)' : colors.primary || '#fff',
                            }]}
                        >
                            {user.isFollowing ? (
                                <Text style={[styles.followText, { color: colors.secondary }]}>Following</Text>
                            ) : (
                                <>
                                    <UserPlus size={12} color={mode === 'dark' ? '#000' : '#fff'} />
                                    <Text style={[styles.followText, { color: mode === 'dark' ? '#000' : '#fff' }]}>Follow</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 16,
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    scrollContent: {
        paddingHorizontal: 12,
        gap: 10,
    },
    card: {
        width: 140,
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
    },
    cardContent: {
        alignItems: 'center',
        width: '100%',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginBottom: 8,
    },
    name: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 10,
        textAlign: 'center',
        marginBottom: 8,
    },
    followBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 4,
        width: '100%',
        marginTop: 4,
    },
    followText: {
        fontSize: 12,
        fontWeight: '700',
    },
});
