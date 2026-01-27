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

    // Monochrome colors
    const colors = {
        background: isDark ? '#000000' : '#FFFFFF',
        surface: isDark ? '#111111' : '#F5F5F5',
        border: isDark ? '#333333' : '#E0E0E0',
        text: isDark ? '#FFFFFF' : '#000000',
        textSecondary: isDark ? '#888888' : '#666666',
        accent: isDark ? '#FFFFFF' : '#000000',
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

    // Load data on mount
    useEffect(() => {
        loadStoredData();
    }, []);

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

    // Save conditions
    useEffect(() => {
        if (conditions.length > 0) {
            AsyncStorage.setItem(STORAGE_KEYS.HEALTH_CONDITIONS, JSON.stringify(conditions));
        }
    }, [conditions]);

    // Save diet items
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
                    style={[styles.addButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                    <Plus size={16} color={colors.text} />
                </TouchableOpacity>
            </View>

            {conditions.length === 0 && (
                <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No health conditions logged</Text>
                    <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Track injuries, illnesses, or medications</Text>
                </View>
            )}

            {conditions.map(c => (
                <View
                    key={c.id}
                    style={[
                        styles.conditionCard,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        c.resolved && { opacity: 0.6 }
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
                                <View style={[styles.typeBadge, { borderColor: colors.border }]}>
                                    <Text style={[styles.typeText, { color: colors.textSecondary }]}>{c.type}</Text>
                                </View>
                            </View>
                            <Text style={[styles.conditionMeta, { color: colors.textSecondary }]}>
                                {c.date} {c.notes && `- ${c.notes}`}
                            </Text>
                        </View>
                        <View style={styles.conditionActions}>
                            {!c.resolved && (
                                <TouchableOpacity
                                    onPress={() => resolveCondition(c.id)}
                                    style={[styles.actionButton, { backgroundColor: colors.background }]}
                                >
                                    <Check size={16} color={colors.text} />
                                </TouchableOpacity>
                            )}
                            {c.resolved && (
                                <TouchableOpacity
                                    onPress={() => deleteCondition(c.id)}
                                    style={[styles.actionButton, { backgroundColor: colors.background }]}
                                >
                                    <Trash2 size={16} color={colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            ))}

            {/* Modal for adding condition */}
            <Modal visible={showConditionModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Add Health Event</Text>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
                            {(['injury', 'illness', 'allergy', 'medication'] as const).map(t => (
                                <TouchableOpacity
                                    key={t}
                                    onPress={() => setNewCondition({ ...newCondition, type: t })}
                                    style={[
                                        styles.typeButton,
                                        { borderColor: colors.border },
                                        newCondition.type === t && { backgroundColor: colors.accent }
                                    ]}
                                >
                                    <Text style={[
                                        styles.typeButtonText,
                                        { color: newCondition.type === t ? (isDark ? '#000' : '#FFF') : colors.text }
                                    ]}>
                                        {t.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TextInput
                            placeholder="Condition Name"
                            placeholderTextColor={colors.textSecondary}
                            value={newCondition.name}
                            onChangeText={t => setNewCondition({ ...newCondition, name: t })}
                            style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                        />
                        <TextInput
                            placeholder="Notes"
                            placeholderTextColor={colors.textSecondary}
                            value={newCondition.notes}
                            onChangeText={t => setNewCondition({ ...newCondition, notes: t })}
                            style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                onPress={() => setShowConditionModal(false)}
                                style={[styles.cancelButton, { borderColor: colors.border }]}
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
                    style={[styles.goalToggle, { borderColor: colors.border }]}
                >
                    <Text style={[styles.goalToggleText, { color: colors.text }]}>
                        {goal.replace('_', ' ').toUpperCase()}
                    </Text>
                </TouchableOpacity>
            </View>

            {Object.entries(recs).map(([key, value]) => (
                <View key={key} style={[styles.recCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.recContent}>
                        <View style={[styles.recIcon, { backgroundColor: colors.background }]}>
                            <Info size={20} color={colors.text} />
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
            <View style={[styles.subTabs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TouchableOpacity
                    onPress={() => setSubTab('history')}
                    style={[styles.subTab, subTab === 'history' && { backgroundColor: colors.accent }]}
                >
                    <Text style={[styles.subTabText, { color: subTab === 'history' ? (isDark ? '#000' : '#FFF') : colors.text }]}>History</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setSubTab('diet')}
                    style={[styles.subTab, subTab === 'diet' && { backgroundColor: colors.accent }]}
                >
                    <Text style={[styles.subTabText, { color: subTab === 'diet' ? (isDark ? '#000' : '#FFF') : colors.text }]}>Diet</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setSubTab('recs')}
                    style={[styles.subTab, subTab === 'recs' && { backgroundColor: colors.accent }]}
                >
                    <Text style={[styles.subTabText, { color: subTab === 'recs' ? (isDark ? '#000' : '#FFF') : colors.text }]}>Guide</Text>
                </TouchableOpacity>
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
    conditionCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
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
        gap: 8,
        marginBottom: 4,
    },
    conditionName: {
        fontWeight: '700',
        fontSize: 16,
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
    },
    typeText: {
        fontSize: 10,
        textTransform: 'uppercase',
    },
    conditionMeta: {
        fontSize: 11,
    },
    conditionActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        padding: 8,
        borderRadius: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 16,
    },
    typeSelector: {
        marginBottom: 16,
    },
    typeButton: {
        marginRight: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
    },
    typeButtonText: {
        fontSize: 10,
        fontWeight: '700',
    },
    modalInput: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    cancelButton: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
    },
    cancelText: {},
    saveButton: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveText: {
        fontWeight: '700',
    },
    dietInputCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    cardTitle: {
        fontWeight: '700',
        marginBottom: 12,
    },
    foodInputRow: {
        flexDirection: 'row',
        gap: 8,
    },
    foodInput: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
    },
    addFoodButton: {
        paddingHorizontal: 16,
        justifyContent: 'center',
        borderRadius: 8,
    },
    foodHint: {
        fontSize: 10,
        marginTop: 8,
    },
    dietHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    clearText: {
        fontSize: 12,
    },
    dietItemCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    dietItemInfo: {},
    dietItemName: {
        fontWeight: '600',
    },
    dietItemMacros: {
        fontSize: 11,
    },
    totalCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginTop: 8,
    },
    totalTitle: {
        fontWeight: '700',
        marginBottom: 12,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    totalItem: {
        alignItems: 'center',
    },
    totalValue: {
        fontWeight: '700',
        fontSize: 16,
    },
    totalLabel: {
        fontSize: 9,
        letterSpacing: 0.5,
    },
    goalToggle: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
    },
    goalToggleText: {
        fontSize: 10,
        fontWeight: '600',
    },
    recCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    recContent: {
        flexDirection: 'row',
        gap: 12,
    },
    recIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    recTextContent: {
        flex: 1,
    },
    recTitle: {
        fontWeight: '700',
        fontSize: 16,
        marginBottom: 4,
    },
    recDescription: {
        lineHeight: 20,
    },
});
