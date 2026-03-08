import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Activity, MapPin, Timer, Flame, Trash2, ChevronRight } from 'lucide-react-native';
import { ActivitySession } from '../../services/ActivityTrackingService';
import ActivityTrackingService from '../../services/ActivityTrackingService';

interface ActivityHistoryListProps {
    activities: ActivitySession[];
    onSelect: (activity: ActivitySession) => void;
    onDelete: (id: string) => void;
    isDark?: boolean;
}

export default function ActivityHistoryList({
    activities,
    onSelect,
    onDelete,
    isDark = true,
}: ActivityHistoryListProps) {
    const colors = isDark ? {
        surface: '#161616',
        text: '#FFFFFF',
        textSecondary: '#9CA3AF',
        textTertiary: '#6B7280',
        accentSubtle: '#2A2A2A',
        border: '#1E1E1E',
    } : {
        surface: '#FFFFFF',
        text: '#000000',
        textSecondary: '#6B7280',
        textTertiary: '#9CA3AF',
        accentSubtle: '#F0F0F0',
        border: '#E5E5E5',
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'run': return 'Run';
            case 'walk': return 'Walk';
            case 'cycle': return 'Cycle';
            case 'gym': return 'Gym';
            default: return 'Activity';
        }
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (activities.length === 0) {
        return (
            <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
                <Activity size={32} color={colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No activities yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
                    Start your first activity to see it here
                </Text>
            </View>
        );
    }

    const renderItem = ({ item, index }: { item: ActivitySession; index: number }) => {
        const distKm = (item.distance / 1000).toFixed(2);
        const duration = ActivityTrackingService.formatDuration(item.duration);
        const dateLabel = formatDate(item.startTime);

        return (
            <TouchableOpacity
                onPress={() => onSelect(item)}
                style={[styles.activityCard, { backgroundColor: colors.surface }]}
                activeOpacity={0.7}
            >
                <View style={styles.cardLeft}>
                    {/* Activity type indicator */}
                    <View style={[styles.typeIndicator, { backgroundColor: colors.accentSubtle }]}>
                        <Activity size={16} color={colors.text} />
                    </View>

                    <View style={styles.cardInfo}>
                        <View style={styles.cardTopRow}>
                            <Text style={[styles.activityType, { color: colors.text }]}>
                                {ActivityTrackingService.getActivityLabel(item.activityType)}
                            </Text>
                            <Text style={[styles.dateText, { color: colors.textTertiary }]}>{dateLabel}</Text>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <MapPin size={11} color={colors.textTertiary} />
                                <Text style={[styles.statText, { color: colors.textSecondary }]}>{distKm} km</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Timer size={11} color={colors.textTertiary} />
                                <Text style={[styles.statText, { color: colors.textSecondary }]}>{duration}</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Flame size={11} color={colors.textTertiary} />
                                <Text style={[styles.statText, { color: colors.textSecondary }]}>{item.calories} cal</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <ChevronRight size={16} color={colors.textTertiary} />
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.listContent}>
            {activities.map((item, index) => (
                <View key={item.id}>
                    {renderItem({ item, index })}
                    {index < activities.length - 1 && <View style={{ height: 8 }} />}
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    listContent: {
        paddingBottom: 20,
    },

    emptyContainer: {
        padding: 48,
        borderRadius: 20,
        alignItems: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 2,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginTop: 4,
    },
    emptySubtitle: {
        fontSize: 12,
    },

    activityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 1,
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        flex: 1,
    },
    typeIndicator: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardInfo: {
        flex: 1,
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    activityType: {
        fontSize: 14,
        fontWeight: '600',
    },
    dateText: {
        fontSize: 11,
        fontWeight: '500',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 14,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 11,
        fontWeight: '500',
    },
});
