import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, StatusBar, Modal, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, X, Save, Zap, Droplets, Dumbbell, Heart, Activity, ChevronRight, Settings } from 'lucide-react-native';
import HumanBodySVG from '../../components/HumanBodySVG';
import { useTheme } from '../../context/ThemeContext';
import WorkoutView from '../../components/grounding/WorkoutView';
import HealthView from '../../components/grounding/HealthView';
import ActivityView from '../../components/grounding/ActivityView';
import DietView from '../../components/grounding/DietView';
import { calculateNutritionRequirements, FitnessGoal, Gender } from '../../lib/nutritionScience';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

type TabType = 'workout' | 'health' | 'activity';

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

// Apple-style color system
const APPLE_COLORS = {
    background: '#0B0B0B',
    card: '#161616',
    cardElevated: '#1C1C1C',
    border: '#1E1E1E',
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    accent: '#FFFFFF',
    accentSubtle: '#2A2A2A',
    // Subtle tints for specific metrics
    recoveryTint: '#34D399',
    loadTint: '#F59E0B',
};

export default function GroundingScreen() {
    const router = useRouter();
    const { mode } = useTheme();
    const isDark = mode === 'dark';

    // Use Apple colors for dark mode, keep light mode functional
    const colors = isDark ? {
        background: APPLE_COLORS.background,
        surface: APPLE_COLORS.card,
        surfaceElevated: APPLE_COLORS.cardElevated,
        border: APPLE_COLORS.border,
        text: APPLE_COLORS.text,
        textSecondary: APPLE_COLORS.textSecondary,
        textTertiary: APPLE_COLORS.textTertiary,
        accent: APPLE_COLORS.accent,
        accentSubtle: APPLE_COLORS.accentSubtle,
    } : {
        background: '#F8F8F8',
        surface: '#FFFFFF',
        surfaceElevated: '#FFFFFF',
        border: '#E5E5E5',
        text: '#000000',
        textSecondary: '#6B7280',
        textTertiary: '#9CA3AF',
        accent: '#000000',
        accentSubtle: '#F0F0F0',
    };

    const [activeTab, setActiveTab] = useState<TabType>('activity');
    const [showMetricsModal, setShowMetricsModal] = useState(false);

    // --- Side Stack Collapse State (PRESERVED) ---
    const [isStackExpanded, setIsStackExpanded] = useState(true);
    const translateX = useSharedValue(0);

    const toggleStack = (expand: boolean) => {
        setIsStackExpanded(expand);
        translateX.value = withSpring(expand ? 0 : -60, {
            damping: 15,
            stiffness: 150
        });
    };

    const gestureHandler = Gesture.Pan()
        .onUpdate((event) => {
            if (event.translationX < -20) {
                runOnJS(toggleStack)(false);
            } else if (event.translationX > 20) {
                runOnJS(toggleStack)(true);
            }
        });

    const animatedStackStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }]
        };
    });

    const animatedCollapsedButtonStyle = useAnimatedStyle(() => {
        return {
            opacity: withSpring(translateX.value < -30 ? 1 : 0),
            transform: [{ scale: withSpring(translateX.value < -30 ? 1 : 0.5) }],
            left: withSpring(translateX.value < -30 ? 0 : -50),
        };
    });

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
                style={[styles.headerButton, { backgroundColor: colors.surface }]}
            >
                <ChevronLeft color={colors.textSecondary} size={20} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>WREX</Text>
            <TouchableOpacity
                onPress={() => setShowMetricsModal(true)}
                style={[styles.headerButton, { backgroundColor: colors.surface }]}
            >
                <Settings color={colors.textSecondary} size={18} />
            </TouchableOpacity>
        </View>
    );

    // --- Recovery Ring Component ---
    const renderRecoveryRing = () => {
        const recovery = 85;
        const circumference = 2 * Math.PI * 52;
        const strokeDashoffset = circumference - (recovery / 100) * circumference;

        return (
            <View style={styles.heroSection}>
                <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>DAILY RECOVERY</Text>
                <View style={styles.ringContainer}>
                    {/* Background ring */}
                    <View style={[styles.ringBackground, { borderColor: colors.accentSubtle }]} />
                    {/* Progress ring overlay (visual approximation with a bordered view) */}
                    <View style={styles.ringContent}>
                        <Text style={[styles.heroNumber, { color: colors.text }]}>{recovery}</Text>
                        <Text style={[styles.heroUnit, { color: colors.textSecondary }]}>%</Text>
                    </View>
                </View>
                <Text style={[styles.heroStatus, { color: APPLE_COLORS.recoveryTint }]}>Optimal</Text>
            </View>
        );
    };

    const renderDetailedMetrics = () => (
        <View style={styles.metricsSection}>
            {/* BMR & BMI Row */}
            <View style={styles.metricsRow}>
                <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
                    <View style={styles.metricCardHeader}>
                        <Zap size={14} color={colors.textSecondary} />
                        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>BMR</Text>
                    </View>
                    <Text style={[styles.metricValueLarge, { color: colors.text }]}>{bodyMetrics?.bmr || 0}</Text>
                    <Text style={[styles.metricUnit, { color: colors.textTertiary }]}>kcal / day</Text>
                </View>

                <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary, textAlign: 'right' }]}>BMI</Text>
                    <View style={styles.bmiCenter}>
                        <Text style={[styles.metricValueHero, { color: colors.text }]}>{bodyMetrics?.bmi || 0}</Text>
                    </View>
                    <Text style={[styles.metricUnit, { color: colors.textTertiary, textAlign: 'center' }]}>Normal Range</Text>
                </View>
            </View>

            {/* Nutrient Breakdown */}
            <View style={[styles.nutrientCard, { backgroundColor: colors.surface }]}>
                <View style={styles.nutrientHeader}>
                    <Text style={[styles.nutrientTitle, { color: colors.text }]}>Nutrient Breakdown</Text>
                    <View style={[styles.goalPill, { backgroundColor: colors.accentSubtle }]}>
                        <Text style={[styles.goalPillText, { color: colors.textSecondary }]}>{goalType.replace('_', ' ')}</Text>
                    </View>
                </View>

                {/* Macro bars */}
                <View style={styles.macrosList}>
                    <View style={styles.macroRow}>
                        <Text style={[styles.macroName, { color: colors.textSecondary }]}>Protein</Text>
                        <View style={[styles.macroBar, { backgroundColor: colors.accentSubtle }]}>
                            <View style={[styles.macroBarFill, { width: `${Math.min(100, ((bodyMetrics?.proteinG || 0) / 200) * 100)}%`, backgroundColor: '#E5E7EB' }]} />
                        </View>
                        <Text style={[styles.macroValue, { color: colors.text }]}>{bodyMetrics?.proteinG}g</Text>
                    </View>
                    <View style={styles.macroRow}>
                        <Text style={[styles.macroName, { color: colors.textSecondary }]}>Carbs</Text>
                        <View style={[styles.macroBar, { backgroundColor: colors.accentSubtle }]}>
                            <View style={[styles.macroBarFill, { width: `${Math.min(100, ((bodyMetrics?.carbsG || 0) / 350) * 100)}%`, backgroundColor: '#D1D5DB' }]} />
                        </View>
                        <Text style={[styles.macroValue, { color: colors.text }]}>{bodyMetrics?.carbsG}g</Text>
                    </View>
                    <View style={styles.macroRow}>
                        <Text style={[styles.macroName, { color: colors.textSecondary }]}>Fats</Text>
                        <View style={[styles.macroBar, { backgroundColor: colors.accentSubtle }]}>
                            <View style={[styles.macroBarFill, { width: `${Math.min(100, ((bodyMetrics?.fatsG || 0) / 120) * 100)}%`, backgroundColor: '#9CA3AF' }]} />
                        </View>
                        <Text style={[styles.macroValue, { color: colors.text }]}>{bodyMetrics?.fatsG}g</Text>
                    </View>
                    <View style={styles.macroRow}>
                        <Text style={[styles.macroName, { color: colors.textSecondary }]}>Water</Text>
                        <View style={[styles.macroBar, { backgroundColor: colors.accentSubtle }]}>
                            <View style={[styles.macroBarFill, { width: '60%', backgroundColor: '#6B7280' }]} />
                        </View>
                        <Droplets size={14} color={colors.textSecondary} />
                    </View>
                </View>
            </View>
        </View>
    );

    const renderMetricsCards = () => (
        <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>RECOVERY</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>85<Text style={[styles.statUnit, { color: colors.textTertiary }]}>%</Text></Text>
                <View style={[styles.progressBar, { backgroundColor: colors.accentSubtle }]}>
                    <View style={[styles.progressFill, { width: '85%', backgroundColor: APPLE_COLORS.recoveryTint }]} />
                </View>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>LOAD</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>High</Text>
                <View style={styles.loadVisualizer}>
                    {[40, 60, 45, 70, 50, 60, 40].map((h, i) => (
                        <View key={i} style={[styles.loadBar, { height: h * 0.4, backgroundColor: colors.textTertiary }]} />
                    ))}
                </View>
            </View>
        </View>
    );

    const renderBodyPartModal = () => (
        <Modal visible={!!selectedBodyPart} animationType="fade" transparent>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedBodyPart}</Text>
                        <TouchableOpacity onPress={() => setSelectedBodyPart(null)} style={[styles.closeButton, { backgroundColor: colors.accentSubtle }]}>
                            <X size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Log Issue / Note</Text>
                    <TextInput
                        multiline
                        placeholder="e.g. Soreness from yesterday's workout..."
                        placeholderTextColor={colors.textTertiary}
                        value={bodyPartNote}
                        onChangeText={setBodyPartNote}
                        style={[styles.noteInput, {
                            backgroundColor: colors.accentSubtle,
                            color: colors.text
                        }]}
                    />

                    <TouchableOpacity onPress={saveBodyNote} style={[styles.saveButton, { backgroundColor: colors.text }]}>
                        <Save size={18} color={colors.background} />
                        <Text style={[styles.saveButtonText, { color: colors.background }]}>Save Note</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const renderBodyLabels = () => (
        <View style={styles.bodyLabelsContainer}>
            {Object.entries(bodyNotes).slice(0, 3).map(([part, note]) => (
                <View key={part} style={[styles.bodyLabel, { backgroundColor: colors.surface }]}>
                    <View style={[styles.labelDot, { backgroundColor: colors.textSecondary }]} />
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
            {/* Hero Recovery Section */}
            {renderRecoveryRing()}

            {/* Key Metrics Grid */}
            <View style={styles.keyMetricsGrid}>
                <View style={[styles.keyMetricCard, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.keyMetricLabel, { color: colors.textSecondary }]}>Muscle Mass</Text>
                    <Text style={[styles.keyMetricValue, { color: colors.text }]}>58.4</Text>
                    <Text style={[styles.keyMetricUnit, { color: colors.textTertiary }]}>Lbs</Text>
                </View>
                <View style={[styles.keyMetricCard, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.keyMetricLabel, { color: colors.textSecondary }]}>Fat %</Text>
                    <Text style={[styles.keyMetricValue, { color: colors.text }]}>14.2</Text>
                    <Text style={[styles.keyMetricUnit, { color: colors.textTertiary }]}>%</Text>
                </View>
                <View style={[styles.keyMetricCard, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.keyMetricLabel, { color: colors.textSecondary }]}>Goal Cal</Text>
                    <Text style={[styles.keyMetricValue, { color: colors.text }]}>{bodyMetrics?.goalCalories || 0}</Text>
                    <Text style={[styles.keyMetricUnit, { color: colors.textTertiary }]}>kcal</Text>
                </View>
                <View style={[styles.keyMetricCard, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.keyMetricLabel, { color: colors.textSecondary }]}>TDEE</Text>
                    <Text style={[styles.keyMetricValue, { color: colors.text }]}>{bodyMetrics?.tdee || 0}</Text>
                    <Text style={[styles.keyMetricUnit, { color: colors.textTertiary }]}>kcal</Text>
                </View>
            </View>

            {renderMetricsCards()}
            {renderDetailedMetrics()}

            {/* Body Visualization */}
            <View style={styles.bodySectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Body Map</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Tap to log notes</Text>
            </View>
            <View style={styles.bodyContainer}>
                <HumanBodySVG
                    onPartClick={handleBodyPartClick}
                    selectedPart={selectedBodyPart}
                    width={width * 0.65}
                    height={380}
                />
                {renderBodyLabels()}
            </View>

            {renderBodyPartModal()}
        </View>
    );

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

                <SafeAreaView edges={['top']} style={styles.safeArea}>
                    {renderHeader()}

                    <View style={[styles.mainLayout]}>
                        {/* Left-Side Floating Tools Array (PRESERVED) */}
                        <GestureDetector gesture={gestureHandler}>
                            <Animated.View style={[
                                styles.sideTabStack,
                                { backgroundColor: colors.surface, borderColor: colors.border },
                                animatedStackStyle
                            ]}>
                                {([
                                    { id: 'activity', icon: Activity },
                                    { id: 'workout', icon: Dumbbell },
                                    { id: 'health', icon: Heart },
                                ] as const).map((tab) => (
                                    <TouchableOpacity
                                        key={tab.id}
                                        onPress={() => setActiveTab(tab.id as TabType)}
                                        style={[
                                            styles.sideTabBtn,
                                            activeTab === tab.id && { backgroundColor: colors.accent }
                                        ]}
                                    >
                                        <tab.icon
                                            size={22}
                                            color={activeTab === tab.id ? (isDark ? '#000000' : '#FFFFFF') : colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                ))}

                                {/* Explicit Collapse Icon */}
                                <TouchableOpacity
                                    onPress={() => toggleStack(false)}
                                    style={[styles.collapseBtn, { borderColor: colors.border }]}
                                >
                                    <ChevronLeft size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </Animated.View>
                        </GestureDetector>

                        {/* Collapsed Reveal Button */}
                        <Animated.View style={[styles.collapsedRevealBtnContainer, animatedCollapsedButtonStyle]}>
                            <TouchableOpacity
                                onPress={() => toggleStack(true)}
                                style={[styles.collapsedRevealBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            >
                                <ChevronRight size={20} color={colors.text} />
                            </TouchableOpacity>
                        </Animated.View>

                        {/* Main Content Area */}
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.scrollContent}
                            style={{ flex: 1 }}
                        >
                            {activeTab === 'workout' && <WorkoutView />}
                            {activeTab === 'health' && <HealthView />}
                            {activeTab === 'activity' && <ActivityView />}
                        </ScrollView>
                    </View>
                </SafeAreaView>
            </View>
        </GestureHandlerRootView>
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

    // --- Header ---
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 4,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 4,
    },

    // --- Side Stack (PRESERVED) ---
    mainLayout: {
        flex: 1,
    },
    sideTabStack: {
        position: 'absolute',
        left: 16,
        top: '50%',
        marginTop: -100,
        width: 50,
        borderRadius: 25,
        paddingVertical: 12,
        alignItems: 'center',
        borderWidth: 1,
        gap: 16,
        zIndex: 10,
    },
    sideTabBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    collapseBtn: {
        width: 38,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        borderTopWidth: 1,
        paddingTop: 16,
    },
    collapsedRevealBtnContainer: {
        position: 'absolute',
        left: 0,
        top: '50%',
        marginTop: -20,
        zIndex: 11,
        paddingLeft: 4,
    },
    collapsedRevealBtn: {
        width: 24,
        height: 48,
        borderTopRightRadius: 16,
        borderBottomRightRadius: 16,
        borderWidth: 1,
        borderLeftWidth: 0,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },

    // --- Hero Recovery ---
    heroSection: {
        alignItems: 'center',
        paddingTop: 32,
        paddingBottom: 24,
    },
    heroLabel: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 2,
        marginBottom: 20,
    },
    ringContainer: {
        width: 140,
        height: 140,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ringBackground: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 6,
    },
    ringContent: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    heroNumber: {
        fontSize: 56,
        fontWeight: '200',
        letterSpacing: -2,
    },
    heroUnit: {
        fontSize: 20,
        fontWeight: '400',
        marginTop: 8,
    },
    heroStatus: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 16,
        letterSpacing: 1,
    },

    // --- Key Metrics Grid ---
    keyMetricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 24,
        gap: 12,
        marginBottom: 24,
    },
    keyMetricCard: {
        width: (width - 60) / 2,
        padding: 20,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
    },
    keyMetricLabel: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    keyMetricValue: {
        fontSize: 32,
        fontWeight: '700',
        letterSpacing: -1,
    },
    keyMetricUnit: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
    },

    // --- Stats Row ---
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        padding: 20,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    statValue: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 12,
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
        marginTop: 8,
        gap: 4,
        opacity: 0.7,
    },
    loadBar: {
        width: 6,
        borderRadius: 3,
    },

    // --- Metrics Section ---
    metricsSection: {
        paddingHorizontal: 24,
        paddingBottom: 32,
    },
    metricsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    metricCard: {
        flex: 1,
        padding: 20,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
    },
    metricCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    metricLabel: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1.5,
    },
    metricValueLarge: {
        fontSize: 32,
        fontWeight: '300',
        letterSpacing: -1,
    },
    metricValueHero: {
        fontSize: 40,
        fontWeight: '700',
        letterSpacing: -1,
    },
    metricUnit: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 6,
    },
    bmiCenter: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 8,
    },

    // --- Nutrient Card ---
    nutrientCard: {
        padding: 24,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
    },
    nutrientHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    nutrientTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    goalPill: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    goalPillText: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    macrosList: {
        gap: 16,
    },
    macroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    macroName: {
        width: 56,
        fontSize: 12,
        fontWeight: '500',
    },
    macroBar: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    macroBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    macroValue: {
        width: 44,
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'right',
    },

    // --- Body Section ---
    bodySectionHeader: {
        paddingHorizontal: 24,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    sectionSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    bodyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
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
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    labelDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
    },
    labelTitle: {
        fontSize: 11,
        fontWeight: '600',
    },
    labelNote: {
        fontSize: 9,
        maxWidth: 100,
        marginTop: 1,
    },

    // --- Modal ---
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: 'rgba(0,0,0,0.85)',
    },
    modalContent: {
        width: '100%',
        padding: 24,
        borderRadius: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
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
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 10,
    },
    noteInput: {
        padding: 16,
        height: 120,
        borderRadius: 16,
        marginBottom: 16,
        textAlignVertical: 'top',
        fontSize: 14,
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
        fontWeight: '600',
        fontSize: 15,
    },
});
