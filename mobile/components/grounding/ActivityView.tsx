import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Flame, Users, ArrowUp, Zap, MapPin, Plus, Trash2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ActivityEntry {
    id: string;
    type: 'walk' | 'run' | 'bike';
    distance: number;
    duration: number;
    calories: number;
    date: string;
}

interface TogetherBurnUser {
    id: string;
    name: string;
    caloriesBurned: number;
}

const STORAGE_KEYS = {
    ACTIVITIES: 'wrex_activities',
    TOGETHER_BURN: 'wrex_together_burn',
};

// Calculate calories based on activity type and duration
const calculateCalories = (type: 'walk' | 'run' | 'bike', durationHours: number, distanceKm: number): number => {
    const caloriesPerHour: Record<string, number> = {
        walk: 280,
        run: 600,
        bike: 450,
    };
    return Math.round(caloriesPerHour[type] * durationHours);
};

// Calculate average speed
const calculateSpeed = (distanceKm: number, durationHours: number): number => {
    if (durationHours === 0) return 0;
    return Math.round((distanceKm / durationHours) * 10) / 10;
};

export default function ActivityView() {
    const { mode } = useTheme();
    const isDark = mode === 'dark';

    // Monochrome colors
    const colors = {
        background: isDark ? '#000000' : '#FFFFFF',
        surface: isDark ? '#111111' : '#F5F5F5',
        border: isDark ? '#333333' : '#E0E0E0',
        text: isDark ? '#FFFFFF' : '#000000',
        textSecondary: isDark ? '#888888' : '#666666',
        accent: isDark ? '#FFFFFF' : '#000000',
    };

    const [activityType, setActivityType] = useState<'walk' | 'run' | 'bike'>('run');
    const [activities, setActivities] = useState<ActivityEntry[]>([]);

    // Input state for new activity
    const [newDistance, setNewDistance] = useState('');
    const [newDuration, setNewDuration] = useState('');

    // --- Together Burn State ---
    const [friends, setFriends] = useState<TogetherBurnUser[]>([]);
    const [newFriendName, setNewFriendName] = useState("");
    const [newFriendCals, setNewFriendCals] = useState("");

    // Load data on mount
    useEffect(() => {
        loadStoredData();
    }, []);

    const loadStoredData = async () => {
        try {
            const [storedActivities, storedFriends] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.ACTIVITIES),
                AsyncStorage.getItem(STORAGE_KEYS.TOGETHER_BURN),
            ]);

            if (storedActivities) setActivities(JSON.parse(storedActivities));
            if (storedFriends) setFriends(JSON.parse(storedFriends));
        } catch (error) {
            console.error('Error loading activity data:', error);
        }
    };

    // Save activities
    useEffect(() => {
        if (activities.length > 0) {
            AsyncStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
        }
    }, [activities]);

    // Save friends
    useEffect(() => {
        if (friends.length > 0) {
            AsyncStorage.setItem(STORAGE_KEYS.TOGETHER_BURN, JSON.stringify(friends));
        }
    }, [friends]);

    // Calculate metrics from activities
    const todayActivities = activities.filter(a => {
        const today = new Date().toDateString();
        return new Date(a.date).toDateString() === today;
    });

    const currentMetrics = {
        distance: todayActivities.reduce((sum, a) => sum + a.distance, 0),
        duration: todayActivities.reduce((sum, a) => sum + a.duration, 0),
        calories: todayActivities.reduce((sum, a) => sum + a.calories, 0),
        elevation: Math.round(todayActivities.length * 50), // Simulated
        speed: todayActivities.length > 0
            ? calculateSpeed(
                todayActivities.reduce((sum, a) => sum + a.distance, 0),
                todayActivities.reduce((sum, a) => sum + a.duration, 0)
            )
            : 0,
    };

    const totalGroupBurn = friends.reduce((acc, curr) => acc + curr.caloriesBurned, 0) + currentMetrics.calories;

    const addActivity = async () => {
        const distance = parseFloat(newDistance) || 0;
        const duration = parseFloat(newDuration) || 0;

        if (distance <= 0 && duration <= 0) return;

        const activity: ActivityEntry = {
            id: Date.now().toString(),
            type: activityType,
            distance,
            duration,
            calories: calculateCalories(activityType, duration, distance),
            date: new Date().toISOString(),
        };

        setActivities([...activities, activity]);
        setNewDistance('');
        setNewDuration('');
    };

    const deleteActivity = async (id: string) => {
        const updated = activities.filter(a => a.id !== id);
        setActivities(updated);
        if (updated.length === 0) {
            await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVITIES);
        }
    };

    const addFriend = async () => {
        if (!newFriendName || !newFriendCals) return;
        const friend: TogetherBurnUser = {
            id: Date.now().toString(),
            name: newFriendName,
            caloriesBurned: Number(newFriendCals) || 0
        };
        setFriends([...friends, friend]);
        setNewFriendName("");
        setNewFriendCals("");
    };

    const deleteFriend = async (id: string) => {
        const updated = friends.filter(f => f.id !== id);
        setFriends(updated);
        if (updated.length === 0) {
            await AsyncStorage.removeItem(STORAGE_KEYS.TOGETHER_BURN);
        }
    };

    return (
        <View style={styles.container}>
            {/* Activity Type Selector */}
            <View style={styles.typeSelector}>
                {(['walk', 'run', 'bike'] as const).map(t => (
                    <TouchableOpacity
                        key={t}
                        onPress={() => setActivityType(t)}
                        style={[
                            styles.typeButton,
                            { borderColor: colors.border },
                            activityType === t && { backgroundColor: colors.accent }
                        ]}
                    >
                        <Text style={[
                            styles.typeText,
                            { color: activityType === t ? (isDark ? '#000' : '#FFF') : colors.text }
                        ]}>
                            {t.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Log Activity Input */}
            <View style={[styles.logCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Log Activity</Text>
                <View style={styles.inputRow}>
                    <TextInput
                        placeholder="Distance (km)"
                        placeholderTextColor={colors.textSecondary}
                        value={newDistance}
                        onChangeText={setNewDistance}
                        keyboardType="numeric"
                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    />
                    <TextInput
                        placeholder="Duration (hrs)"
                        placeholderTextColor={colors.textSecondary}
                        value={newDuration}
                        onChangeText={setNewDuration}
                        keyboardType="numeric"
                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    />
                    <TouchableOpacity onPress={addActivity} style={[styles.addButton, { backgroundColor: colors.accent }]}>
                        <Plus size={20} color={isDark ? '#000' : '#FFF'} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Metrics Grid */}
            <View style={styles.metricsGrid}>
                <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.metricHeader}>
                        <MapPin size={14} color={colors.textSecondary} />
                        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>DISTANCE</Text>
                    </View>
                    <Text style={[styles.metricValue, { color: colors.text }]}>
                        {currentMetrics.distance.toFixed(1)} <Text style={[styles.metricUnit, { color: colors.textSecondary }]}>km</Text>
                    </Text>
                </View>
                <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.metricHeader}>
                        <Flame size={14} color={colors.textSecondary} />
                        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>CALORIES</Text>
                    </View>
                    <Text style={[styles.metricValue, { color: colors.text }]}>
                        {currentMetrics.calories} <Text style={[styles.metricUnit, { color: colors.textSecondary }]}>kcal</Text>
                    </Text>
                </View>
                <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.metricHeader}>
                        <Zap size={14} color={colors.textSecondary} />
                        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>AVG SPEED</Text>
                    </View>
                    <Text style={[styles.metricValue, { color: colors.text }]}>
                        {currentMetrics.speed} <Text style={[styles.metricUnit, { color: colors.textSecondary }]}>km/h</Text>
                    </Text>
                </View>
                <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.metricHeader}>
                        <ArrowUp size={14} color={colors.textSecondary} />
                        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>ELEVATION</Text>
                    </View>
                    <Text style={[styles.metricValue, { color: colors.text }]}>
                        {currentMetrics.elevation} <Text style={[styles.metricUnit, { color: colors.textSecondary }]}>m</Text>
                    </Text>
                </View>
            </View>

            {/* Recent Activities */}
            {todayActivities.length > 0 && (
                <View style={styles.recentSection}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Activities</Text>
                    {todayActivities.slice(-5).reverse().map(activity => (
                        <View key={activity.id} style={[styles.activityItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View>
                                <Text style={[styles.activityType, { color: colors.text }]}>{activity.type.toUpperCase()}</Text>
                                <Text style={[styles.activityDetails, { color: colors.textSecondary }]}>
                                    {activity.distance}km - {activity.duration}h - {activity.calories}kcal
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => deleteActivity(activity.id)}>
                                <Trash2 size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            {/* Together Burn Section */}
            <View style={[styles.togetherCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.togetherHeader}>
                    <Users size={24} color={colors.text} />
                    <Text style={[styles.togetherTitle, { color: colors.text }]}>Together Burn</Text>
                </View>

                <View style={styles.totalBurn}>
                    <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>TOTAL GROUP ENERGY</Text>
                    <Text style={[styles.totalValue, { color: colors.text }]}>{totalGroupBurn} <Text style={styles.totalUnit}>kcal</Text></Text>
                </View>

                {/* Add Friend Form */}
                <View style={styles.addFriendRow}>
                    <TextInput
                        placeholder="Name"
                        placeholderTextColor={colors.textSecondary}
                        value={newFriendName}
                        onChangeText={setNewFriendName}
                        style={[styles.friendInput, { backgroundColor: colors.background, color: colors.text }]}
                    />
                    <TextInput
                        placeholder="Kcal"
                        placeholderTextColor={colors.textSecondary}
                        value={newFriendCals}
                        onChangeText={setNewFriendCals}
                        keyboardType="numeric"
                        style={[styles.friendInputSmall, { backgroundColor: colors.background, color: colors.text }]}
                    />
                    <TouchableOpacity onPress={addFriend} style={[styles.addFriendButton, { backgroundColor: colors.accent }]}>
                        <Plus size={20} color={isDark ? '#000' : '#FFF'} />
                    </TouchableOpacity>
                </View>

                {/* Friends List */}
                <View style={styles.friendsList}>
                    {friends.map(f => (
                        <View key={f.id} style={[styles.friendItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <Text style={[styles.friendName, { color: colors.text }]}>{f.name}</Text>
                            <View style={styles.friendRight}>
                                <Text style={[styles.friendCals, { color: colors.textSecondary }]}>{f.caloriesBurned} kcal</Text>
                                <TouchableOpacity onPress={() => deleteFriend(f.id)}>
                                    <Trash2 size={14} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                    {friends.length === 0 && (
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Add friends to complete the challenge!</Text>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 24,
        gap: 16,
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 8,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
    },
    typeText: {
        fontWeight: '700',
    },
    logCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    cardTitle: {
        fontWeight: '700',
        marginBottom: 12,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 8,
    },
    input: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
    },
    addButton: {
        paddingHorizontal: 16,
        justifyContent: 'center',
        borderRadius: 8,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    metricCard: {
        width: '48%',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    metricHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    metricLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    metricValue: {
        fontSize: 24,
        fontWeight: '700',
    },
    metricUnit: {
        fontSize: 12,
        fontWeight: '400',
    },
    recentSection: {
        gap: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    activityItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    activityType: {
        fontWeight: '700',
    },
    activityDetails: {
        fontSize: 11,
    },
    togetherCard: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
    },
    togetherHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    togetherTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    totalBurn: {
        alignItems: 'center',
        marginBottom: 24,
    },
    totalLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    totalValue: {
        fontSize: 48,
        fontWeight: '700',
    },
    totalUnit: {
        fontSize: 16,
    },
    addFriendRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    friendInput: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
    },
    friendInputSmall: {
        width: 80,
        padding: 10,
        borderRadius: 8,
    },
    addFriendButton: {
        paddingHorizontal: 12,
        justifyContent: 'center',
        borderRadius: 8,
    },
    friendsList: {
        gap: 8,
    },
    friendItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    friendName: {
        fontWeight: '600',
    },
    friendRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    friendCals: {
        fontWeight: '600',
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 12,
    },
});
