import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Clock, Plus, Play, Check, X, Dumbbell, Trash2, Download, Pause } from 'lucide-react-native';
import { calculateNutritionRequirements, FitnessGoal, Gender } from '../../lib/nutritionScience';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WorkoutImportModal from './WorkoutImportModal';
import { lockScreenService, NotificationExercise } from '../../lib/lockScreenService';
import { ParsedExercise } from '../../lib/workoutParser';

// --- Types ---
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

interface Exercise {
    id: string;
    name: string;
    sets: number;
    reps: string;
    muscleGroup: string;
    weight?: number;
    restSeconds?: number;
    restTrigger?: 'after_set' | 'after_exercise';
}

interface WorkoutPlan {
    id: string;
    name: string;
    description: string;
    frequency: string;
    exercises: Exercise[];
}

interface SetLog {
    setNumber: number;
    reps: number;
    weight?: number;
    completed: boolean;
    rpe?: number;
    completedAt?: number; // timestamp when set was completed
    duration?: number; // seconds taken for this set
}

interface ExerciseLog {
    exerciseId: string;
    exerciseName: string;
    muscleGroup: string;
    setLogs: SetLog[];
}

interface WorkoutSession {
    id: string;
    date: string;
    workoutName: string;
    exercises: ExerciseLog[];
    duration: number;
    completed: boolean;
    intensity: number;
}

const STORAGE_KEYS = {
    WORKOUT_PLANS: 'wrex_workout_plans',
    WORKOUT_SESSIONS: 'wrex_workout_sessions',
    USER_METRICS: 'wrex_user_metrics',
    GOAL_TYPE: 'wrex_goal_type',
};

