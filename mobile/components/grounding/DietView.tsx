import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Plus, Trash2, Flame, Droplet, Search, Heart, X, Edit2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FoodItem {
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
}

interface MealLog {
    breakfast: FoodItem[];
    lunch: FoodItem[];
    dinner: FoodItem[];
    snacks: FoodItem[];
}

interface SavedFood {
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    isFavorite?: boolean;
}

// Common foods database
const COMMON_FOODS: SavedFood[] = [
    { id: '1', name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fats: 4 },
    { id: '2', name: 'Brown Rice (1 cup)', calories: 216, protein: 5, carbs: 45, fats: 2 },
    { id: '3', name: 'Egg', calories: 78, protein: 6, carbs: 1, fats: 5 },
    { id: '4', name: 'Banana', calories: 105, protein: 1, carbs: 27, fats: 0 },
    { id: '5', name: 'Oatmeal (1 cup)', calories: 150, protein: 5, carbs: 27, fats: 3 },
    { id: '6', name: 'Greek Yogurt', calories: 100, protein: 17, carbs: 6, fats: 1 },
    { id: '7', name: 'Salmon (100g)', calories: 208, protein: 20, carbs: 0, fats: 13 },
    { id: '8', name: 'Broccoli (1 cup)', calories: 55, protein: 4, carbs: 11, fats: 1 },
    { id: '9', name: 'Almonds (1 oz)', calories: 164, protein: 6, carbs: 6, fats: 14 },
    { id: '10', name: 'Avocado (half)', calories: 160, protein: 2, carbs: 9, fats: 15 },
    { id: '11', name: 'Sweet Potato', calories: 103, protein: 2, carbs: 24, fats: 0 },
    { id: '12', name: 'Protein Shake', calories: 120, protein: 24, carbs: 3, fats: 1 },
];

const STORAGE_KEYS = {
    MEALS: 'wrex_diet_meals',
    HYDRATION: 'wrex_hydration',
    FAVORITES: 'wrex_favorites',
};

type MealType = keyof MealLog;

