import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Plus, Trash2, Check, Info } from 'lucide-react-native';
import { foodDatabase, parseFoodInput, calculateNutrition, FoodItem } from '../../lib/foodDatabase';
import { getMicronutrientRecommendations, FitnessGoal } from '../../lib/nutritionScience';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DietView from './DietView';

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

const STORAGE_KEYS = {
    HEALTH_CONDITIONS: 'wrex_health_conditions',
    DIET_ITEMS: 'wrex_diet_items',
    GOAL_TYPE: 'wrex_goal_type',
};

export default function HealthView() {
    const { mode } = useTheme();
    const isDark = mode === 'dark';

    const colors = isDark ? {
        background: '#0B0B0B',
        surface: '#161616',
        border: '#1E1E1E',
        text: '#FFFFFF',
        textSecondary: '#9CA3AF',
        textTertiary: '#6B7280',
        accent: '#FFFFFF',
        accentSubtle: '#2A2A2A',
    } : {
        background: '#F8F8F8',
        surface: '#FFFFFF',
        border: '#E5E5E5',
        text: '#000000',
        textSecondary: '#6B7280',
        textTertiary: '#9CA3AF',
        accent: '#000000',
        accentSubtle: '#F0F0F0',
    };

    const [subTab, setSubTab] = useState<'history' | 'diet' | 'recs'>('history');

    // --- Health History State ---
    const [conditions, setConditions] = useState<HealthCondition[]>([]);
    const [showConditionModal, setShowConditionModal] = useState(false);
    const [newCondition, setNewCondition] = useState<Partial<HealthCondition>>({
        type: "injury",
        name: "",
        date: new Date().toISOString().split('T')[0],
        notes: ""
    });

    // --- Diet State ---
    const [dietItems, setDietItems] = useState<DietItem[]>([]);
    const [foodInput, setFoodInput] = useState("");

    // --- Recs State ---
    const [goal, setGoal] = useState<FitnessGoal>("maintain");
    const recs = getMicronutrientRecommendations(goal, "male");

    useEffect(() => { loadStoredData(); }, []);

    const loadStoredData = async () => {
        try {
            const [storedConditions, storedDiet, storedGoal] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.HEALTH_CONDITIONS),
                AsyncStorage.getItem(STORAGE_KEYS.DIET_ITEMS),
                AsyncStorage.getItem(STORAGE_KEYS.GOAL_TYPE),
            ]);
            if (storedConditions) setConditions(JSON.parse(storedConditions));
            if (storedDiet) setDietItems(JSON.parse(storedDiet));
            if (storedGoal) setGoal(storedGoal as FitnessGoal);
        } catch (error) {
            console.error('Error loading health data:', error);
        }
    };

    useEffect(() => {
        if (conditions.length > 0) {
            AsyncStorage.setItem(STORAGE_KEYS.HEALTH_CONDITIONS, JSON.stringify(conditions));
        }
    }, [conditions]);

    useEffect(() => {
        if (dietItems.length > 0) {
            AsyncStorage.setItem(STORAGE_KEYS.DIET_ITEMS, JSON.stringify(dietItems));
        }
    }, [dietItems]);

    // --- Actions ---
    const addCondition = async () => {
        if (!newCondition.name) return;
        const condition: HealthCondition = {
            ...newCondition as HealthCondition,
            id: Date.now().toString(),
            resolved: false
        };
        setConditions([...conditions, condition]);
        setShowConditionModal(false);
        setNewCondition({ type: "injury", name: "", date: new Date().toISOString().split('T')[0], notes: "" });
    };

    const resolveCondition = async (id: string) => {
        setConditions(conditions.map(c => c.id === id ? { ...c, resolved: true } : c));
    };

    const deleteCondition = async (id: string) => {
        const updated = conditions.filter(c => c.id !== id);
        setConditions(updated);
        if (updated.length === 0) {
            await AsyncStorage.removeItem(STORAGE_KEYS.HEALTH_CONDITIONS);
        }
    };

    const addFood = async () => {
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

    const deleteFood = async (id: string) => {
        const updated = dietItems.filter(i => i.id !== id);
        setDietItems(updated);
        if (updated.length === 0) {
            await AsyncStorage.removeItem(STORAGE_KEYS.DIET_ITEMS);
        }
    };

    const clearDiet = async () => {
        setDietItems([]);
        await AsyncStorage.removeItem(STORAGE_KEYS.DIET_ITEMS);
    };

    // --- Renderers ---

    const renderHistory = () => (
        <View style={styles.tabContent}>
            <View style={styles.headerRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Health History</Text>
                <TouchableOpacity
                    onPress={() => setShowConditionModal(true)}
                    style={[styles.addButton, { backgroundColor: colors.accentSubtle }]}
                >
                    <Plus size={16} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {conditions.length === 0 && (
                <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No health conditions logged</Text>
                    <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>Track injuries, illnesses, or medications</Text>
                </View>
            )}

            {conditions.map(c => (
                <View
                    key={c.id}
                    style={[
                        styles.conditionCard,
                        { backgroundColor: colors.surface },
                        c.resolved && { opacity: 0.5 }
                    ]}
                >
                    <View style={styles.conditionHeader}>
                        <View style={styles.conditionInfo}>
                            <View style={styles.conditionTitleRow}>
                                <Text
                                    style={[
                                        styles.conditionName,
                                        { color: colors.text },
                                        c.resolved && { textDecorationLine: 'line-through' }
                                    ]}
                                >
                                    {c.name}
                                </Text>
                                <View style={[styles.typeBadge, { backgroundColor: colors.accentSubtle }]}>
                                    <Text style={[styles.typeText, { color: colors.textSecondary }]}>{c.type}</Text>
                                </View>
                            </View>
                            <Text style={[styles.conditionMeta, { color: colors.textTertiary }]}>
                                {c.date} {c.notes && `- ${c.notes}`}
                            </Text>
                        </View>
                        <View style={styles.conditionActions}>
                            {!c.resolved && (
                                <TouchableOpacity
                                    onPress={() => resolveCondition(c.id)}
                                    style={[styles.actionButton, { backgroundColor: colors.accentSubtle }]}
                                >
                                    <Check size={15} color={colors.text} />
                                </TouchableOpacity>
                            )}
                            {c.resolved && (
                                <TouchableOpacity
                                    onPress={() => deleteCondition(c.id)}
                                    style={[styles.actionButton, { backgroundColor: colors.accentSubtle }]}
                                >
                                    <Trash2 size={15} color={colors.textTertiary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            ))}

            {/* Modal for adding condition */}
            <Modal visible={showConditionModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Add Health Event</Text>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
                            {(['injury', 'illness', 'allergy', 'medication'] as const).map(t => (
                                <TouchableOpacity
                                    key={t}
                                    onPress={() => setNewCondition({ ...newCondition, type: t })}
                                    style={[
                                        styles.typeButton,
                                        { backgroundColor: newCondition.type === t ? colors.accent : colors.accentSubtle }
                                    ]}
                                >
                                    <Text style={[
                                        styles.typeButtonText,
                                        { color: newCondition.type === t ? (isDark ? '#000' : '#FFF') : colors.textSecondary }
                                    ]}>
                                        {t.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TextInput
                            placeholder="Condition Name"
                            placeholderTextColor={colors.textTertiary}
                            value={newCondition.name}
                            onChangeText={t => setNewCondition({ ...newCondition, name: t })}
                            style={[styles.modalInput, { backgroundColor: colors.accentSubtle, color: colors.text }]}
                        />
                        <TextInput
                            placeholder="Notes"
                            placeholderTextColor={colors.textTertiary}
                            value={newCondition.notes}
                            onChangeText={t => setNewCondition({ ...newCondition, notes: t })}
                            style={[styles.modalInput, { backgroundColor: colors.accentSubtle, color: colors.text }]}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                onPress={() => setShowConditionModal(false)}
                                style={[styles.cancelButton, { backgroundColor: colors.accentSubtle }]}
                            >
                                <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={addCondition}
                                style={[styles.saveButton, { backgroundColor: colors.accent }]}
                            >
                                <Text style={[styles.saveText, { color: isDark ? '#000' : '#FFF' }]}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );

    const renderRecs = () => (
        <View style={styles.tabContent}>
            <View style={styles.headerRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Nutrient Guide</Text>
                <TouchableOpacity
                    onPress={() => setGoal(goal === 'maintain' ? 'bulk_muscle' : 'maintain')}
                    style={[styles.goalToggle, { backgroundColor: colors.accentSubtle }]}
                >
                    <Text style={[styles.goalToggleText, { color: colors.textSecondary }]}>
                        {goal.replace('_', ' ').toUpperCase()}
                    </Text>
                </TouchableOpacity>
            </View>

            {Object.entries(recs).map(([key, value]) => (
                <View key={key} style={[styles.recCard, { backgroundColor: colors.surface }]}>
                    <View style={styles.recContent}>
                        <View style={[styles.recIcon, { backgroundColor: colors.accentSubtle }]}>
                            <Info size={18} color={colors.textSecondary} />
                        </View>
                        <View style={styles.recTextContent}>
                            <Text style={[styles.recTitle, { color: colors.text }]}>{key.toUpperCase()}</Text>
                            <Text style={[styles.recDescription, { color: colors.textSecondary }]}>{value}</Text>
                        </View>
                    </View>
                </View>
            ))}
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Segmented Control */}
            <View style={[styles.subTabs, { backgroundColor: colors.accentSubtle }]}>
                {(['history', 'diet', 'recs'] as const).map(tab => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setSubTab(tab)}
                        style={[
                            styles.subTab,
                            subTab === tab && { backgroundColor: colors.surface }
                        ]}
                    >
                        <Text style={[
                            styles.subTabText,
                            { color: subTab === tab ? colors.text : colors.textSecondary }
                        ]}>
                            {tab === 'recs' ? 'Guide' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {subTab === 'history' && renderHistory()}
            {subTab === 'diet' && <DietView />}
            {subTab === 'recs' && renderRecs()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 24,
    },
    subTabs: {
        flexDirection: 'row',
        padding: 3,
        borderRadius: 12,
        marginBottom: 24,
    },
    subTab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    subTabText: {
        fontSize: 13,
        fontWeight: '600',
    },
    tabContent: {
        gap: 12,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    addButton: {
        padding: 10,
        borderRadius: 14,
    },
    emptyState: {
        padding: 40,
        borderRadius: 20,
        alignItems: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '500',
    },
    emptySubtext: {
        fontSize: 12,
    },
    conditionCard: {
        padding: 18,
        borderRadius: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
    },
    conditionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    conditionInfo: {
        flex: 1,
    },
    conditionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 6,
    },
    conditionName: {
        fontWeight: '600',
        fontSize: 15,
    },
    typeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 8,
    },
    typeText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    conditionMeta: {
        fontSize: 12,
    },
    conditionActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        padding: 8,
        borderRadius: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        padding: 24,
        borderRadius: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 20,
    },
    typeSelector: {
        marginBottom: 16,
    },
    typeButton: {
        marginRight: 8,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
    },
    typeButtonText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    modalInput: {
        padding: 14,
        borderRadius: 14,
        marginBottom: 12,
        fontSize: 14,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    cancelButton: {
        flex: 1,
        padding: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 14,
        fontWeight: '500',
    },
    saveButton: {
        flex: 1,
        padding: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    saveText: {
        fontSize: 14,
        fontWeight: '600',
    },
    goalToggle: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
    },
    goalToggleText: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    recCard: {
        padding: 18,
        borderRadius: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
    },
    recContent: {
        flexDirection: 'row',
        gap: 14,
    },
    recIcon: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    recTextContent: {
        flex: 1,
    },
    recTitle: {
        fontWeight: '600',
        fontSize: 14,
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    recDescription: {
        fontSize: 13,
        lineHeight: 20,
    },
});
