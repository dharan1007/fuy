import React from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Share
} from 'react-native';
import { MapPin, Timer, TrendingUp, Flame, Mountain, Gauge, ArrowLeft, Share2, Tag } from 'lucide-react-native';
import { ActivitySession } from '../../services/ActivityTrackingService';
import ActivityTrackingService from '../../services/ActivityTrackingService';
import ActivityMapView from './ActivityMapView';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ActivitySummaryScreenProps {
    session: ActivitySession;
    onClose: () => void;
    onShareCard?: () => void;
    onTagFriends?: () => void;
    isDark?: boolean;
}

export default function ActivitySummaryScreen({ session, onClose, onShareCard, onTagFriends, isDark = true }: ActivitySummaryScreenProps) {
    const colors = isDark ? {
        background: '#0B0B0B',
        surface: '#161616',
        surfaceAlt: '#1C1C1C',
        text: '#FFFFFF',
        textSecondary: '#9CA3AF',
        textTertiary: '#6B7280',
        accent: '#FFFFFF',
        accentSubtle: '#2A2A2A',
    } : {
        background: '#F8F8F8',
        surface: '#FFFFFF',
        surfaceAlt: '#F0F0F0',
        text: '#000000',
        textSecondary: '#6B7280',
        textTertiary: '#9CA3AF',
        accent: '#000000',
        accentSubtle: '#F0F0F0',
    };

    const distKm = (session.distance / 1000).toFixed(2);
    const formattedDuration = ActivityTrackingService.formatDuration(session.duration);
    const formattedPace = ActivityTrackingService.formatPace(session.avgPace);
    const avgSpeedKmh = session.duration > 0
        ? ((session.distance / 1000) / (session.duration / 3600)).toFixed(1)
        : '0.0';

    const dateStr = new Date(session.startTime).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
    });

    const timeStr = new Date(session.startTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
    });

    const handleShare = async () => {
        try {
            await Share.share({
                message: `${ActivityTrackingService.getActivityLabel(session.activityType)} - ${distKm} km in ${formattedDuration}\nPace: ${formattedPace} min/km | Calories: ${session.calories} kcal`,
            });
        } catch (e) {
            console.error('Share failed:', e);
        }
    };

    // Simple pace graph from GPS points
    const getPaceSegments = () => {
        if (session.points.length < 10) return [];
        const segmentCount = Math.min(12, Math.floor(session.points.length / 5));
        const segmentSize = Math.floor(session.points.length / segmentCount);
        const segments: number[] = [];

        for (let i = 0; i < segmentCount; i++) {
            const start = i * segmentSize;
            const end = Math.min(start + segmentSize, session.points.length - 1);
            const startPt = session.points[start];
            const endPt = session.points[end];

            const timeDiff = (endPt.timestamp - startPt.timestamp) / 1000 / 60; // minutes
            let dist = 0;
            for (let j = start; j < end; j++) {
                const p1 = session.points[j];
                const p2 = session.points[j + 1];
                const R = 6371000;
                const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
                const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
                const a = Math.sin(dLat / 2) ** 2 +
                    Math.cos((p1.latitude * Math.PI) / 180) *
                    Math.cos((p2.latitude * Math.PI) / 180) *
                    Math.sin(dLon / 2) ** 2;
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                dist += R * c;
            }
            const distKm = dist / 1000;
            const pace = distKm > 0 ? timeDiff / distKm : 0;
            segments.push(pace);
        }
        return segments;
    };

    const paceSegments = getPaceSegments();
    const maxPace = Math.max(...paceSegments, 1);

    // Elevation data
    const getElevationProfile = () => {
        if (session.points.length < 5) return [];
        const step = Math.max(1, Math.floor(session.points.length / 20));
        return session.points
            .filter((_, i) => i % step === 0)
            .map(p => p.altitude || 0);
    };

    const elevProfile = getElevationProfile();
    const minElev = Math.min(...elevProfile, 0);
    const maxElev = Math.max(...elevProfile, 1);
    const elevRange = maxElev - minElev || 1;

    const metrics = [
        { label: 'DISTANCE', value: distKm, unit: 'km', icon: MapPin },
        { label: 'DURATION', value: formattedDuration, unit: '', icon: Timer },
        { label: 'AVG PACE', value: formattedPace, unit: 'min/km', icon: TrendingUp },
        { label: 'CALORIES', value: `${session.calories}`, unit: 'kcal', icon: Flame },
        { label: 'ELEVATION', value: `${Math.round(session.elevationGain)}`, unit: 'm', icon: Mountain },
        { label: 'AVG SPEED', value: avgSpeedKmh, unit: 'km/h', icon: Gauge },
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                    <ArrowLeft size={22} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        {ActivityTrackingService.getActivityLabel(session.activityType)}
                    </Text>
                    <Text style={[styles.headerDate, { color: colors.textSecondary }]}>
                        {dateStr} at {timeStr}
                    </Text>
                </View>
                <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
                    <Share2 size={20} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                {/* Route Map */}
                {session.points.length >= 2 && (
                    <View style={styles.mapSection}>
                        <ActivityMapView
                            points={session.points}
                            showUserLocation={false}
                            isDark={isDark}
                            style={styles.summaryMap}
                        />
                    </View>
                )}

                {/* Hero Distance */}
                <View style={styles.heroSection}>
                    <Text style={[styles.heroValue, { color: colors.text }]}>{distKm}</Text>
                    <Text style={[styles.heroUnit, { color: colors.textTertiary }]}>kilometers</Text>
                </View>

                {/* Metrics Grid */}
                <View style={styles.metricsGrid}>
                    {metrics.map(m => {
                        const Icon = m.icon;
                        return (
                            <View key={m.label} style={[styles.metricCard, { backgroundColor: colors.surface }]}>
                                <View style={styles.metricCardHeader}>
                                    <Icon size={14} color={colors.textTertiary} />
                                    <Text style={[styles.metricCardLabel, { color: colors.textTertiary }]}>{m.label}</Text>
                                </View>
                                <Text style={[styles.metricCardValue, { color: colors.text }]}>{m.value}</Text>
                                {m.unit ? (
                                    <Text style={[styles.metricCardUnit, { color: colors.textSecondary }]}>{m.unit}</Text>
                                ) : null}
                            </View>
                        );
                    })}
                </View>

                {/* Pace Chart */}
                {paceSegments.length > 0 && (
                    <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.chartTitle, { color: colors.textSecondary }]}>PACE</Text>
                        <View style={styles.barChart}>
                            {paceSegments.map((pace, i) => (
                                <View key={i} style={styles.barWrapper}>
                                    <View
                                        style={[
                                            styles.bar,
                                            {
                                                height: `${Math.max(10, (pace / maxPace) * 100)}%`,
                                                backgroundColor: colors.text,
                                                opacity: 0.6 + (i / paceSegments.length) * 0.4,
                                            },
                                        ]}
                                    />
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Elevation Chart */}
                {elevProfile.length > 3 && (
                    <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.chartTitle, { color: colors.textSecondary }]}>ELEVATION</Text>
                        <View style={styles.elevChart}>
                            {elevProfile.map((elev, i) => (
                                <View key={i} style={styles.barWrapper}>
                                    <View
                                        style={[
                                            styles.bar,
                                            {
                                                height: `${Math.max(5, ((elev - minElev) / elevRange) * 100)}%`,
                                                backgroundColor: colors.textSecondary,
                                                opacity: 0.5,
                                            },
                                        ]}
                                    />
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Actions */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        onPress={onShareCard || handleShare}
                        style={[styles.actionBtn, { backgroundColor: colors.accent }]}
                    >
                        <Share2 size={16} color={colors.background} />
                        <Text style={[styles.actionBtnText, { color: colors.background }]}>Share Card</Text>
                    </TouchableOpacity>
                </View>
                {onTagFriends && (
                    <TouchableOpacity
                        onPress={onTagFriends}
                        style={[styles.tagBtn, { backgroundColor: colors.accentSubtle }]}
                    >
                        <Tag size={14} color={colors.text} />
                        <Text style={[styles.tagBtnText, { color: colors.text }]}>Tag Friends</Text>
                    </TouchableOpacity>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 12,
    },
    headerBtn: {
        padding: 8,
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    headerDate: {
        fontSize: 12,
        marginTop: 2,
    },
    scroll: {
        paddingHorizontal: 20,
    },

    // Map
    mapSection: {
        marginBottom: 20,
    },
    summaryMap: {
        height: 200,
        borderRadius: 20,
    },

    // Hero
    heroSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    heroValue: {
        fontSize: 56,
        fontWeight: '200',
        letterSpacing: -2,
    },
    heroUnit: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: -4,
    },

    // Metrics Grid
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
    },
    metricCard: {
        width: (SCREEN_WIDTH - 52) / 2,
        padding: 18,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 2,
    },
    metricCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
    },
    metricCardLabel: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1,
    },
    metricCardValue: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    metricCardUnit: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },

    // Charts
    chartCard: {
        padding: 20,
        borderRadius: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 2,
    },
    chartTitle: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 2,
        marginBottom: 16,
    },
    barChart: {
        flexDirection: 'row',
        height: 80,
        alignItems: 'flex-end',
        gap: 4,
    },
    elevChart: {
        flexDirection: 'row',
        height: 60,
        alignItems: 'flex-end',
        gap: 2,
    },
    barWrapper: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    bar: {
        borderRadius: 3,
        minHeight: 4,
    },

    // Actions
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 16,
    },
    actionBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    tagBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 16,
        marginTop: 10,
    },
    tagBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
