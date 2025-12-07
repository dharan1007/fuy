import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../context/ThemeContext';
import { Heart, Activity, Plus, Trash2, Check, AlertCircle, Info, Apple } from 'lucide-react-native';
import { foodDatabase, parseFoodInput, calculateNutrition, FoodItem } from '../../lib/foodDatabase';
import { getMicronutrientRecommendations, FitnessGoal } from '../../lib/nutritionScience';

interface HealthCondition {
    id: string;
    type: "injury" | "illness" | "allergy" | "medication";
    name: string;
    date: string;
    notes: string;
    resolved: boolean;
}

interface DietItem {
    id: string;
    foodName: string;
    quantity: number;
    unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
}

export default function HealthView() {
    const { colors, mode } = useTheme();
    const isDark = mode === 'dark';
    const [subTab, setSubTab] = useState<'history' | 'diet' | 'recs'>('history');

    // --- Health History State ---
    const [conditions, setConditions] = useState<HealthCondition[]>([
        { id: "1", type: "injury", name: "Lower back strain", date: "2024-08-15", notes: "From deadlifting", resolved: true }
    ]);
    const [showConditionModal, setShowConditionModal] = useState(false);
    const [newCondition, setNewCondition] = useState<Partial<HealthCondition>>({ type: "injury", name: "", date: new Date().toISOString().split('T')[0], notes: "" });

    // --- Diet State ---
    const [dietItems, setDietItems] = useState<DietItem[]>([]);
    const [foodInput, setFoodInput] = useState("");

    // --- Recs State ---
    const [goal, setGoal] = useState<FitnessGoal>("maintain");
    const recs = getMicronutrientRecommendations(goal, "male");

    // --- Actions ---
    const addCondition = () => {
        if (!newCondition.name) return;
        setConditions([...conditions, { ...newCondition as HealthCondition, id: Date.now().toString(), resolved: false }]);
        setShowConditionModal(false);
        setNewCondition({ type: "injury", name: "", date: new Date().toISOString().split('T')[0], notes: "" });
    };

    const addFood = () => {
        if (!foodInput) return;
        const parsed = parseFoodInput(foodInput);
        if (parsed && parsed.food) {
            const nut = calculateNutrition(parsed.food, parsed.quantity);
            const item: DietItem = {
                id: Date.now().toString(),
                foodName: `${parsed.quantity}${parsed.unit} ${parsed.food.name}`,
                quantity: parsed.quantity,
                unit: parsed.unit,
                calories: nut.calories,
                protein: nut.protein,
                carbs: nut.carbs,
                fats: nut.fats
            };
            setDietItems([...dietItems, item]);
            setFoodInput("");
        }
    };

    // --- Renderers ---

    const renderHistory = () => (
        <View className="space-y-4">
            <View className="flex-row justify-between items-center mb-2">
                <Text style={{ color: colors.text }} className="text-xl font-bold">Health History</Text>
                <TouchableOpacity onPress={() => setShowConditionModal(true)} className={`px-3 py-1.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/5'}`}>
                    <Plus size={16} color={colors.text} />
                </TouchableOpacity>
            </View>

            {conditions.map(c => (
                <BlurView key={c.id} intensity={30} tint={isDark ? "dark" : "light"} className={`p-4 rounded-2xl border mb-2 ${c.resolved ? 'opacity-60' : ''} ${isDark ? 'border-white/10' : 'border-black/5'}`}>
                    <View className="flex-row justify-between items-start">
                        <View className="flex-1">
                            <View className="flex-row items-center gap-2 mb-1">
                                <Text style={{ color: colors.text }} className={`font-bold text-lg ${c.resolved ? 'line-through' : ''}`}>{c.name}</Text>
                                <View className={`px-2 py-0.5 rounded-md ${c.type === 'injury' ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
                                    <Text className={`text-xs capitalize ${c.type === 'injury' ? 'text-red-500' : 'text-blue-500'}`}>{c.type}</Text>
                                </View>
                            </View>
                            <Text style={{ color: colors.text }} className="text-xs opacity-60 mb-2">{c.date} • {c.notes}</Text>
                        </View>
                        {!c.resolved && (
                            <TouchableOpacity onPress={() => setConditions(conditions.map(cond => cond.id === c.id ? { ...cond, resolved: true } : cond))} className="bg-green-500/20 p-2 rounded-lg">
                                <Check size={16} color="#22c55e" />
                            </TouchableOpacity>
                        )}
                        {c.resolved && (
                            <TouchableOpacity onPress={() => setConditions(conditions.filter(cond => cond.id !== c.id))} className="bg-red-500/20 p-2 rounded-lg ml-2">
                                <Trash2 size={16} color="#ef4444" />
                            </TouchableOpacity>
                        )}
                    </View>
                </BlurView>
            ))}

            {/* Modal for adding condition */}
            <Modal visible={showConditionModal} transparent animationType="fade">
                <BlurView intensity={90} tint={isDark ? "dark" : "light"} className="flex-1 justify-center p-6">
                    <View className={`p-6 rounded-3xl border ${isDark ? 'bg-black/50 border-white/10' : 'bg-white/80 border-black/5'}`}>
                        <Text style={{ color: colors.text }} className="text-xl font-bold mb-4">Add Event</Text>

                        <ScrollView horizontal className="mb-4">
                            {(['injury', 'illness', 'allergy', 'medication'] as const).map(t => (
                                <TouchableOpacity key={t} onPress={() => setNewCondition({ ...newCondition, type: t })} className={`mr-2 px-3 py-1.5 rounded-full border ${newCondition.type === t ? 'bg-blue-500 border-blue-500' : (isDark ? 'border-white/20' : 'border-black/20')}`}>
                                    <Text style={{ color: newCondition.type === t ? 'white' : colors.text }} className="capitalize">{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TextInput
                            placeholder="Condition Name"
                            placeholderTextColor={colors.text + '80'}
                            value={newCondition.name}
                            onChangeText={t => setNewCondition({ ...newCondition, name: t })}
                            className={`p-3 rounded-xl border mb-3 ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                            style={{ color: colors.text }}
                        />
                        <TextInput
                            placeholder="Notes"
                            placeholderTextColor={colors.text + '80'}
                            value={newCondition.notes}
                            onChangeText={t => setNewCondition({ ...newCondition, notes: t })}
                            className={`p-3 rounded-xl border mb-4 ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
                            style={{ color: colors.text }}
                        />

                        <View className="flex-row gap-3">
                            <TouchableOpacity onPress={() => setShowConditionModal(false)} className={`flex-1 p-3 rounded-xl items-center border ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                                <Text style={{ color: colors.text }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={addCondition} className="flex-1 bg-blue-500 p-3 rounded-xl items-center">
                                <Text className="text-white font-bold">Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </BlurView>
            </Modal>
        </View>
    );

    const renderDiet = () => (
        <View className="space-y-4">
            <View className="p-4 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30">
                <Text style={{ color: colors.text }} className="font-bold mb-2">Detailed Nutrition</Text>
                <View className="flex-row gap-2 mb-2">
                    <TextInput
                        placeholder="e.g. 2 eggs"
                        placeholderTextColor={colors.text + '80'}
                        value={foodInput}
                        onChangeText={setFoodInput}
                        className={`flex-1 p-2 rounded-lg border ${isDark ? 'bg-black/20 border-white/10' : 'bg-white/50 border-black/10'}`}
                        style={{ color: colors.text }}
                    />
                    <TouchableOpacity onPress={addFood} className="bg-green-500 px-4 justify-center rounded-lg">
                        <Plus size={20} color="white" />
                    </TouchableOpacity>
                </View>
                <Text style={{ color: colors.text }} className="text-xs opacity-60">Database contains: Chicken, Salmon, Egg, Rice, Oats, etc.</Text>
            </View>

            {dietItems.map(item => (
                <View key={item.id} className={`p-3 rounded-xl border mb-2 flex-row justify-between items-center ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <View>
                        <Text style={{ color: colors.text }} className="font-bold">{item.foodName}</Text>
                        <Text style={{ color: colors.text }} className="text-xs opacity-60">{item.calories}kcal • P:{item.protein} C:{item.carbs} F:{item.fats}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setDietItems(dietItems.filter(i => i.id !== item.id))}>
                        <Trash2 size={16} color={colors.text} className="opacity-40" />
                    </TouchableOpacity>
                </View>
            ))}

            {dietItems.length > 0 && (
                <View className={`p-4 rounded-xl border mt-2 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                    <Text style={{ color: colors.text }} className="font-bold mb-2">Total</Text>
                    <View className="flex-row justify-between">
                        <Text style={{ color: colors.text }}>Cal: {Math.round(dietItems.reduce((a, b) => a + b.calories, 0))}</Text>
                        <Text style={{ color: colors.text }}>P: {Math.round(dietItems.reduce((a, b) => a + b.protein, 0))}g</Text>
                        <Text style={{ color: colors.text }}>C: {Math.round(dietItems.reduce((a, b) => a + b.carbs, 0))}g</Text>
                        <Text style={{ color: colors.text }}>F: {Math.round(dietItems.reduce((a, b) => a + b.fats, 0))}g</Text>
                    </View>
                </View>
            )}
        </View>
    );

    const renderRecs = () => (
        <View className="space-y-4">
            <View className="flex-row items-center justify-between mb-2">
                <Text style={{ color: colors.text }} className="font-bold text-lg">Nutrient Guide</Text>
                {/* Goal Selector (Simplified) */}
                <TouchableOpacity onPress={() => setGoal(goal === 'maintain' ? 'bulk_muscle' : 'maintain')} className={`px-3 py-1 rounded-full border ${isDark ? 'border-white/20' : 'border-black/10'}`}>
                    <Text style={{ color: colors.text }} className="text-xs capitalize">{goal.replace('_', ' ')}</Text>
                </TouchableOpacity>
            </View>

            {Object.entries(recs).map(([key, value]) => (
                <BlurView key={key} intensity={20} tint={isDark ? "dark" : "light"} className={`p-4 rounded-2xl border mb-2 ${isDark ? 'border-white/10' : 'border-black/5'}`}>
                    <View className="flex-row gap-3">
                        <View className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-white/10' : 'bg-black/5'}`}>
                            <Info size={20} color={colors.text} />
                        </View>
                        <View className="flex-1">
                            <Text style={{ color: colors.text }} className="font-bold capitalize text-lg">{key}</Text>
                            <Text style={{ color: colors.text }} className="opacity-80 leading-5">{value}</Text>
                        </View>
                    </View>
                </BlurView>
            ))}
        </View>
    );

    return (
        <View className="px-6">
            <View className="flex-row mb-6 bg-gray-500/10 p-1 rounded-xl">
                <TouchableOpacity onPress={() => setSubTab('history')} className={`flex-1 py-2 items-center rounded-lg ${subTab === 'history' ? (isDark ? 'bg-white/20' : 'bg-white shadow-sm') : ''}`}>
                    <Text style={{ color: colors.text }} className="font-bold">History</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSubTab('diet')} className={`flex-1 py-2 items-center rounded-lg ${subTab === 'diet' ? (isDark ? 'bg-white/20' : 'bg-white shadow-sm') : ''}`}>
                    <Text style={{ color: colors.text }} className="font-bold">Diet</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSubTab('recs')} className={`flex-1 py-2 items-center rounded-lg ${subTab === 'recs' ? (isDark ? 'bg-white/20' : 'bg-white shadow-sm') : ''}`}>
                    <Text style={{ color: colors.text }} className="font-bold">Guide</Text>
                </TouchableOpacity>
            </View>

            {subTab === 'history' && renderHistory()}
            {subTab === 'diet' && renderDiet()}
            {subTab === 'recs' && renderRecs()}
        </View>
    );
}
