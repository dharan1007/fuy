import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, StatusBar, Modal, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, X, Save, Zap, Droplets } from 'lucide-react-native';
import HumanBodySVG from '../components/HumanBodySVG';
import { useTheme } from '../context/ThemeContext';
import WorkoutView from '../components/grounding/WorkoutView';
import HealthView from '../components/grounding/HealthView';
import ActivityView from '../components/grounding/ActivityView';
import DietView from '../components/grounding/DietView'; // Still needed for HealthView
import { calculateNutritionRequirements, FitnessGoal, Gender } from '../lib/nutritionScience';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

type TabType = 'dashboard' | 'workout' | 'health' | 'activity';

interface UserMetrics {
    height: number;
    weight: number;
    age: number;
    gender: Gender;
    activityLevel: string;
}

interface BodyMetrics {
    bmi: number;
    bmr: number;
    tdee: number;
    goalCalories: number;
    proteinG: number;
    carbsG: number;
    fatsG: number;
}

const STORAGE_KEYS = {
    USER_METRICS: 'wrex_user_metrics',
    BODY_NOTES: 'wrex_body_notes',
    GOAL_TYPE: 'wrex_goal_type',
};

export default function GroundingScreen() {
    const router = useRouter();
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

    const [activeTab, setActiveTab] = useState<TabType>('dashboard');
    const [showMetricsModal, setShowMetricsModal] = useState(false);

    // --- 3D Interaction State ---
    const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null);
    const [bodyPartNote, setBodyPartNote] = useState("");
    const [bodyNotes, setBodyNotes] = useState<Record<string, string>>({});

    // --- Metrics State ---
    const [userMetrics, setUserMetrics] = useState<UserMetrics>({
        height: 175,
        weight: 70,
        age: 25,
        gender: "male",
        activityLevel: "moderately_active",
    });
    const [goalType, setGoalType] = useState<FitnessGoal>("maintain");
    const [bodyMetrics, setBodyMetrics] = useState<BodyMetrics | null>(null);

    // Load saved data on mount
    useEffect(() => {
        loadStoredData();
    }, []);

    const loadStoredData = async () => {
        try {
            const [storedMetrics, storedNotes, storedGoal] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.USER_METRICS),
                AsyncStorage.getItem(STORAGE_KEYS.BODY_NOTES),
                AsyncStorage.getItem(STORAGE_KEYS.GOAL_TYPE),
            ]);

            if (storedMetrics) setUserMetrics(JSON.parse(storedMetrics));
            if (storedNotes) setBodyNotes(JSON.parse(storedNotes));
            if (storedGoal) setGoalType(storedGoal as FitnessGoal);
        } catch (error) {
            console.error('Error loading stored data:', error);
        }
    };

    // Save metrics when changed
    useEffect(() => {
        AsyncStorage.setItem(STORAGE_KEYS.USER_METRICS, JSON.stringify(userMetrics));
    }, [userMetrics]);

    // Save goal when changed
    useEffect(() => {
        AsyncStorage.setItem(STORAGE_KEYS.GOAL_TYPE, goalType);
    }, [goalType]);

    // Calculate body metrics
    useEffect(() => {
        const hM = userMetrics.height / 100;
        const bmi = Number((userMetrics.weight / (hM * hM)).toFixed(1));

        let bmr = (10 * userMetrics.weight) + (6.25 * userMetrics.height) - (5 * userMetrics.age);
        bmr += userMetrics.gender === 'male' ? 5 : -161;

        const multipliers: Record<string, number> = {
            sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55, very_active: 1.725, extra_active: 1.9,
        };
        const tdee = Math.round(bmr * (multipliers[userMetrics.activityLevel] || 1.55));
        const reqs = calculateNutritionRequirements(tdee, goalType, userMetrics.gender, userMetrics.age);

        setBodyMetrics({
            bmi, bmr: Math.round(bmr), tdee,
            goalCalories: reqs.dailyCalories,
            proteinG: reqs.protein.grams,
            carbsG: reqs.carbs.grams,
            fatsG: reqs.fats.grams
        });
    }, [userMetrics, goalType]);


    const handleBodyPartClick = (partName: string) => {
        setSelectedBodyPart(partName);
        setBodyPartNote(bodyNotes[partName] || "");
    };

    const saveBodyNote = async () => {
        if (selectedBodyPart) {
            const newNotes = { ...bodyNotes, [selectedBodyPart]: bodyPartNote };
            setBodyNotes(newNotes);
            await AsyncStorage.setItem(STORAGE_KEYS.BODY_NOTES, JSON.stringify(newNotes));
            setSelectedBodyPart(null);
        }
    };

    // --- Render Functions ---

    const renderHeader = () => (
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
                onPress={() => router.back()}
                style={[styles.headerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
                <ChevronLeft color={colors.text} size={24} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>WREX BODY</Text>
            <TouchableOpacity
                onPress={() => setShowMetricsModal(true)}
                style={[styles.headerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
                <Plus color={colors.text} size={20} />
            </TouchableOpacity>
        </View>
    );

    const renderTabs = () => (
        <View style={[styles.tabContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {(['dashboard', 'workout', 'health', 'activity'] as TabType[]).map((tab) => (
                <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    style={[
                        styles.tab,
                        activeTab === tab && { backgroundColor: colors.accent }
                    ]}
                >
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === tab ? (isDark ? '#000000' : '#FFFFFF') : colors.textSecondary }
                    ]}>
                        {tab.toUpperCase()}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderDetailedMetrics = () => (
        <View style={styles.metricsContainer}>
            <View style={styles.metricsRow}>
                {/* BMR Card */}
                <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.metricHeader}>
                        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>BMR</Text>
                        <Zap size={14} color={colors.textSecondary} />
                    </View>
                    <Text style={[styles.metricValue, { color: colors.text }]}>{bodyMetrics?.bmr || 0}</Text>
                    <Text style={[styles.metricUnit, { color: colors.textSecondary }]}>Kcal / Day</Text>
                </View>

                {/* BMI Card */}
                <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary, textAlign: 'right' }]}>BMI</Text>
                    <View style={styles.bmiCenter}>
                        <Text style={[styles.metricValueLarge, { color: colors.text }]}>{bodyMetrics?.bmi || 0}</Text>
                    </View>
                    <Text style={[styles.metricUnit, { color: colors.textSecondary, textAlign: 'center' }]}>Normal Range</Text>
                </View>
            </View>

            {/* Macros Row */}
            <View style={[styles.macrosCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.macrosHeader}>
                    <Text style={[styles.macrosTitle, { color: colors.text }]}>Nutrient Breakdown</Text>
                    <Text style={[styles.goalBadge, { color: colors.textSecondary }]}>{goalType.replace('_', ' ')}</Text>
                </View>
                <View style={styles.macrosGrid}>
                    <View style={styles.macroItem}>
                        <View style={[styles.macroCircle, { borderColor: colors.border }]}>
                            <Text style={[styles.macroValue, { color: colors.text }]}>{bodyMetrics?.proteinG}</Text>
                        </View>
                        <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>PROTEIN</Text>
                    </View>
                    <View style={styles.macroItem}>
                        <View style={[styles.macroCircle, { borderColor: colors.border }]}>
                            <Text style={[styles.macroValue, { color: colors.text }]}>{bodyMetrics?.carbsG}</Text>
                        </View>
                        <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>CARBS</Text>
                    </View>
                    <View style={styles.macroItem}>
                        <View style={[styles.macroCircle, { borderColor: colors.border }]}>
                            <Text style={[styles.macroValue, { color: colors.text }]}>{bodyMetrics?.fatsG}</Text>
                        </View>
                        <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>FATS</Text>
                    </View>
                    <View style={styles.macroItem}>
                        <View style={[styles.macroCircle, { borderColor: colors.border }]}>
                            <Droplets size={16} color={colors.text} />
                        </View>
                        <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>H2O</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderMetricsCards = () => (
        <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>RECOVERY</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>85<Text style={styles.statUnit}>%</Text></Text>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                    <View style={[styles.progressFill, { width: '85%', backgroundColor: colors.text }]} />
                </View>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>LOAD</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>High</Text>
                <View style={styles.loadVisualizer}>
                    {[40, 60, 45, 70, 50, 60, 40].map((h, i) => (
                        <View key={i} style={[styles.loadBar, { height: h * 0.4, backgroundColor: colors.text }]} />
                    ))}
                </View>
            </View>
        </View>
    );

    const renderBodyPartModal = () => (
        <Modal visible={!!selectedBodyPart} animationType="fade" transparent>
            <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
                <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedBodyPart}</Text>
                        <TouchableOpacity onPress={() => setSelectedBodyPart(null)} style={[styles.closeButton, { backgroundColor: colors.surface }]}>
                            <X size={20} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Log Issue / Note</Text>
                    <TextInput
                        multiline
                        placeholder="e.g. Soreness from yesterday's workout..."
                        placeholderTextColor={colors.textSecondary}
                        value={bodyPartNote}
                        onChangeText={setBodyPartNote}
                        style={[styles.noteInput, {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            color: colors.text
                        }]}
                    />

                    <TouchableOpacity onPress={saveBodyNote} style={[styles.saveButton, { backgroundColor: colors.text }]}>
                        <Save size={20} color={colors.background} />
                        <Text style={[styles.saveButtonText, { color: colors.background }]}>Save Note</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const renderBodyLabels = () => (
        <View style={styles.bodyLabelsContainer}>
            {Object.entries(bodyNotes).slice(0, 3).map(([part, note]) => (
                <View key={part} style={[styles.bodyLabel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.labelDot, { backgroundColor: colors.text }]} />
                    <View>
                        <Text style={[styles.labelTitle, { color: colors.text }]}>{part}</Text>
                        <Text style={[styles.labelNote, { color: colors.textSecondary }]} numberOfLines={1}>{note}</Text>
                    </View>
                </View>
            ))}
        </View>
    );

    const renderDashboard = () => (
        <View>

            {/* Central Body Visualization */}
            <View style={styles.bodyContainer}>
                <HumanBodySVG
                    onPartClick={handleBodyPartClick}
                    selectedPart={selectedBodyPart}
                    width={width * 0.7}
                    height={400}
                />

                {/* Saved Info Labels */}
                {renderBodyLabels()}

                {/* Floating Data Points */}
                <View style={[styles.floatingCard, styles.floatingRight, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.floatingHeader}>
                        <View style={[styles.floatingDot, { backgroundColor: colors.text }]} />
                        <Text style={[styles.floatingLabel, { color: colors.text }]}>Muscle Mass</Text>
                    </View>
                    <Text style={[styles.floatingValue, { color: colors.text }]}>58.4 <Text style={[styles.floatingUnit, { color: colors.textSecondary }]}>Lbs</Text></Text>
                </View>

                <View style={[styles.floatingCard, styles.floatingLeft, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.floatingHeader}>
                        <View style={[styles.floatingDot, { backgroundColor: colors.textSecondary }]} />
                        <Text style={[styles.floatingLabel, { color: colors.text }]}>Fat %</Text>
                    </View>
                    <Text style={[styles.floatingValue, { color: colors.text }]}>14.2 <Text style={[styles.floatingUnit, { color: colors.textSecondary }]}>%</Text></Text>
                </View>
            </View>

            {renderMetricsCards()}
            {renderDetailedMetrics()}
            {renderBodyPartModal()}
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <SafeAreaView edges={['top']} style={styles.safeArea}>
                {renderHeader()}

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {renderTabs()}

                    {activeTab === 'dashboard' && renderDashboard()}
                    {activeTab === 'workout' && <WorkoutView />}
                    {activeTab === 'health' && <HealthView />}
                    {activeTab === 'activity' && <ActivityView />}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 3,
    },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginHorizontal: 24,
        marginVertical: 16,
        padding: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    tabText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    topSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 24,
        marginBottom: 8,
    },
    dateSubtitle: {
        fontSize: 12,
    },
    dateTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    bodyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 0,
        marginBottom: 16,
        position: 'relative',
        minHeight: 380,
    },
    bodyLabelsContainer: {
        position: 'absolute',
        top: 16,
        left: 16,
        gap: 8,
    },
    bodyLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
    },
    labelDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    labelTitle: {
        fontSize: 11,
        fontWeight: '700',
    },
    labelNote: {
        fontSize: 9,
        maxWidth: 100,
    },
    floatingCard: {
        position: 'absolute',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
    },
    floatingRight: {
        top: 40,
        right: 16,
    },
    floatingLeft: {
        bottom: 40,
        left: 16,
    },
    floatingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    floatingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    floatingLabel: {
        fontSize: 10,
        fontWeight: '700',
    },
    floatingValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    floatingUnit: {
        fontSize: 10,
        fontWeight: '400',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 8,
    },
    statUnit: {
        fontSize: 14,
        fontWeight: '400',
    },
    progressBar: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    loadVisualizer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 40,
        marginTop: 16,
        gap: 4,
        opacity: 0.6,
    },
    loadBar: {
        width: 6,
        borderRadius: 3,
    },
    metricsContainer: {
        paddingHorizontal: 24,
        paddingBottom: 80,
    },
    metricsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    metricCard: {
        flex: 1,
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
    },
    metricHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    metricLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    metricValue: {
        fontSize: 28,
        fontWeight: '300',
    },
    metricValueLarge: {
        fontSize: 32,
        fontWeight: '700',
    },
    metricUnit: {
        fontSize: 11,
        marginTop: 4,
    },
    bmiCenter: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 8,
    },
    macrosCard: {
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 16,
    },
    macrosHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    macrosTitle: {
        fontWeight: '700',
    },
    goalBadge: {
        fontSize: 11,
        textTransform: 'capitalize',
    },
    macrosGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    macroItem: {
        alignItems: 'center',
    },
    macroCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    macroValue: {
        fontSize: 12,
        fontWeight: '700',
    },
    macroLabel: {
        fontSize: 9,
        letterSpacing: 0.5,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    closeButton: {
        padding: 8,
        borderRadius: 12,
    },
    inputLabel: {
        marginBottom: 8,
    },
    noteInput: {
        padding: 16,
        height: 128,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
        textAlignVertical: 'top',
    },
    saveButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 8,
    },
    saveButtonText: {
        fontWeight: '700',
    },
});
