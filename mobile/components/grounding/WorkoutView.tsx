import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../context/ThemeContext';
import { Zap, Target, Clock, Flame, Plus, Play, Check, X, Users, Dumbbell, TrendingUp } from 'lucide-react-native';
import { calculateNutritionRequirements, FitnessGoal, Gender } from '../../lib/nutritionScience';

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

export default function WorkoutView() {
    const { colors, mode } = useTheme();
    const isDark = mode === 'dark';
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
    const [plans, setPlans] = useState<WorkoutPlan[]>([
        {
            id: "1",
            name: "Push/Pull/Legs",
            description: "Classic 3-day split for muscle gain",
            frequency: "3x",
            exercises: [
                { id: "1", name: "Bench Press", sets: 4, reps: "6-8", muscleGroup: "Chest", weight: 60 },
                { id: "2", name: "Incline Press", sets: 3, reps: "8-10", muscleGroup: "Chest", weight: 20 },
                { id: "3", name: "Tricep Pushdown", sets: 3, reps: "12-15", muscleGroup: "Triceps", weight: 15 },
            ]
        },
        {
            id: "2",
            name: "Full Body Blast",
            description: "High intensity circuit",
            frequency: "4x",
            exercises: [
                { id: "1", name: "Squats", sets: 4, reps: "10", muscleGroup: "Legs", weight: 80 },
                { id: "2", name: "Pull Ups", sets: 3, reps: "AMRAP", muscleGroup: "Back" },
                { id: "3", name: "Burpees", sets: 3, reps: "20", muscleGroup: "Cardio" },
            ]
        }
    ]);
    const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPlanName, setNewPlanName] = useState("");
    const [newPlanDesc, setNewPlanDesc] = useState("");

    // --- Effects ---
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

    // --- Helpers ---
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
    };

    const toggleSetComplete = (exIdx: number, setIdx: number) => {
        if (!activeSession) return;
        const updatedExercises = [...activeSession.exercises];
        const setLog = updatedExercises[exIdx].setLogs[setIdx];
        setLog.completed = !setLog.completed;

        // Calculate intensity
        const totalSets = updatedExercises.reduce((acc, ex) => acc + ex.setLogs.length, 0);
        const completedSets = updatedExercises.reduce((acc, ex) => acc + ex.setLogs.filter(s => s.completed).length, 0);

        setActiveSession({
            ...activeSession,
            exercises: updatedExercises,
            intensity: Math.round((completedSets / totalSets) * 100)
        });
    };

    const finishWorkout = () => {
        if (!activeSession) return;
        // In a real app, save to DB here
        setActiveSession(null);
    };

    // --- Renderers ---

    const renderMetricsTab = () => (
        <View className="space-y-4">
            {/* Inputs */}
            <BlurView intensity={20} tint={isDark ? "dark" : "light"} className={`p-4 rounded-2xl border ${isDark ? 'border-white/10' : 'border-black/5'}`}>
                <Text style={{ color: colors.text }} className="font-bold mb-4">Your Data</Text>
                <View className="flex-row gap-2 mb-2">
                    <TextInput
                        placeholder="Height (cm)"
                        placeholderTextColor={colors.text + '80'}
                        value={userMetrics.height.toString()}
                        onChangeText={t => setUserMetrics({ ...userMetrics, height: Number(t) || 0 })}
                        keyboardType="numeric"
                        className={`flex-1 p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                        style={{ color: colors.text }}
                    />
                    <TextInput
                        placeholder="Weight (kg)"
                        placeholderTextColor={colors.text + '80'}
                        value={userMetrics.weight.toString()}
                        onChangeText={t => setUserMetrics({ ...userMetrics, weight: Number(t) || 0 })}
                        keyboardType="numeric"
                        className={`flex-1 p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                        style={{ color: colors.text }}
                    />
                </View>
                <View className="flex-row gap-2">
                    <TextInput
                        placeholder="Age"
                        placeholderTextColor={colors.text + '80'}
                        value={userMetrics.age.toString()}
                        onChangeText={t => setUserMetrics({ ...userMetrics, age: Number(t) || 0 })}
                        keyboardType="numeric"
                        className={`flex-1 p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                        style={{ color: colors.text }}
                    />
                    <TouchableOpacity onPress={() => setUserMetrics({ ...userMetrics, gender: userMetrics.gender === 'male' ? 'female' : 'male' })} className={`flex-1 items-center justify-center rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                        <Text style={{ color: colors.text }} className="capitalize font-bold">{userMetrics.gender}</Text>
                    </TouchableOpacity>
                </View>
            </BlurView>

            {/* Goal Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                {(['maintain', 'lose_slow', 'lose_aggressive', 'bulk_lean', 'bulk_muscle'] as const).map(g => (
                    <TouchableOpacity
                        key={g}
                        onPress={() => setGoalType(g)}
                        className={`mr-2 px-4 py-2 rounded-full border ${goalType === g ? (isDark ? 'bg-white text-black' : 'bg-black text-white') : (isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10')}`}
                    >
                        <Text style={{ color: goalType === g ? (isDark ? 'black' : 'white') : colors.text }} className="capitalize text-xs font-bold">
                            {g.replace('_', ' ')}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Cards */}
            <View className="flex-row gap-4">
                <BlurView intensity={30} tint={isDark ? "dark" : "light"} className={`flex-1 p-4 rounded-2xl border ${isDark ? 'border-white/10' : 'border-black/5'}`}>
                    <Text style={{ color: colors.text }} className="opacity-60 text-xs uppercase font-bold">TDEE</Text>
                    <Text style={{ color: colors.text }} className="text-2xl font-bold">{bodyMetrics?.tdee}</Text>
                    <Text style={{ color: colors.accent }} className="text-xs">Maintenance</Text>
                </BlurView>
                <BlurView intensity={30} tint={isDark ? "dark" : "light"} className={`flex-1 p-4 rounded-2xl border ${isDark ? 'border-white/10' : 'border-black/5'}`}>
                    <Text style={{ color: colors.text }} className="opacity-60 text-xs uppercase font-bold">Goal</Text>
                    <Text style={{ color: colors.text }} className="text-2xl font-bold">{bodyMetrics?.goalCalories}</Text>
                    <Text style={{ color: colors.accent }} className="text-xs">Daily Target</Text>
                </BlurView>
            </View>

            <BlurView intensity={30} tint={isDark ? "dark" : "light"} className={`p-4 rounded-2xl border ${isDark ? 'border-white/10' : 'border-black/5'}`}>
                <Text style={{ color: colors.text }} className="font-bold mb-4">Macros ({goalType.replace('_', ' ')})</Text>
                <View className="flex-row justify-between">
                    <View className="items-center">
                        <View className="w-16 h-16 rounded-full border-4 border-purple-500/30 items-center justify-center mb-2">
                            <Text style={{ color: colors.text }} className="font-bold">{bodyMetrics?.proteinG}g</Text>
                        </View>
                        <Text style={{ color: colors.text }} className="text-xs opacity-60">Protein</Text>
                    </View>
                    <View className="items-center">
                        <View className="w-16 h-16 rounded-full border-4 border-green-500/30 items-center justify-center mb-2">
                            <Text style={{ color: colors.text }} className="font-bold">{bodyMetrics?.carbsG}g</Text>
                        </View>
                        <Text style={{ color: colors.text }} className="text-xs opacity-60">Carbs</Text>
                    </View>
                    <View className="items-center">
                        <View className="w-16 h-16 rounded-full border-4 border-orange-500/30 items-center justify-center mb-2">
                            <Text style={{ color: colors.text }} className="font-bold">{bodyMetrics?.fatsG}g</Text>
                        </View>
                        <Text style={{ color: colors.text }} className="text-xs opacity-60">Fats</Text>
                    </View>
                </View>
            </BlurView>
        </View>
    );

    const renderPlansTab = () => (
        <View className="space-y-4">
            {/* Header / Create */}
            <View className="flex-row justify-between items-center mb-2">
                <Text style={{ color: colors.text }} className="text-xl font-bold">Your Plans</Text>
                <TouchableOpacity onPress={() => setShowCreateModal(true)} className={`px-3 py-1.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/5'}`}>
                    <Plus size={16} color={colors.text} />
                </TouchableOpacity>
            </View>

            {/* Plan List */}
            {plans.map(plan => (
                <BlurView key={plan.id} intensity={30} tint={isDark ? "dark" : "light"} className={`p-4 rounded-2xl border mb-2 ${isDark ? 'border-white/10' : 'border-black/5'}`}>
                    <View className="flex-row justify-between items-start mb-2">
                        <View className="flex-1">
                            <Text style={{ color: colors.text }} className="font-bold text-lg">{plan.name}</Text>
                            <Text style={{ color: colors.text }} className="text-xs opacity-60">{plan.description}</Text>
                        </View>
                        <TouchableOpacity onPress={() => startWorkout(plan)} className="bg-green-500 px-3 py-1.5 rounded-lg flex-row items-center gap-1">
                            <Play size={12} color="white" fill="white" />
                            <Text className="text-white font-bold text-xs">Start</Text>
                        </TouchableOpacity>
                    </View>
                    <View className="flex-row gap-4 mt-2">
                        <View className="flex-row items-center gap-1">
                            <Clock size={12} color={colors.accent} />
                            <Text style={{ color: colors.text }} className="text-xs opacity-60">{plan.frequency}</Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                            <Dumbbell size={12} color={colors.accent} />
                            <Text style={{ color: colors.text }} className="text-xs opacity-60">{plan.exercises.length} Exercises</Text>
                        </View>
                    </View>
                </BlurView>
            ))}

            {activeSession && (
                <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
                    <View className="flex-1" style={{ backgroundColor: colors.background }}>
                        <View className="p-6 border-b border-white/10 flex-row justify-between items-center">
                            <View>
                                <Text style={{ color: colors.text }} className="text-2xl font-bold">{activeSession.workoutName}</Text>
                                <Text style={{ color: colors.accent }} className="font-bold">{activeSession.intensity}% Complete</Text>
                            </View>
                            <TouchableOpacity onPress={finishWorkout} className="bg-green-500 px-4 py-2 rounded-xl">
                                <Text className="text-white font-bold">Finish</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView className="flex-1 p-6">
                            {activeSession.exercises.map((ex, exIdx) => (
                                <View key={ex.exerciseId} className={`p-4 rounded-2xl mb-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                                    <Text style={{ color: colors.text }} className="font-bold text-lg mb-2">{ex.exerciseName}</Text>
                                    <View className="space-y-2">
                                        {ex.setLogs.map((set, setIdx) => (
                                            <TouchableOpacity
                                                key={setIdx}
                                                onPress={() => toggleSetComplete(exIdx, setIdx)}
                                                className={`flex-row items-center justify-between p-3 rounded-xl border ${set.completed ? 'bg-green-500/20 border-green-500/50' : (isDark ? 'bg-black/20 border-white/5' : 'bg-white border-black/5')}`}
                                            >
                                                <View className="flex-row items-center gap-3">
                                                    <View className={`w-6 h-6 rounded-md items-center justify-center border ${set.completed ? 'bg-green-500 border-green-500' : 'border-gray-500'}`}>
                                                        {set.completed && <Check size={14} color="white" />}
                                                    </View>
                                                    <Text style={{ color: colors.text }} className="font-bold">Set {set.setNumber}</Text>
                                                </View>
                                                <View className="flex-row gap-4">
                                                    <Text style={{ color: colors.text }} className="opacity-80">{set.reps} reps</Text>
                                                    <Text style={{ color: colors.text }} className="opacity-80">{set.weight} kg</Text>
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
        </View>
    );

    return (
        <View className="px-6">
            {/* Sub-tabs */}
            <View className="flex-row mb-6 bg-gray-500/10 p-1 rounded-xl">
                <TouchableOpacity onPress={() => setSubTab('plans')} className={`flex-1 py-2 items-center rounded-lg ${subTab === 'plans' ? (isDark ? 'bg-white/20' : 'bg-white shadow-sm') : ''}`}>
                    <Text style={{ color: colors.text }} className="font-bold">Plans</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSubTab('metrics')} className={`flex-1 py-2 items-center rounded-lg ${subTab === 'metrics' ? (isDark ? 'bg-white/20' : 'bg-white shadow-sm') : ''}`}>
                    <Text style={{ color: colors.text }} className="font-bold">Metrics</Text>
                </TouchableOpacity>
            </View>

            {subTab === 'metrics' ? renderMetricsTab() : renderPlansTab()}
        </View>
    );
}