export default function WorkoutView() {
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

    const [subTab, setSubTab] = useState<'metrics' | 'plans'>('plans');

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

    // --- Plans State ---
    const [plans, setPlans] = useState<WorkoutPlan[]>([]);
    const [sessions, setSessions] = useState<WorkoutSession[]>([]);
    const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
    const [viewSession, setViewSession] = useState<WorkoutSession | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPlanName, setNewPlanName] = useState("");
    const [newPlanDesc, setNewPlanDesc] = useState("");
    const [newPlanFreq, setNewPlanFreq] = useState("3x");
    const [newExercises, setNewExercises] = useState<Exercise[]>([]);
    const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

    // Import Modal State
    const [showImportModal, setShowImportModal] = useState(false);

    // --- Timer State ---
    const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0); // seconds
    const [isPaused, setIsPaused] = useState(false);
    const [restTimer, setRestTimer] = useState(0); // remaining rest seconds
    const [isResting, setIsResting] = useState(false);
    const [setStartTime, setSetStartTime] = useState<number | null>(null);
    const REST_DURATION = 90; // default rest time in seconds

    // Elapsed time timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (activeSession && workoutStartTime && !isPaused) {
            interval = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - workoutStartTime) / 1000));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [activeSession, workoutStartTime, isPaused]);

    // Rest timer countdown
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isResting && restTimer > 0 && !isPaused) {
            interval = setInterval(() => {
                setRestTimer(prev => {
                    if (prev <= 1) {
                        setIsResting(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isResting, restTimer, isPaused]);

    // Format time helper
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Sync Lock Screen Service with React State
    useEffect(() => {
        if (activeSession) {
            const notificationData: NotificationExercise[] = activeSession.exercises.map(ex => ({
                name: ex.exerciseName,
                sets: ex.setLogs.map(s => ({
                    setNumber: s.setNumber,
                    completed: s.completed,
                    reps: s.reps,
                    weight: s.weight
                }))
            }));

            lockScreenService.updateProgress(
                activeSession.workoutName,
                notificationData,
                formatTime(restTimer),
                isResting
            );
        }
    }, [activeSession, restTimer, isResting]);

    // Initialize Lock Screen Service and Listeners
    useEffect(() => {
        lockScreenService.setup();
    }, []);

    // Listen for background updates
    useEffect(() => {
        const unsubscribe = lockScreenService.addUpdateListener((exName, setNum) => {
            if (exName === "SKIP_REST") {
                setIsResting(false);
                setRestTimer(0);
                return;
            }

            if (activeSession) {
                const exIdx = activeSession.exercises.findIndex(e => e.exerciseName === exName);
                if (exIdx !== -1) {
                    const setIdx = activeSession.exercises[exIdx].setLogs.findIndex(s => s.setNumber === setNum);
                    if (setIdx !== -1) {
                        // Only toggle if not already completed? Or just toggle?
                        // User said "unless they were ticked already".
                        // If widget sends "mark_set", it usually means "mark as done".
                        // If already done, ignore? Or toggle off?
                        // "mark those boxes... once i click it should save that set as done".
                        // If I click again, unmark?
                        // For now, toggle is standard.
                        toggleSetComplete(exIdx, setIdx);
                    }
                }
            }
        });
        return unsubscribe;
    }, [activeSession]);

    // Load data on mount
    useEffect(() => {
        loadStoredData();
    }, []);

    const loadStoredData = async () => {
        try {
            const [storedPlans, storedSessions, storedMetrics, storedGoal] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.WORKOUT_PLANS),
                AsyncStorage.getItem(STORAGE_KEYS.WORKOUT_SESSIONS),
                AsyncStorage.getItem(STORAGE_KEYS.USER_METRICS),
                AsyncStorage.getItem(STORAGE_KEYS.GOAL_TYPE),
            ]);

            if (storedPlans) setPlans(JSON.parse(storedPlans));
            if (storedSessions) setSessions(JSON.parse(storedSessions));
            if (storedMetrics) setUserMetrics(JSON.parse(storedMetrics));
            if (storedGoal) setGoalType(storedGoal as FitnessGoal);
        } catch (error) {
            console.error('Error loading workout data:', error);
        }
    };

    // Save plans when changed
    useEffect(() => {
        if (plans.length > 0) {
            AsyncStorage.setItem(STORAGE_KEYS.WORKOUT_PLANS, JSON.stringify(plans));
        }
    }, [plans]);

    // Save sessions when changed
    useEffect(() => {
        if (sessions.length > 0) {
            AsyncStorage.setItem(STORAGE_KEYS.WORKOUT_SESSIONS, JSON.stringify(sessions));
        }
    }, [sessions]);

    // Calculate metrics
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

    // Save user metrics
    useEffect(() => {
        AsyncStorage.setItem(STORAGE_KEYS.USER_METRICS, JSON.stringify(userMetrics));
    }, [userMetrics]);

    useEffect(() => {
        AsyncStorage.setItem(STORAGE_KEYS.GOAL_TYPE, goalType);
    }, [goalType]);

    // --- Helpers ---
    const addExerciseToNewPlan = () => {
        const exercise: Exercise = {
            id: Date.now().toString(),
            name: "New Exercise",
            sets: 3,
            reps: "10",
            muscleGroup: "Other",
        };
        setNewExercises([...newExercises, exercise]);
    };

    const updateNewExercise = (id: string, field: keyof Exercise, value: any) => {
        setNewExercises(newExercises.map(ex =>
            ex.id === id ? { ...ex, [field]: value } : ex
        ));
    };

    const createPlan = async () => {
        if (!newPlanName.trim()) return;

        const plan: WorkoutPlan = {
            id: editingPlanId || Date.now().toString(),
            name: newPlanName,
            description: newPlanDesc || "Custom workout plan",
            frequency: newPlanFreq,
            exercises: newExercises.length > 0 ? newExercises : [
                { id: "1", name: "Exercise 1", sets: 3, reps: "10", muscleGroup: "Other", restSeconds: 90, restTrigger: 'after_set' }
            ],
        };

        if (editingPlanId) {
            setPlans(plans.map(p => p.id === editingPlanId ? plan : p));
        } else {
            setPlans([...plans, plan]);
        }

        setShowCreateModal(false);
        setNewPlanName("");
        setNewPlanDesc("");
        setNewPlanFreq("3x");
        setNewExercises([]);
        setEditingPlanId(null);
    };

    const openEditModal = (plan: WorkoutPlan) => {
        setEditingPlanId(plan.id);
        setNewPlanName(plan.name);
        setNewPlanDesc(plan.description);
        setNewPlanFreq(plan.frequency);
        setNewExercises(plan.exercises);
        setShowCreateModal(true);
    };

    const deletePlan = async (planId: string) => {
        const updated = plans.filter(p => p.id !== planId);
        setPlans(updated);
        if (updated.length === 0) {
            await AsyncStorage.removeItem(STORAGE_KEYS.WORKOUT_PLANS);
        }
    };

    const startWorkout = (plan: WorkoutPlan) => {
        const session: WorkoutSession = {
            id: `session-${Date.now()}`,
            date: new Date().toISOString(),
            workoutName: plan.name,
            exercises: plan.exercises.map(ex => ({
                exerciseId: ex.id,
                exerciseName: ex.name,
                muscleGroup: ex.muscleGroup,
                setLogs: Array.from({ length: ex.sets }, (_, i) => ({
                    setNumber: i + 1,
                    reps: parseInt(ex.reps.split("-")[0]) || 0,
                    weight: ex.weight,
                    completed: false
                }))
            })),
            duration: 0,
            completed: false,
            intensity: 0
        };
        setActiveSession(session);

        // Initialize timers
        setWorkoutStartTime(Date.now());
        setElapsedTime(0);
        setIsPaused(false);
        setIsResting(false);
        setRestTimer(0);
        setSetStartTime(Date.now()); // Ready for first set

        const notificationData: NotificationExercise[] = session.exercises.map(ex => ({
            name: ex.exerciseName,
            sets: ex.setLogs.map(s => ({
                setNumber: s.setNumber,
                completed: s.completed,
                reps: s.reps,
                weight: s.weight
            }))
        }));

        lockScreenService.startTracking(plan.name, notificationData);
    };


    // We need to move the logic OUT of the functional setter to trigger the side effect (notification).
    // Let's create a robust handler.

    const toggleSetComplete = (exIdx: number, setIdx: number) => {
        setActiveSession(current => {
            if (!current) return null;

            const updatedExercises = current.exercises.map((ex, i) => {
                if (i !== exIdx) return ex;
                return {
                    ...ex,
                    setLogs: ex.setLogs.map((s, j) => {
                        if (j !== setIdx) return s;
                        const wasCompleted = s.completed;
                        const nowCompleted = !wasCompleted;

                        // Calculate duration if completing (not uncompleting)
                        let duration = s.duration;
                        let completedAt = s.completedAt;
                        if (nowCompleted && setStartTime) {
                            duration = Math.floor((Date.now() - setStartTime) / 1000);
                            completedAt = Date.now();
                        }

                        return { ...s, completed: nowCompleted, duration, completedAt };
                    })
                };
            });

            const totalSets = updatedExercises.reduce((acc, ex) => acc + ex.setLogs.length, 0);
            const completedSets = updatedExercises.reduce((acc, ex) => acc + ex.setLogs.filter(s => s.completed).length, 0);

            const newSession = {
                ...current,
                exercises: updatedExercises,
                intensity: Math.round((completedSets / totalSets) * 100)
            };

            // Notification update handled by useEffect
            // lockScreenService.updateProgress(newSession.workoutName, notificationData);

            return newSession;
        });

        // Check rest trigger
        // Look up rest configuration from the original plan
        let restSeconds = 90;
        let restTrigger = 'after_set';

        if (activeSession) {
            // Try to find the matching plan and exercise config
            const currentExerciseName = activeSession.exercises[exIdx].exerciseName;
            const plan = plans.find(p => p.name === activeSession.workoutName);
            if (plan) {
                const planEx = plan.exercises.find(e => e.name === currentExerciseName);
                if (planEx) {
                    if (planEx.restSeconds !== undefined) restSeconds = planEx.restSeconds;
                    if (planEx.restTrigger) restTrigger = planEx.restTrigger;
                }
            }
        }

        // Trigger rest based on configuration
        const isExerciseComplete = false; // logic would need to check if all sets are done
        // For now, we rest after every set if configured 'after_set'
        // 'after_exercise' logic would ideally check if setIdx === totalSets - 1

        // We can infer if it's the last set from activeSession (old state)
        // activeSession.exercises[exIdx].setLogs.length
        const isLastSet = activeSession && setIdx === activeSession.exercises[exIdx].setLogs.length - 1;

        if (restTrigger === 'after_set') {
            setIsResting(true);
            setRestTimer(restSeconds);
            setSetStartTime(Date.now());
        } else if (restTrigger === 'after_exercise' && isLastSet) {
            setIsResting(true);
            setRestTimer(restSeconds);
            setSetStartTime(Date.now());
        }
    };

    const finishWorkout = async () => {
        if (!activeSession) return;
        const completedSession = { ...activeSession, completed: true };
        const updatedSessions = [...sessions, completedSession];
        setSessions(updatedSessions);
        setActiveSession(null);
        lockScreenService.stopTracking();
    };

    const handleImport = (importedExercises: ParsedExercise[]) => {
        const exercises: Exercise[] = importedExercises.map((ex, i) => ({
            id: Date.now().toString() + i,
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            muscleGroup: ex.muscleGroup,
            weight: ex.weight
        }));

        const newPlan: WorkoutPlan = {
            id: Date.now().toString(),
            name: `Imported Workout ${new Date().toLocaleDateString()}`,
            description: "Imported from file/text",
            frequency: "Custom",
            exercises
        };

        setPlans([...plans, newPlan]);
    };

    // --- Renderers ---

    const renderMetricsTab = () => (
        <View style={styles.tabContent}>
            {/* Inputs */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Your Data</Text>
                <View style={styles.inputRow}>
                    <TextInput
                        placeholder="Height (cm)"
                        placeholderTextColor={colors.textSecondary}
                        value={userMetrics.height.toString()}
                        onChangeText={t => setUserMetrics({ ...userMetrics, height: Number(t) || 0 })}
                        keyboardType="numeric"
                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    />
                    <TextInput
                        placeholder="Weight (kg)"
                        placeholderTextColor={colors.textSecondary}
                        value={userMetrics.weight.toString()}
                        onChangeText={t => setUserMetrics({ ...userMetrics, weight: Number(t) || 0 })}
                        keyboardType="numeric"
                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    />
                </View>
                <View style={styles.inputRow}>
                    <TextInput
                        placeholder="Age"
                        placeholderTextColor={colors.textSecondary}
                        value={userMetrics.age.toString()}
                        onChangeText={t => setUserMetrics({ ...userMetrics, age: Number(t) || 0 })}
                        keyboardType="numeric"
                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    />
                    <TouchableOpacity
                        onPress={() => setUserMetrics({ ...userMetrics, gender: userMetrics.gender === 'male' ? 'female' : 'male' })}
                        style={[styles.genderButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                    >
                        <Text style={[styles.genderText, { color: colors.text }]}>{userMetrics.gender.toUpperCase()}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Goal Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.goalScroll}>
                {(['maintain', 'lose_slow', 'lose_aggressive', 'bulk_lean', 'bulk_muscle'] as const).map(g => (
                    <TouchableOpacity
                        key={g}
                        onPress={() => setGoalType(g)}
                        style={[
                            styles.goalButton,
                            { borderColor: colors.border },
                            goalType === g && { backgroundColor: colors.accent }
                        ]}
                    >
                        <Text style={[
                            styles.goalText,
                            { color: goalType === g ? (isDark ? '#000' : '#FFF') : colors.text }
                        ]}>
                            {g.replace('_', ' ').toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Cards */}
            <View style={styles.metricsRow}>
                <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>TDEE</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]}>{bodyMetrics?.tdee}</Text>
                    <Text style={[styles.metricSubtext, { color: colors.textSecondary }]}>Maintenance</Text>
                </View>
                <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>GOAL</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]}>{bodyMetrics?.goalCalories}</Text>
                    <Text style={[styles.metricSubtext, { color: colors.textSecondary }]}>Daily Target</Text>
                </View>
            </View>

            <View style={[styles.macrosCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Macros ({goalType.replace('_', ' ')})</Text>
                <View style={styles.macrosRow}>
                    <View style={styles.macroItem}>
                        <View style={[styles.macroCircle, { borderColor: colors.border }]}>
                            <Text style={[styles.macroValue, { color: colors.text }]}>{bodyMetrics?.proteinG}g</Text>
                        </View>
                        <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Protein</Text>
                    </View>
                    <View style={styles.macroItem}>
                        <View style={[styles.macroCircle, { borderColor: colors.border }]}>
                            <Text style={[styles.macroValue, { color: colors.text }]}>{bodyMetrics?.carbsG}g</Text>
                        </View>
                        <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Carbs</Text>
                    </View>
                    <View style={styles.macroItem}>
                        <View style={[styles.macroCircle, { borderColor: colors.border }]}>
                            <Text style={[styles.macroValue, { color: colors.text }]}>{bodyMetrics?.fatsG}g</Text>
                        </View>
                        <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Fats</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderPlansTab = () => (
        <View style={styles.tabContent}>
            {/* Header */}
            <View style={styles.plansHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Plans</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={() => setShowImportModal(true)} style={[styles.addButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Download size={16} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowCreateModal(true)} style={[styles.addButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Plus size={16} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {plans.length === 0 && (
                <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Dumbbell size={32} color={colors.textSecondary} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No workout plans yet</Text>
                    <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Create your first plan to get started</Text>
                </View>
            )}

            {/* Plan List */}
            {plans.map(plan => (
                <View key={plan.id} style={[styles.planCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.planHeader}>
                        <View style={styles.planInfo}>
                            <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
                            <Text style={[styles.planDesc, { color: colors.textSecondary }]}>{plan.description}</Text>
                        </View>
                        <View style={styles.planActions}>
                            <TouchableOpacity onPress={() => startWorkout(plan)} style={[styles.startButton, { backgroundColor: colors.accent }]}>
                                <Play size={12} color={isDark ? '#000' : '#FFF'} />
                                <Text style={[styles.startText, { color: isDark ? '#000' : '#FFF' }]}>Start</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => openEditModal(plan)} style={[styles.editButton, { borderColor: colors.border }]}>
                                <Text style={{ fontSize: 16 }}>✏️</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => deletePlan(plan.id)} style={styles.deleteButton}>
                                <Trash2 size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.planMeta}>
                        <View style={styles.metaItem}>
                            <Clock size={12} color={colors.textSecondary} />
                            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{plan.frequency}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Dumbbell size={12} color={colors.textSecondary} />
                            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{plan.exercises.length} Exercises</Text>
                        </View>
                    </View>
                </View>
            ))}

            {/* Recent Sessions */}
            {sessions.length > 0 && (
                <View style={styles.sessionsSection}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Sessions</Text>
                    {sessions.slice(-3).reverse().map(session => (
                        <TouchableOpacity
                            key={session.id}
                            onPress={() => setViewSession(session)}
                            style={[styles.sessionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        >
                            <Text style={[styles.sessionName, { color: colors.text }]}>{session.workoutName}</Text>
                            <Text style={[styles.sessionDate, { color: colors.textSecondary }]}>
                                {new Date(session.date).toLocaleDateString()} - {session.intensity}% completed
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Active Session Modal */}
            {activeSession && (
                <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
                    <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                        {/* Rest Timer Overlay */}
                        {isResting && (
                            <View style={styles.restOverlay}>
                                <View style={[styles.restCard, { backgroundColor: colors.surface }]}>
                                    <Text style={[styles.restLabel, { color: colors.textSecondary }]}>REST</Text>
                                    <Text style={[styles.restTime, { color: colors.text }]}>{formatTime(restTimer)}</Text>
                                    <TouchableOpacity
                                        onPress={() => { setIsResting(false); setRestTimer(0); }}
                                        style={[styles.skipRestButton, { borderColor: colors.border }]}
                                    >
                                        <Text style={{ color: colors.text }}>Skip Rest</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Header with Timer */}
                        <View style={[styles.sessionHeader, { borderBottomColor: colors.border }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.sessionTitle, { color: colors.text }]}>{activeSession.workoutName}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Clock size={14} color={colors.textSecondary} />
                                        <Text style={[styles.timerText, { color: colors.text }]}>{formatTime(elapsedTime)}</Text>
                                    </View>
                                    <Text style={[styles.sessionProgress, { color: colors.textSecondary }]}>{activeSession.intensity}%</Text>
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity
                                    onPress={() => setIsPaused(!isPaused)}
                                    style={[styles.pauseButton, { backgroundColor: isPaused ? '#D2042D' : colors.surface, borderColor: colors.border }]}
                                >
                                    {isPaused ? <Play size={18} color={colors.text} /> : <Pause size={18} color={colors.text} />}
                                </TouchableOpacity>
                                <TouchableOpacity onPress={finishWorkout} style={[styles.finishButton, { backgroundColor: colors.accent }]}>
                                    <Text style={[styles.finishText, { color: isDark ? '#000' : '#FFF' }]}>Finish</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <ScrollView style={styles.sessionScroll}>
                            {activeSession.exercises.map((ex, exIdx) => (
                                <View key={ex.exerciseId} style={[styles.exerciseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <Text style={[styles.exerciseName, { color: colors.text }]}>{ex.exerciseName}</Text>
                                    <View style={styles.setsContainer}>
                                        {ex.setLogs.map((set, setIdx) => (
                                            <TouchableOpacity
                                                key={setIdx}
                                                onPress={() => toggleSetComplete(exIdx, setIdx)}
                                                style={[
                                                    styles.setRow,
                                                    { borderColor: colors.border },
                                                    set.completed && { backgroundColor: isDark ? '#3E0A10' : '#FDEDEE' }
                                                ]}
                                            >
                                                <View style={styles.setLeft}>
                                                    <View style={[
                                                        styles.checkbox,
                                                        { borderColor: colors.border },
                                                        set.completed && { backgroundColor: '#D2042D', borderColor: '#D2042D' }
                                                    ]}>
                                                        {set.completed && <Check size={14} color="#FFF" />}
                                                    </View>
                                                    <Text style={[styles.setText, { color: colors.text }]}>Set {set.setNumber}</Text>
                                                </View>
                                                <View style={styles.setRight}>
                                                    <Text style={[styles.setInfo, { color: colors.textSecondary }]}>{set.reps} reps</Text>
                                                    {!!set.weight && <Text style={[styles.setInfo, { color: colors.textSecondary }]}>{set.weight} kg</Text>}
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </Modal>
            )}

            {/* Create Plan Modal */}
            <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet">
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>New Workout Plan</Text>
                        <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                            <X size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalScroll}>
                        <TextInput
                            placeholder="Plan Name"
                            placeholderTextColor={colors.textSecondary}
                            value={newPlanName}
                            onChangeText={setNewPlanName}
                            style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                        />
                        <TextInput
                            placeholder="Description"
                            placeholderTextColor={colors.textSecondary}
                            value={newPlanDesc}
                            onChangeText={setNewPlanDesc}
                            style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                        />
                        <TextInput
                            placeholder="Frequency (e.g. 3x/week)"
                            placeholderTextColor={colors.textSecondary}
                            value={newPlanFreq}
                            onChangeText={setNewPlanFreq}
                            style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                        />

                        <View style={styles.exercisesHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Exercises</Text>
                            <TouchableOpacity onPress={addExerciseToNewPlan} style={[styles.addButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Plus size={16} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {newExercises.map((ex, idx) => (
                            <View key={ex.id} style={[styles.exerciseInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <TextInput
                                    placeholder="Exercise Name"
                                    placeholderTextColor={colors.textSecondary}
                                    value={ex.name}
                                    onChangeText={v => updateNewExercise(ex.id, 'name', v)}
                                    style={[styles.exInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                />
                                <View style={styles.exRow}>
                                    <TextInput
                                        placeholder="Sets"
                                        placeholderTextColor={colors.textSecondary}
                                        value={ex.sets.toString()}
                                        onChangeText={v => updateNewExercise(ex.id, 'sets', parseInt(v) || 0)}
                                        keyboardType="numeric"
                                        style={[styles.exInputSmall, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                    />
                                    <TextInput
                                        placeholder="Reps"
                                        placeholderTextColor={colors.textSecondary}
                                        value={ex.reps}
                                        onChangeText={v => updateNewExercise(ex.id, 'reps', v)}
                                        style={[styles.exInputSmall, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                    />
                                    <TextInput
                                        placeholder="Muscle"
                                        placeholderTextColor={colors.textSecondary}
                                        value={ex.muscleGroup}
                                        onChangeText={v => updateNewExercise(ex.id, 'muscleGroup', v)}
                                        style={[styles.exInputSmall, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                                    />
                                </View>
                                <View style={[styles.exRow, { marginTop: 8 }]}>
                                    <TextInput
                                        placeholder="Rest (s)"
                                        placeholderTextColor={colors.textSecondary}
                                        value={(ex.restSeconds || '90').toString()}
                                        onChangeText={v => updateNewExercise(ex.id, 'restSeconds', parseInt(v) || 0)}
                                        keyboardType="numeric"
                                        style={[styles.exInputSmall, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, flex: 0.5 }]}
                                    />
                                    <TouchableOpacity
                                        onPress={() => updateNewExercise(ex.id, 'restTrigger', ex.restTrigger === 'after_exercise' ? 'after_set' : 'after_exercise')}
                                        style={[styles.exInputSmall, { backgroundColor: colors.background, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}
                                    >
                                        <Text style={{ color: colors.text, fontSize: 12 }}>
                                            {ex.restTrigger === 'after_exercise' ? 'After Exercise' : 'After Set'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setNewExercises(newExercises.filter(e => e.id !== ex.id))} style={styles.deleteIcon}>
                                        <Trash2 size={16} color="red" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}

                        <TouchableOpacity onPress={createPlan} style={[styles.createButton, { backgroundColor: colors.accent }]}>
                            <Text style={[styles.createText, { color: isDark ? '#000' : '#FFF' }]}>Create Plan</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>

            {/* Session Analytics Modal */}
            {viewSession && (
                <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
                    <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Session Details</Text>
                            <TouchableOpacity onPress={() => setViewSession(null)}>
                                <X size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalScroll}>
                            {/* Summary Stats */}
                            <View style={styles.metricsRow}>
                                <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1 }]}>
                                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>DURATION</Text>
                                    <Text style={[styles.metricValue, { color: colors.text }]}>{formatTime(viewSession.duration || 0)}</Text>
                                </View>
                                <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1 }]}>
                                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>INTENSITY</Text>
                                    <Text style={[styles.metricValue, { color: colors.text }]}>{viewSession.intensity}%</Text>
                                </View>
                            </View>

                            <View style={{ marginTop: 24 }}>
                                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Exercise Breakdown</Text>
                                {viewSession.exercises.map(ex => {
                                    const completedSets = ex.setLogs.filter(s => s.completed).length;
                                    const bestSet = ex.setLogs.reduce((best, current) => {
                                        if (!current.completed) return best;
                                        if (!best || (current.weight || 0) > (best.weight || 0)) return current;
                                        return best;
                                    }, null as SetLog | null);

                                    return (
                                        <View key={ex.exerciseId} style={[styles.exerciseCard, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 12 }]}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={[styles.exerciseName, { color: colors.text }]}>{ex.exerciseName}</Text>
                                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{completedSets}/{ex.setLogs.length} sets</Text>
                                            </View>
                                            {bestSet && (
                                                <View style={{ marginTop: 8, padding: 8, backgroundColor: colors.background, borderRadius: 8 }}>
                                                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Best Set: {bestSet.weight}kg x {bestSet.reps}</Text>
                                                </View>
                                            )}
                                            <View style={{ marginTop: 8 }}>
                                                {ex.setLogs.map((log, i) => (
                                                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                                                        <Text style={{ color: log.completed ? colors.text : colors.textSecondary, fontSize: 12 }}>
                                                            Set {log.setNumber}: {log.reps} reps {log.weight ? `@ ${log.weight}kg` : ''}
                                                        </Text>
                                                        {log.duration && <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{log.duration}s</Text>}
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    )
                                })}
                            </View>
                        </ScrollView>
                    </View>
                </Modal>
            )}

            <WorkoutImportModal
                visible={showImportModal}
                onClose={() => setShowImportModal(false)}
                onSave={handleImport}
            />
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Sub-tabs */}
            <View style={[styles.subTabs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TouchableOpacity
                    onPress={() => setSubTab('plans')}
                    style={[styles.subTab, subTab === 'plans' && { backgroundColor: colors.accent }]}
                >
                    <Text style={[styles.subTabText, { color: subTab === 'plans' ? (isDark ? '#000' : '#FFF') : colors.text }]}>Plans</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setSubTab('metrics')}
                    style={[styles.subTab, subTab === 'metrics' && { backgroundColor: colors.accent }]}
                >
                    <Text style={[styles.subTabText, { color: subTab === 'metrics' ? (isDark ? '#000' : '#FFF') : colors.text }]}>Metrics</Text>
                </TouchableOpacity>
            </View>

            {subTab === 'metrics' ? renderMetricsTab() : renderPlansTab()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 24,
    },
    subTabs: {
        flexDirection: 'row',
        padding: 4,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
    },
    subTab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    subTabText: {
        fontWeight: '700',
    },
    tabContent: {
        gap: 16,
    },
    card: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    cardTitle: {
        fontWeight: '700',
        marginBottom: 16,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    input: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    genderButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: 1,
    },
    genderText: {
        fontWeight: '700',
    },
    goalScroll: {
        marginBottom: 8,
    },
    goalButton: {
        marginRight: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
    },
    goalText: {
        fontSize: 10,
        fontWeight: '700',
    },
    metricsRow: {
        flexDirection: 'row',
        gap: 16,
    },
    metricCard: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    metricLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    metricValue: {
        fontSize: 24,
        fontWeight: '700',
    },
    metricSubtext: {
        fontSize: 11,
    },
    macrosCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    macrosRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    macroItem: {
        alignItems: 'center',
    },
    macroCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 4,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    macroValue: {
        fontWeight: '700',
    },
    macroLabel: {
        fontSize: 11,
    },
    plansHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    addButton: {
        padding: 8,
        borderRadius: 16,
        borderWidth: 1,
    },
    emptyState: {
        padding: 32,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        gap: 8,
    },
    emptyText: {
        fontWeight: '600',
    },
    emptySubtext: {
        fontSize: 12,
    },
    planCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
    },
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    planInfo: {
        flex: 1,
    },
    planName: {
        fontWeight: '700',
        fontSize: 16,
    },
    planDesc: {
        fontSize: 12,
    },
    planActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    startText: {
        fontWeight: '700',
        fontSize: 12,
    },
    deleteButton: {
        padding: 4,
    },
    planMeta: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 8,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 11,
    },
    sessionsSection: {
        marginTop: 24,
    },
    sessionCard: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 8,
    },
    sessionName: {
        fontWeight: '600',
    },
    sessionDate: {
        fontSize: 11,
    },
    modalContainer: {
        flex: 1,
        paddingTop: 48, // Fix for safe area
    },
    sessionHeader: {
        padding: 24,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sessionTitle: {
        fontSize: 24,
        fontWeight: '700',
    },
    sessionProgress: {
        fontWeight: '600',
    },
    finishButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    finishText: {
        fontWeight: '700',
    },
    sessionScroll: {
        flex: 1,
        padding: 24,
    },
    exerciseCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    exerciseName: {
        fontWeight: '700',
        fontSize: 16,
        marginBottom: 12,
    },
    setsContainer: {
        gap: 8,
    },
    setRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    setLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    setText: {
        fontWeight: '600',
    },
    setRight: {
        flexDirection: 'row',
        gap: 16,
    },
    setInfo: {},
    modalHeader: {
        padding: 24,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    modalScroll: {
        flex: 1,
        padding: 24,
    },
    modalInput: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    exercisesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 12,
    },
    exerciseInput: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    exInput: {
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 8,
    },
    exRow: {
        flexDirection: 'row',
        gap: 8,
    },
    exInputSmall: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
    },
    createButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 24,
    },
    createText: {
        fontWeight: '700',
    },
    // Timer UI Styles
    restOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    restCard: {
        padding: 32,
        borderRadius: 24,
        alignItems: 'center',
        minWidth: 200,
    },
    restLabel: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 2,
        marginBottom: 8,
    },
    restTime: {
        fontSize: 64,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    skipRestButton: {
        marginTop: 24,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    timerText: {
        fontSize: 16,
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
    },
    pauseButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    setDuration: {
        fontSize: 11,
        marginLeft: 8,
    },
    editButton: {
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteIcon: {
        marginLeft: 8,
        justifyContent: 'center',
        padding: 4,
    },
});
