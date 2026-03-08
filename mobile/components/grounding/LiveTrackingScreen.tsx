import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Dimensions, StatusBar,
    SafeAreaView, Alert
} from 'react-native';
import { Play, Pause, Square, MapPin, Timer, Flame, TrendingUp, Gauge } from 'lucide-react-native';
import { activityTracker, ActivityType, ActivitySession } from '../../services/ActivityTrackingService';
import ActivityTrackingService from '../../services/ActivityTrackingService';
import ActivityMapView from './ActivityMapView';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LiveTrackingScreenProps {
    onFinish: (session: ActivitySession) => void;
    onDiscard: () => void;
    isDark?: boolean;
}

const ACTIVITY_TYPES: { key: ActivityType; label: string }[] = [
    { key: 'run', label: 'Run' },
    { key: 'walk', label: 'Walk' },
    { key: 'cycle', label: 'Cycle' },
    { key: 'gym', label: 'Gym' },
    { key: 'custom', label: 'Custom' },
];

export default function LiveTrackingScreen({ onFinish, onDiscard, isDark = true }: LiveTrackingScreenProps) {
    const colors = isDark ? {
        background: '#0B0B0B',
        surface: '#161616',
        surfaceAlt: '#1C1C1C',
        text: '#FFFFFF',
        textSecondary: '#9CA3AF',
        textTertiary: '#6B7280',
        accent: '#FFFFFF',
        accentSubtle: '#2A2A2A',
        danger: '#EF4444',
        gpsColor: '#10B981',
    } : {
        background: '#F8F8F8',
        surface: '#FFFFFF',
        surfaceAlt: '#F0F0F0',
        text: '#000000',
        textSecondary: '#6B7280',
        textTertiary: '#9CA3AF',
        accent: '#000000',
        accentSubtle: '#F0F0F0',
        danger: '#EF4444',
        gpsColor: '#059669',
    };

    const [session, setSession] = useState<ActivitySession | null>(null);
    const [selectedType, setSelectedType] = useState<ActivityType>('run');
    const [isStarted, setIsStarted] = useState(false);
    const [gpsAcquired, setGpsAcquired] = useState(false);

    useEffect(() => {
        const unsubscribe = activityTracker.addListener((s) => {
            setSession(s);
            // GPS acquired once we have at least 1 point
            if (s.points && s.points.length > 0) {
                setGpsAcquired(true);
            }
        });

        const existing = activityTracker.getSession();
        if (existing) {
            setSession(existing);
            setSelectedType(existing.activityType);
            setIsStarted(true);
            if (existing.points && existing.points.length > 0) {
                setGpsAcquired(true);
            }
        }

        return unsubscribe;
    }, []);

    const handleStart = useCallback(async () => {
        const success = await activityTracker.start(selectedType, 'local_user');
        if (success) {
            setIsStarted(true);
            setGpsAcquired(false);
        } else {
            Alert.alert('Location Required', 'Please grant location permission to track activities. Go to Settings > Location > Always Allow for best accuracy.');
        }
    }, [selectedType]);

    const handlePause = useCallback(() => {
        activityTracker.pause();
    }, []);

    const handleResume = useCallback(async () => {
        await activityTracker.resume();
    }, []);

    const handleFinish = useCallback(async () => {
        const finished = await activityTracker.finish();
        if (finished) {
            onFinish(finished);
        }
    }, [onFinish]);

    const handleDiscard = useCallback(() => {
        Alert.alert(
            'Discard Activity',
            'Are you sure? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Discard',
                    style: 'destructive',
                    onPress: async () => {
                        await activityTracker.discard();
                        onDiscard();
                    }
                },
            ]
        );
    }, [onDiscard]);

    const isPaused = session?.status === 'paused';
    const isTracking = session?.status === 'tracking';
    const hasMovement = (session?.activityType === 'run' || session?.activityType === 'walk' || session?.activityType === 'cycle');

    // Pre-start: activity type selector
    if (!isStarted) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar barStyle="light-content" />

                <View style={styles.preStartContent}>
                    <Text style={[styles.preStartTitle, { color: colors.text }]}>Start Activity</Text>
                    <Text style={[styles.preStartSubtitle, { color: colors.textSecondary }]}>Choose activity type</Text>

                    <View style={styles.typeSelectorGrid}>
                        {ACTIVITY_TYPES.map(type => (
                            <TouchableOpacity
                                key={type.key}
                                onPress={() => setSelectedType(type.key)}
                                style={[
                                    styles.typeCard,
                                    { backgroundColor: selectedType === type.key ? colors.accent : colors.surface }
                                ]}
                            >
                                <Text style={[
                                    styles.typeLabel,
                                    { color: selectedType === type.key ? colors.background : colors.text }
                                ]}>{type.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity
                        onPress={handleStart}
                        style={[styles.startButton, { backgroundColor: colors.accent }]}
                    >
                        <Play size={20} color={colors.background} fill={colors.background} />
                        <Text style={[styles.startButtonText, { color: colors.background }]}>Start Tracking</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onDiscard} style={styles.cancelBtn}>
                        <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Live tracking view
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle="light-content" />

            {/* Activity Type Badge + GPS Status */}
            <View style={styles.topBar}>
                <View style={[styles.typeBadge, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.typeBadgeText, { color: colors.textSecondary }]}>
                        {ActivityTrackingService.getActivityLabel(session?.activityType || 'run').toUpperCase()}
                    </Text>
                </View>

                {/* GPS status indicator */}
                <View style={[styles.gpsBadge, { backgroundColor: gpsAcquired ? colors.gpsColor + '20' : colors.surfaceAlt }]}>
                    <View style={[styles.gpsDot, { backgroundColor: gpsAcquired ? colors.gpsColor : colors.textTertiary }]} />
                    <Text style={[styles.gpsText, { color: gpsAcquired ? colors.gpsColor : colors.textTertiary }]}>
                        {gpsAcquired ? 'GPS' : 'Acquiring...'}
                    </Text>
                </View>

                {isPaused && (
                    <View style={[styles.pausedBadge, { backgroundColor: colors.danger + '20' }]}>
                        <Text style={[styles.pausedBadgeText, { color: colors.danger }]}>PAUSED</Text>
                    </View>
                )}
            </View>

            {/* Hero Metrics */}
            <View style={styles.metricsSection}>
                {/* Distance - hero number */}
                <View style={styles.heroMetric}>
                    <Text style={[styles.heroValue, { color: colors.text }]}>
                        {session ? (session.distance / 1000).toFixed(2) : '0.00'}
                    </Text>
                    <Text style={[styles.heroUnit, { color: colors.textTertiary }]}>km</Text>
                </View>

                {/* Secondary metrics row */}
                <View style={styles.secondaryMetrics}>
                    {/* Time */}
                    <View style={styles.metricItem}>
                        <Timer size={14} color={colors.textSecondary} />
                        <Text style={[styles.metricValue, { color: colors.text }]}>
                            {ActivityTrackingService.formatDuration(session?.duration || 0)}
                        </Text>
                        <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Time</Text>
                    </View>

                    <View style={[styles.metricDivider, { backgroundColor: colors.accentSubtle }]} />

                    {/* Pace - Replaced by Speed as primary */}
                    <View style={styles.metricItem}>
                        <Gauge size={14} color={colors.textSecondary} />
                        <Text style={[styles.metricValue, { color: colors.text }]}>
                            {ActivityTrackingService.formatSpeed(session?.avgSpeed || 0)}
                        </Text>
                        <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>km/h</Text>
                    </View>

                    <View style={[styles.metricDivider, { backgroundColor: colors.accentSubtle }]} />

                    {/* Elevation or Active Time */}
                    {hasMovement ? (
                        <View style={styles.metricItem}>
                            <TrendingUp size={14} color={colors.textSecondary} />
                            <Text style={[styles.metricValue, { color: colors.text }]}>
                                {Math.round(session?.elevationGain || 0)}
                            </Text>
                            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Ascent (m)</Text>
                        </View>
                    ) : (
                        <View style={styles.metricItem}>
                            <Timer size={14} color={colors.textSecondary} />
                            <Text style={[styles.metricValue, { color: colors.text }]}>
                                {ActivityTrackingService.formatDuration(session?.duration || 0)}
                            </Text>
                            <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Active</Text>
                        </View>
                    )}

                    <View style={[styles.metricDivider, { backgroundColor: colors.accentSubtle }]} />

                    {/* Calories */}
                    <View style={styles.metricItem}>
                        <Flame size={14} color={colors.textSecondary} />
                        <Text style={[styles.metricValue, { color: colors.text }]}>
                            {session?.calories || 0}
                        </Text>
                        <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>kcal</Text>
                    </View>
                </View>
            </View>

            {/* Map */}
            <View style={styles.mapContainer}>
                <ActivityMapView
                    points={session?.points || []}
                    showUserLocation={isTracking || isPaused}
                    isDark={isDark}
                    style={styles.map}
                />
                {(!gpsAcquired) && (
                    <View style={styles.mapPlaceholder}>
                        <MapPin size={24} color={colors.textTertiary} />
                        <Text style={[styles.mapPlaceholderText, { color: colors.textTertiary }]}>
                            {isTracking ? 'Acquiring GPS signal...' : 'Route will appear here'}
                        </Text>
                    </View>
                )}
            </View>

            {/* Controls */}
            <View style={[styles.controls, { backgroundColor: colors.surface }]}>
                {/* Discard button */}
                <TouchableOpacity onPress={handleDiscard} style={styles.controlBtn}>
                    <View style={[styles.controlCircle, { backgroundColor: colors.danger + '15' }]}>
                        <Square size={18} color={colors.danger} fill={colors.danger} />
                    </View>
                    <Text style={[styles.controlLabel, { color: colors.textSecondary }]}>Discard</Text>
                </TouchableOpacity>

                {/* Pause / Resume */}
                <TouchableOpacity
                    onPress={isPaused ? handleResume : handlePause}
                    style={styles.controlBtn}
                >
                    <View style={[styles.mainControlCircle, { backgroundColor: colors.accent }]}>
                        {isPaused
                            ? <Play size={24} color={colors.background} fill={colors.background} />
                            : <Pause size={24} color={colors.background} fill={colors.background} />
                        }
                    </View>
                    <Text style={[styles.controlLabel, { color: colors.textSecondary }]}>
                        {isPaused ? 'Resume' : 'Pause'}
                    </Text>
                </TouchableOpacity>

                {/* Finish */}
                <TouchableOpacity onPress={handleFinish} style={styles.controlBtn}>
                    <View style={[styles.controlCircle, { backgroundColor: colors.accentSubtle }]}>
                        <Square size={18} color={colors.text} />
                    </View>
                    <Text style={[styles.controlLabel, { color: colors.textSecondary }]}>Finish</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    // Pre-start
    preStartContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    preStartTitle: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 8,
    },
    preStartSubtitle: {
        fontSize: 14,
        marginBottom: 40,
    },
    typeSelectorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
        marginBottom: 48,
    },
    typeCard: {
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 16,
        minWidth: 90,
        alignItems: 'center',
    },
    typeLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 40,
        paddingVertical: 18,
        borderRadius: 20,
    },
    startButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
    cancelBtn: {
        marginTop: 24,
        padding: 12,
    },
    cancelText: {
        fontSize: 14,
        fontWeight: '500',
    },

    // Top bar
    topBar: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        paddingTop: 12,
        paddingHorizontal: 24,
        flexWrap: 'wrap',
    },
    typeBadge: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 10,
    },
    typeBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
    },
    gpsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    gpsDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    gpsText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    pausedBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    pausedBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },

    // Metrics
    metricsSection: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 12,
    },
    heroMetric: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        marginBottom: 16,
    },
    heroValue: {
        fontSize: 64,
        fontWeight: '200',
        letterSpacing: -3,
        fontVariant: ['tabular-nums'],
    },
    heroUnit: {
        fontSize: 20,
        fontWeight: '500',
        marginLeft: 6,
    },
    secondaryMetrics: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    metricItem: {
        flex: 1,
        alignItems: 'center',
        gap: 3,
    },
    metricValue: {
        fontSize: 16,
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
    },
    metricLabel: {
        fontSize: 9,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    metricDivider: {
        width: 1,
        height: 36,
    },

    // Map
    mapContainer: {
        flex: 1,
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 20,
        overflow: 'hidden',
    },
    map: {
        flex: 1,
    },
    mapPlaceholder: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    mapPlaceholderText: {
        fontSize: 12,
        fontWeight: '500',
    },

    // Controls
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 20,
        paddingBottom: 32,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
    },
    controlBtn: {
        alignItems: 'center',
        gap: 8,
    },
    controlCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mainControlCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    controlLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
});