export default function DietView() {
    const { mode } = useTheme();
    const isDark = mode === 'dark';

    const colors = isDark ? {
        background: '#0B0B0B',
        surface: '#161616',
        surfaceAlt: '#1C1C1C',
        border: '#1E1E1E',
        text: '#FFFFFF',
        textSecondary: '#9CA3AF',
        textTertiary: '#6B7280',
        accent: '#FFFFFF',
        accentSubtle: '#2A2A2A',
        // Subtle tints for macros
        proteinTint: '#D1D5DB',
        carbsTint: '#9CA3AF',
        fatsTint: '#6B7280',
        waterTint: '#60A5FA',
    } : {
        background: '#F8F8F8',
        surface: '#FFFFFF',
        surfaceAlt: '#F0F0F0',
        border: '#E5E5E5',
        text: '#000000',
        textSecondary: '#6B7280',
        textTertiary: '#9CA3AF',
        accent: '#000000',
        accentSubtle: '#F0F0F0',
        proteinTint: '#374151',
        carbsTint: '#6B7280',
        fatsTint: '#9CA3AF',
        waterTint: '#3B82F6',
    };

    const [activeMeal, setActiveMeal] = useState<MealType>('breakfast');
    const [meals, setMeals] = useState<MealLog>({ breakfast: [], lunch: [], dinner: [], snacks: [] });
    const [hydration, setHydration] = useState(0);
    const [favorites, setFavorites] = useState<string[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'favorites' | 'browse'>('favorites');
    const [showCustomForm, setShowCustomForm] = useState(false);
    const [customFood, setCustomFood] = useState({ name: '', calories: '', protein: '', carbs: '', fats: '' });

    const targets = { calories: 2000, protein: 150, carbs: 250, fats: 70 };

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [storedMeals, storedHydration, storedFavorites] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.MEALS),
                AsyncStorage.getItem(STORAGE_KEYS.HYDRATION),
                AsyncStorage.getItem(STORAGE_KEYS.FAVORITES),
            ]);
            if (storedMeals) setMeals(JSON.parse(storedMeals));
            if (storedHydration) setHydration(JSON.parse(storedHydration));
            if (storedFavorites) setFavorites(JSON.parse(storedFavorites));
        } catch (e) {
            console.error('Error loading diet data:', e);
        }
    };

    useEffect(() => { AsyncStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(meals)); }, [meals]);
    useEffect(() => { AsyncStorage.setItem(STORAGE_KEYS.HYDRATION, JSON.stringify(hydration)); }, [hydration]);
    useEffect(() => { AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites)); }, [favorites]);

    const totals = useMemo(() => {
        let c = 0, p = 0, ca = 0, f = 0;
        Object.values(meals).flat().forEach((item) => {
            c += item.calories || 0;
            p += item.protein || 0;
            ca += item.carbs || 0;
            f += item.fats || 0;
        });
        return { calories: c, protein: p, carbs: ca, fats: f };
    }, [meals]);

    const getProgress = (current: number, target: number) => Math.min(100, Math.round((current / target) * 100));

    // Actions
    const addFoodToMeal = (food: SavedFood) => {
        const item: FoodItem = {
            id: Date.now().toString(),
            name: food.name,
            calories: food.calories,
            protein: food.protein,
            carbs: food.carbs,
            fats: food.fats,
        };
        setMeals(prev => ({
            ...prev,
            [activeMeal]: [...prev[activeMeal], item]
        }));
        setShowAddModal(false);
    };

    const removeFood = (mealType: MealType, id: string) => {
        setMeals(prev => ({
            ...prev,
            [mealType]: prev[mealType].filter(item => item.id !== id)
        }));
    };

    const addHydration = (amount: number) => {
        setHydration(prev => prev + amount);
    };

    const toggleFavorite = (foodId: string) => {
        setFavorites(prev =>
            prev.includes(foodId)
                ? prev.filter(id => id !== foodId)
                : [...prev, foodId]
        );
    };

    const addCustomFood = () => {
        if (!customFood.name) return;
        const food: SavedFood = {
            id: Date.now().toString(),
            name: customFood.name,
            calories: parseInt(customFood.calories) || 0,
            protein: parseInt(customFood.protein) || 0,
            carbs: parseInt(customFood.carbs) || 0,
            fats: parseInt(customFood.fats) || 0,
        };
        addFoodToMeal(food);
        setCustomFood({ name: '', calories: '', protein: '', carbs: '', fats: '' });
        setShowCustomForm(false);
    };

    const filteredFoods = useMemo(() => {
        let foods = activeTab === 'favorites'
            ? COMMON_FOODS.filter(f => favorites.includes(f.id))
            : COMMON_FOODS;

        if (searchQuery) {
            foods = foods.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return foods;
    }, [activeTab, favorites, searchQuery]);

    const mealTabs: { key: MealType; label: string }[] = [
        { key: 'breakfast', label: 'Breakfast' },
        { key: 'lunch', label: 'Lunch' },
        { key: 'dinner', label: 'Dinner' },
        { key: 'snacks', label: 'Snacks' },
    ];

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Hero Calorie Card */}
            <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
                <View style={styles.heroCardInner}>
                    <View>
                        <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>DAILY CALORIES</Text>
                        <Text style={[styles.heroValue, { color: colors.text }]}>
                            {totals.calories}
                            <Text style={[styles.heroTarget, { color: colors.textTertiary }]}> / {targets.calories}</Text>
                        </Text>
                    </View>
                    <View style={styles.heroRingOuter}>
                        <View style={[styles.heroRingBg, { borderColor: colors.accentSubtle }]} />
                        <Text style={[styles.heroRingPercent, { color: colors.text }]}>
                            {getProgress(totals.calories, targets.calories)}%
                        </Text>
                    </View>
                </View>
            </View>

            {/* Macro Progress Bars */}
            <View style={[styles.macroCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.macroCardTitle, { color: colors.textSecondary }]}>MACROS</Text>
                {[
                    { label: 'Protein', current: totals.protein, target: targets.protein, tint: colors.proteinTint },
                    { label: 'Carbs', current: totals.carbs, target: targets.carbs, tint: colors.carbsTint },
                    { label: 'Fats', current: totals.fats, target: targets.fats, tint: colors.fatsTint },
                ].map(macro => (
                    <View key={macro.label} style={styles.macroBarContainer}>
                        <View style={styles.macroBarHeader}>
                            <Text style={[styles.macroBarLabel, { color: colors.text }]}>{macro.label}</Text>
                            <Text style={[styles.macroBarValue, { color: colors.text }]}>
                                {macro.current}<Text style={{ color: colors.textTertiary }}> / {macro.target}g</Text>
                            </Text>
                        </View>
                        <View style={[styles.macroProgressBar, { backgroundColor: colors.accentSubtle }]}>
                            <View style={[styles.macroProgressFill, { width: `${getProgress(macro.current, macro.target)}%`, backgroundColor: macro.tint }]} />
                        </View>
                    </View>
                ))}
            </View>

            {/* Meal Selector */}
            <View style={[styles.mealSelector, { backgroundColor: colors.accentSubtle }]}>
                {mealTabs.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        onPress={() => setActiveMeal(tab.key)}
                        style={[
                            styles.mealTab,
                            activeMeal === tab.key && { backgroundColor: colors.surface }
                        ]}
                    >
                        <Text style={[
                            styles.mealTabText,
                            { color: activeMeal === tab.key ? colors.text : colors.textSecondary }
                        ]}>{tab.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Meal Items */}
            <View style={[styles.mealCard, { backgroundColor: colors.surface }]}>
                {meals[activeMeal].length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                            No items logged for {activeMeal} yet
                        </Text>
                    </View>
                ) : (
                    meals[activeMeal].map((item, idx) => (
                        <View key={item.id} style={[
                            styles.foodItem,
                            idx < meals[activeMeal].length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }
                        ]}>
                            <View style={styles.foodInfo}>
                                <Text style={[styles.foodName, { color: colors.text }]}>{item.name}</Text>
                                <View style={styles.foodMacroRow}>
                                    <Text style={[styles.foodCalText, { color: colors.text }]}>{item.calories} kcal</Text>
                                    <Text style={[styles.foodMacroText, { color: colors.textTertiary }]}>P {item.protein}g</Text>
                                    <Text style={[styles.foodMacroText, { color: colors.textTertiary }]}>C {item.carbs}g</Text>
                                    <Text style={[styles.foodMacroText, { color: colors.textTertiary }]}>F {item.fats}g</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => removeFood(activeMeal, item.id)} style={styles.deleteBtn}>
                                <Trash2 size={15} color={colors.textTertiary} />
                            </TouchableOpacity>
                        </View>
                    ))
                )}

                <TouchableOpacity
                    onPress={() => setShowAddModal(true)}
                    style={[styles.logFoodButton, { backgroundColor: colors.accentSubtle }]}
                >
                    <Plus size={16} color={colors.textSecondary} />
                    <Text style={[styles.logFoodText, { color: colors.textSecondary }]}>Log Food</Text>
                </TouchableOpacity>
            </View>

            {/* Hydration */}
            <View style={[styles.hydrationCard, { backgroundColor: colors.surface }]}>
                <View style={styles.hydrationLeft}>
                    <Droplet size={18} color={colors.waterTint} />
                    <View>
                        <Text style={[styles.hydrationLabel, { color: colors.textSecondary }]}>HYDRATION</Text>
                        <Text style={[styles.hydrationValue, { color: colors.text }]}>
                            {hydration}<Text style={[styles.hydrationUnit, { color: colors.textTertiary }]}> ml</Text>
                        </Text>
                    </View>
                </View>
                <View style={styles.hydrationButtons}>
                    {[250, 500].map(amount => (
                        <TouchableOpacity
                            key={amount}
                            onPress={() => addHydration(amount)}
                            style={[styles.hydrationBtn, { backgroundColor: colors.accentSubtle }]}
                        >
                            <Plus size={12} color={colors.textSecondary} />
                            <Text style={[styles.hydrationBtnText, { color: colors.textSecondary }]}>{amount}ml</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Add Food Modal */}
            <Modal visible={showAddModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Food</Text>
                            <TouchableOpacity onPress={() => setShowAddModal(false)} style={[styles.modalCloseBtn, { backgroundColor: colors.accentSubtle }]}>
                                <X size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Tab Toggle */}
                        <View style={[styles.tabToggle, { backgroundColor: colors.accentSubtle }]}>
                            <TouchableOpacity
                                onPress={() => setActiveTab('favorites')}
                                style={[styles.tabBtn, activeTab === 'favorites' && { backgroundColor: colors.surface }]}
                            >
                                <Text style={[styles.tabBtnText, { color: activeTab === 'favorites' ? colors.text : colors.textSecondary }]}>Favorites</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setActiveTab('browse')}
                                style={[styles.tabBtn, activeTab === 'browse' && { backgroundColor: colors.surface }]}
                            >
                                <Text style={[styles.tabBtnText, { color: activeTab === 'browse' ? colors.text : colors.textSecondary }]}>Browse</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Search */}
                        <View style={[styles.searchContainer, { backgroundColor: colors.accentSubtle }]}>
                            <Search size={16} color={colors.textTertiary} />
                            <TextInput
                                placeholder="Search foods..."
                                placeholderTextColor={colors.textTertiary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                style={[styles.searchInput, { color: colors.text }]}
                            />
                        </View>

                        {/* Custom Food Toggle */}
                        <TouchableOpacity
                            onPress={() => setShowCustomForm(!showCustomForm)}
                            style={[styles.customToggle, { backgroundColor: colors.accentSubtle }]}
                        >
                            <Plus size={14} color={colors.textSecondary} />
                            <Text style={[styles.customToggleText, { color: colors.textSecondary }]}>Add Custom Food</Text>
                        </TouchableOpacity>

                        {/* Custom Food Form */}
                        {showCustomForm && (
                            <View style={[styles.customForm, { backgroundColor: colors.accentSubtle }]}>
                                <TextInput
                                    placeholder="Food name"
                                    placeholderTextColor={colors.textTertiary}
                                    value={customFood.name}
                                    onChangeText={(v) => setCustomFood(p => ({ ...p, name: v }))}
                                    style={[styles.customInput, { backgroundColor: colors.surface, color: colors.text }]}
                                />
                                <View style={styles.customInputRow}>
                                    <TextInput placeholder="Cal" keyboardType="numeric" placeholderTextColor={colors.textTertiary} value={customFood.calories} onChangeText={(v) => setCustomFood(p => ({ ...p, calories: v }))} style={[styles.customInputSmall, { backgroundColor: colors.surface, color: colors.text }]} />
                                    <TextInput placeholder="Prot" keyboardType="numeric" placeholderTextColor={colors.textTertiary} value={customFood.protein} onChangeText={(v) => setCustomFood(p => ({ ...p, protein: v }))} style={[styles.customInputSmall, { backgroundColor: colors.surface, color: colors.text }]} />
                                    <TextInput placeholder="Carb" keyboardType="numeric" placeholderTextColor={colors.textTertiary} value={customFood.carbs} onChangeText={(v) => setCustomFood(p => ({ ...p, carbs: v }))} style={[styles.customInputSmall, { backgroundColor: colors.surface, color: colors.text }]} />
                                    <TextInput placeholder="Fat" keyboardType="numeric" placeholderTextColor={colors.textTertiary} value={customFood.fats} onChangeText={(v) => setCustomFood(p => ({ ...p, fats: v }))} style={[styles.customInputSmall, { backgroundColor: colors.surface, color: colors.text }]} />
                                </View>
                                <TouchableOpacity onPress={addCustomFood} style={[styles.customAddBtn, { backgroundColor: colors.text }]}>
                                    <Text style={[styles.customAddBtnText, { color: colors.background }]}>Add to {activeMeal}</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Food List */}
                        <ScrollView style={styles.foodList}>
                            {filteredFoods.length === 0 ? (
                                <View style={styles.emptyFoodList}>
                                    <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                                        {activeTab === 'favorites' ? 'No favorites yet. Browse to add some!' : 'No foods found.'}
                                    </Text>
                                </View>
                            ) : (
                                filteredFoods.map(food => (
                                    <TouchableOpacity
                                        key={food.id}
                                        onPress={() => addFoodToMeal(food)}
                                        style={[styles.foodListItem, { backgroundColor: colors.accentSubtle }]}
                                    >
                                        <View style={styles.foodListInfo}>
                                            <Text style={[styles.foodListName, { color: colors.text }]}>{food.name}</Text>
                                            <Text style={[styles.foodListCal, { color: colors.textSecondary }]}>{food.calories} cal</Text>
                                        </View>
                                        <View style={styles.foodListActions}>
                                            <TouchableOpacity onPress={() => toggleFavorite(food.id)} style={styles.favBtn}>
                                                <Heart
                                                    size={16}
                                                    color={favorites.includes(food.id) ? '#EF4444' : colors.textTertiary}
                                                    fill={favorites.includes(food.id) ? '#EF4444' : 'none'}
                                                />
                                            </TouchableOpacity>
                                            <View style={[styles.addCircle, { backgroundColor: colors.text }]}>
                                                <Plus size={14} color={colors.background} />
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 0,
    },

    // Hero Calorie Card
    heroCard: {
        borderRadius: 20,
        padding: 24,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
    },
    heroCardInner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    heroLabel: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 2,
        marginBottom: 8,
    },
    heroValue: {
        fontSize: 36,
        fontWeight: '200',
        letterSpacing: -1,
    },
    heroTarget: {
        fontSize: 16,
        fontWeight: '400',
    },
    heroRingOuter: {
        width: 64,
        height: 64,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroRingBg: {
        position: 'absolute',
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 4,
    },
    heroRingPercent: {
        fontSize: 16,
        fontWeight: '700',
    },

    // Macro Card
    macroCard: {
        borderRadius: 20,
        padding: 24,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
    },
    macroCardTitle: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 2,
        marginBottom: 20,
    },
    macroBarContainer: {
        marginBottom: 16,
    },
    macroBarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    macroBarLabel: {
        fontSize: 13,
        fontWeight: '500',
    },
    macroBarValue: {
        fontSize: 13,
        fontWeight: '600',
    },
    macroProgressBar: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    macroProgressFill: {
        height: '100%',
        borderRadius: 3,
    },

    // Meal Selector (Segmented Control)
    mealSelector: {
        flexDirection: 'row',
        padding: 3,
        borderRadius: 12,
        marginBottom: 16,
    },
    mealTab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    mealTabText: {
        fontSize: 12,
        fontWeight: '600',
    },

    // Meal Card
    mealCard: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyText: {
        fontSize: 13,
        textAlign: 'center',
    },
    foodItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
    },
    foodInfo: {
        flex: 1,
    },
    foodName: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    foodMacroRow: {
        flexDirection: 'row',
        gap: 12,
    },
    foodCalText: {
        fontSize: 11,
        fontWeight: '600',
    },
    foodMacroText: {
        fontSize: 11,
        fontWeight: '500',
    },
    deleteBtn: {
        padding: 8,
    },
    logFoodButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
        marginTop: 12,
    },
    logFoodText: {
        fontSize: 13,
        fontWeight: '600',
    },

    // Hydration
    hydrationCard: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 32,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
    },
    hydrationLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    hydrationLabel: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1,
    },
    hydrationValue: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    hydrationUnit: {
        fontSize: 14,
        fontWeight: '400',
    },
    hydrationButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    hydrationBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    hydrationBtnText: {
        fontSize: 12,
        fontWeight: '600',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '85%',
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
    modalCloseBtn: {
        padding: 8,
        borderRadius: 12,
    },
    tabToggle: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 3,
        marginBottom: 16,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    tabBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 14,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
    },
    customToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 14,
        marginBottom: 16,
    },
    customToggleText: {
        fontSize: 12,
        fontWeight: '600',
    },
    customForm: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
    },
    customInput: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        fontSize: 14,
        marginBottom: 12,
    },
    customInputRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    customInputSmall: {
        flex: 1,
        paddingHorizontal: 10,
        paddingVertical: 12,
        borderRadius: 12,
        fontSize: 14,
        textAlign: 'center',
    },
    customAddBtn: {
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    customAddBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
    foodList: {
        maxHeight: 300,
    },
    emptyFoodList: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    foodListItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 8,
    },
    foodListInfo: {
        flex: 1,
    },
    foodListName: {
        fontSize: 14,
        fontWeight: '600',
    },
    foodListCal: {
        fontSize: 12,
        marginTop: 2,
    },
    foodListActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    favBtn: {
        padding: 8,
    },
    addCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
