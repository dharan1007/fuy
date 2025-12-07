import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, StatusBar, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, X, Save, Zap, Droplets } from 'lucide-react-native';
import HumanBody3D from '../components/HumanBody3D';
import { useTheme } from '../context/ThemeContext';
import WorkoutView from '../components/grounding/WorkoutView';
import HealthView from '../components/grounding/HealthView';
import ActivityView from '../components/grounding/ActivityView';
import { calculateNutritionRequirements, FitnessGoal, Gender } from '../lib/nutritionScience';

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

export default function GroundingScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    // Force dark mode for this specific UI as per reference, or adapt carefully
    const isDark = mode === 'dark';

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
        setBodyPartNote(bodyNotes[partName] || ""); // Load existing note
    };

    const saveBodyNote = () => {
        if (selectedBodyPart) {
            setBodyNotes({ ...bodyNotes, [selectedBodyPart]: bodyPartNote });
            setSelectedBodyPart(null);
        }
    };

    // --- Render Functions ---

    const renderHeader = () => (
        <View className="flex-row justify-between items-center px-6 pt-2 pb-4 z-10">
            <TouchableOpacity onPress={() => router.back()} className={`w-10 h-10 rounded-full items-center justify-center backdrop-blur-md ${isDark ? 'bg-white/10' : 'bg-black/5'}`}>
                <ChevronLeft color={colors.text} size={24} />
            </TouchableOpacity>
            <Text style={{ color: colors.text }} className="text-lg font-bold tracking-widest uppercase opacity-80">WREX Body</Text>
            <TouchableOpacity onPress={() => setShowMetricsModal(true)} className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-white/10' : 'bg-black/5'}`}>
                <Plus color={colors.text} size={20} />
            </TouchableOpacity>
        </View>
    );

    const renderTabs = () => (
        <View className="flex-row justify-around px-6 mb-4">
            {(['dashboard', 'workout', 'health', 'activity'] as TabType[]).map((tab) => (
                <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-full ${activeTab === tab ? (isDark ? 'bg-white/20' : 'bg-black/10') : ''}`}
                >
                    <Text style={{ color: activeTab === tab ? colors.accent : colors.text, opacity: activeTab === tab ? 1 : 0.5 }} className="font-bold capitalize text-xs">
                        {tab}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderDetailedMetrics = () => (
        <View className="px-6 pb-20">
            <View className="flex-row gap-4 mb-4">
                {/* BMR Card */}
                <BlurView intensity={20} tint={isDark ? "dark" : "light"} className={`flex-1 p-5 rounded-3xl overflow-hidden border ${isDark ? 'border-white/10' : 'border-black/5'}`}>
                    <View className="flex-row justify-between items-start mb-2">
                        <Text style={{ color: colors.text }} className="opacity-60 text-xs font-bold uppercase tracking-wider">BMR</Text>
                        <Zap size={14} color={colors.accent} />
                    </View>
                    <Text style={{ color: colors.text }} className="text-3xl font-light">{bodyMetrics?.bmr || 0}</Text>
                    <Text style={{ color: colors.text }} className="opacity-40 text-xs mt-1">Kcal / Day</Text>
                </BlurView>

                {/* BMI Card */}
                <BlurView intensity={20} tint={isDark ? "dark" : "light"} className={`flex-1 p-5 rounded-3xl overflow-hidden border relative ${isDark ? 'border-white/10' : 'border-black/5'}`}>
                    <View className="absolute top-0 right-0 p-4">
                        <Text className="text-xs opacity-40" style={{ color: colors.text }}>BMI</Text>
                    </View>
                    <View className="items-center justify-center my-2">
                        <Text style={{ color: colors.text }} className="font-bold text-3xl">{bodyMetrics?.bmi || 0}</Text>
                    </View>
                    <Text style={{ color: colors.text }} className="text-center opacity-60 text-xs mt-1">Normal Range</Text>
                </BlurView>
            </View>

            {/* Macros Row */}
            <BlurView intensity={20} tint={isDark ? "dark" : "light"} className={`p-5 rounded-3xl border mb-4 ${isDark ? 'border-white/10' : 'border-black/5'}`}>
                <View className="flex-row justify-between items-center mb-4">
                    <Text style={{ color: colors.text }} className="font-bold opacity-80">Nutrient Breakdown</Text>
                    <Text style={{ color: colors.accent }} className="text-xs capitalize">{goalType.replace('_', ' ')}</Text>
                </View>
                <View className="flex-row justify-between items-center">
                    <View className="items-center">
                        <View className="w-12 h-12 rounded-full border-4 border-purple-500/30 items-center justify-center mb-2">
                            <Text style={{ color: colors.text }} className="text-xs font-bold">{bodyMetrics?.proteinG}</Text>
                        </View>
                        <Text style={{ color: colors.text }} className="opacity-40 text-[10px] uppercase">Protein</Text>
                    </View>
                    <View className="items-center">
                        <View className="w-12 h-12 rounded-full border-4 border-green-500/30 items-center justify-center mb-2">
                            <Text style={{ color: colors.text }} className="text-xs font-bold">{bodyMetrics?.carbsG}</Text>
                        </View>
                        <Text style={{ color: colors.text }} className="opacity-40 text-[10px] uppercase">Carbs</Text>
                    </View>
                    <View className="items-center">
                        <View className="w-12 h-12 rounded-full border-4 border-orange-500/30 items-center justify-center mb-2">
                            <Text style={{ color: colors.text }} className="text-xs font-bold">{bodyMetrics?.fatsG}</Text>
                        </View>
                        <Text style={{ color: colors.text }} className="opacity-40 text-[10px] uppercase">Fats</Text>
                    </View>
                    <View className="items-center">
                        <View className="w-12 h-12 rounded-full border-4 border-cyan-500/30 items-center justify-center mb-2">
                            <Droplets size={16} color="cyan" />
                        </View>
                        <Text style={{ color: colors.text }} className="opacity-40 text-[10px] uppercase">H2O</Text>
                    </View>
                </View>
            </BlurView>
        </View>
    );


    const renderMetricsCards = () => (
        <View className="flex-row gap-4 px-6 mb-6">
            <BlurView intensity={20} tint={isDark ? "dark" : "light"} className={`flex-1 p-4 rounded-3xl border overflow-hidden ${isDark ? 'border-white/10' : 'border-black/5'}`}>
                <Text style={{ color: colors.text }} className="opacity-60 text-xs font-bold uppercase mb-1">Recovery</Text>
                <Text style={{ color: colors.text }} className="text-3xl font-bold mb-2">85<Text className="text-sm font-normal">%</Text></Text>
                <View className="h-1 bg-gray-500/30 rounded-full overflow-hidden">
                    <View className="h-full w-[85%] bg-green-400" />
                </View>
            </BlurView>
            <BlurView intensity={20} tint={isDark ? "dark" : "light"} className={`flex-1 p-4 rounded-3xl border overflow-hidden ${isDark ? 'border-white/10' : 'border-black/5'}`}>
                <Text style={{ color: colors.text }} className="opacity-60 text-xs font-bold uppercase mb-1">Load</Text>
                <Text style={{ color: colors.text }} className="text-3xl font-bold mb-2">High</Text>

                {/* Visualizer */}
                <View className="mt-4 h-10 flex-row items-end justify-between gap-1 opacity-50">
                    {[40, 60, 45, 70, 50, 60, 40].map((h, i) => (
                        <View key={i} style={{ height: (h + '%') as any }} className="w-1.5 bg-cyan-400/50 rounded-full" />
                    ))}
                </View>
            </BlurView>
        </View>
    );

    const renderBodyPartModal = () => (
        <Modal visible={!!selectedBodyPart} animationType="fade" transparent>
            <BlurView intensity={90} tint={isDark ? "dark" : "light"} className="flex-1 justify-center items-center p-6">
                <View className={`w-full p-6 rounded-3xl border ${isDark ? 'bg-black/50 border-white/10' : 'bg-white/80 border-black/5'}`}>
                    <View className="flex-row justify-between items-center mb-4">
                        <Text style={{ color: colors.text }} className="text-xl font-bold">{selectedBodyPart}</Text>
                        <TouchableOpacity onPress={() => setSelectedBodyPart(null)} className={`p-2 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/5'}`}>
                            <X size={20} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <Text style={{ color: colors.text }} className="opacity-60 mb-2">Log Issue / Note</Text>
                    <TextInput
                        multiline
                        placeholder="e.g. Soreness from yesterday's workout..."
                        placeholderTextColor={colors.text + '80'}
                        value={bodyPartNote}
                        onChangeText={setBodyPartNote}
                        className={`p-4 h-32 rounded-xl border mb-4 ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                        style={{ color: colors.text, textAlignVertical: 'top' }}
                    />

                    <TouchableOpacity onPress={saveBodyNote} className="bg-blue-500 p-4 rounded-xl flex-row justify-center items-center gap-2">
                        <Save size={20} color="white" />
                        <Text className="text-white font-bold">Save Note</Text>
                    </TouchableOpacity>
                </View>
            </BlurView>
        </Modal>
    );

    const renderBodyLabels = () => (
        <View className="absolute top-4 left-4 space-y-2 pointer-events-none">
            {Object.entries(bodyNotes).map(([part, note]) => (
                <BlurView key={part} intensity={30} tint={isDark ? "dark" : "light"} className={`flex-row items-center gap-2 px-3 py-2 rounded-xl border ${isDark ? 'border-white/10' : 'border-black/5'}`}>
                    <View className="w-2 h-2 rounded-full bg-blue-500" />
                    <View>
                        <Text style={{ color: colors.text }} className="text-xs font-bold">{part}</Text>
                        <Text style={{ color: colors.text }} className="text-[10px] opacity-60 max-w-[120px]" numberOfLines={1}>{note}</Text>
                    </View>
                </BlurView>
            ))}
        </View>
    );

    const renderDashboard = () => (
        <View>
            {/* Top Section */}
            <View className="px-6 flex-row justify-between items-end mb-2">
                <View>
                    <Text style={{ color: colors.text }} className="opacity-40 text-xs">Health Check</Text>
                    <Text style={{ color: colors.text }} className="text-xl font-bold">Today, {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</Text>
                </View>
                <View className={`px-3 py-1 rounded-full border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                    <Text className="text-green-400 text-xs font-bold">● Connected</Text>
                </View>
            </View>

            {/* Central Body Visualization */}
            <View className="items-center justify-center my-4 relative" style={{ height: 420 }}>
                <View className={`absolute w-[300px] h-[300px] rounded-full blur-3xl opacity-50 pointer-events-none ${isDark ? 'bg-blue-500/20' : 'bg-blue-500/10'}`} />

                {/* Interactive 3D Body */}
                <HumanBody3D onPartClick={handleBodyPartClick} selectedPart={selectedBodyPart} />

                {/* Saved Info Labels */}
                {renderBodyLabels()}

                {/* Floating Data Points */}
                <BlurView intensity={30} tint={isDark ? "dark" : "light"} className={`absolute top-10 right-10 px-3 py-2 rounded-xl border overflow-hidden pointer-events-none ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                    <View className="flex-row items-center gap-2">
                        <View className="w-2 h-2 bg-green-400 rounded-full" />
                        <Text style={{ color: colors.text }} className="text-xs font-bold">Muscle Mass</Text>
                    </View>
                    <Text style={{ color: colors.text }} className="text-lg font-bold">58.4 <Text className="text-xs font-normal opacity-70">Lbs</Text></Text>
                </BlurView>

                <BlurView intensity={30} tint={isDark ? "dark" : "light"} className={`absolute bottom-10 left-10 px-3 py-2 rounded-xl border overflow-hidden pointer-events-none ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                    <View className="flex-row items-center gap-2">
                        <View className="w-2 h-2 bg-yellow-400 rounded-full" />
                        <Text style={{ color: colors.text }} className="text-xs font-bold">Fat %</Text>
                    </View>
                    <Text style={{ color: colors.text }} className="text-lg font-bold">14.2 <Text className="text-xs font-normal opacity-70">%</Text></Text>
                </BlurView>
            </View>

            {renderMetricsCards()}
            {renderDetailedMetrics()}
            {renderBodyPartModal()}
        </View>
    );

    return (
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <SafeAreaView edges={['top']} className="flex-1">
                {renderHeader()}

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
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
