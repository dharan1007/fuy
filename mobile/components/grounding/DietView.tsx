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

    const colors = {
        background: isDark ? '#000000' : '#FFFFFF',
        surface: isDark ? '#111111' : '#F5F5F5',
        surfaceAlt: isDark ? '#1a1a1a' : '#EEEEEE',
        border: isDark ? '#333333' : '#E0E0E0',
        text: isDark ? '#FFFFFF' : '#000000',
        textSecondary: isDark ? '#888888' : '#666666',
        accent: '#FF6B00',
        blue: '#3B82F6',
        green: '#22C55E',
        yellow: '#EAB308',
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

    // Targets (could be fetched from user profile)
    const targets = { calories: 2000, protein: 150, carbs: 250, fats: 70 };

    // Load data on mount
    useEffect(() => {
        loadData();
    }, []);

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

    // Save data when changed
    useEffect(() => {
        AsyncStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(meals));
    }, [meals]);

    useEffect(() => {
        AsyncStorage.setItem(STORAGE_KEYS.HYDRATION, JSON.stringify(hydration));
    }, [hydration]);

    useEffect(() => {
        AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    }, [favorites]);

    // Calculations
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
        { key: 'breakfast', label: 'BREAKFAST' },
        { key: 'lunch', label: 'LUNCH' },
        { key: 'dinner', label: 'DINNER' },
        { key: 'snacks', label: 'SNACKS' },
    ];

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header - Daily Fuel */}
            <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,107,0,0.1)' }]}>
                            <Flame size={24} color={colors.accent} />
                        </View>
                        <View>
                            <Text style={[styles.headerTitle, { color: colors.text }]}>DAILY FUEL</Text>
                            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>NET CALORIES</Text>
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={[styles.calorieValue, { color: colors.text }]}>
                            {totals.calories}
                            <Text style={[styles.calorieTarget, { color: colors.textSecondary }]}> / {targets.calories}</Text>
                        </Text>
                        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                            <View style={[styles.progressFill, { width: `${getProgress(totals.calories, targets.calories)}%`, backgroundColor: colors.accent }]} />
                        </View>
                    </View>
                </View>
            </View>

            {/* Meal Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mealTabsContainer}>
                {mealTabs.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        onPress={() => setActiveMeal(tab.key)}
                        style={[
                            styles.mealTab,
                            activeMeal === tab.key
                                ? { backgroundColor: colors.text, borderColor: colors.text }
                                : { backgroundColor: 'transparent', borderColor: colors.border }
                        ]}
                    >
                        <Text style={[
                            styles.mealTabText,
                            { color: activeMeal === tab.key ? colors.background : colors.textSecondary }
                        ]}>{tab.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Meal Items List */}
            <View style={[styles.mealCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {meals[activeMeal].length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyIcon, { opacity: 0.3 }]}>🍽️</Text>
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            No items logged for {activeMeal} yet.
                        </Text>
                    </View>
                ) : (
                    meals[activeMeal].map(item => (
                        <View key={item.id} style={[styles.foodItem, { borderBottomColor: colors.border }]}>
                            <View style={styles.foodInfo}>
                                <Text style={[styles.foodName, { color: colors.text }]}>{item.name}</Text>
                                <View style={styles.macroRow}>
                                    <Text style={[styles.macroText, { color: colors.accent }]}>{item.calories} KCAL</Text>
                                    <Text style={[styles.macroText, { color: colors.textSecondary }]}>P: {item.protein}g</Text>
                                    <Text style={[styles.macroText, { color: colors.textSecondary }]}>C: {item.carbs}g</Text>
                                    <Text style={[styles.macroText, { color: colors.textSecondary }]}>F: {item.fats}g</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => removeFood(activeMeal, item.id)} style={styles.deleteBtn}>
                                <Trash2 size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    ))
                )}

                <TouchableOpacity
                    onPress={() => setShowAddModal(true)}
                    style={[styles.addButton, { borderColor: colors.border }]}
                >
                    <Plus size={16} color={colors.textSecondary} />
                    <Text style={[styles.addButtonText, { color: colors.textSecondary }]}>Log Food</Text>
                </TouchableOpacity>
            </View>

            {/* Macro Bars */}
            <View style={[styles.macroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.macroCardTitle, { color: colors.textSecondary }]}>TARGET MACROS</Text>

                <View style={styles.macroBarContainer}>
                    <View style={styles.macroBarHeader}>
                        <Text style={[styles.macroBarLabel, { color: colors.text }]}>Protein</Text>
                        <Text style={[styles.macroBarValue, { color: colors.text }]}>
                            {totals.protein} <Text style={{ color: colors.textSecondary }}>/ {targets.protein}g</Text>
                        </Text>
                    </View>
                    <View style={[styles.macroProgressBar, { backgroundColor: colors.border }]}>
                        <View style={[styles.macroProgressFill, { width: `${getProgress(totals.protein, targets.protein)}%`, backgroundColor: colors.blue }]} />
                    </View>
                </View>

                <View style={styles.macroBarContainer}>
                    <View style={styles.macroBarHeader}>
                        <Text style={[styles.macroBarLabel, { color: colors.text }]}>Carbs</Text>
                        <Text style={[styles.macroBarValue, { color: colors.text }]}>
                            {totals.carbs} <Text style={{ color: colors.textSecondary }}>/ {targets.carbs}g</Text>
                        </Text>
                    </View>
                    <View style={[styles.macroProgressBar, { backgroundColor: colors.border }]}>
                        <View style={[styles.macroProgressFill, { width: `${getProgress(totals.carbs, targets.carbs)}%`, backgroundColor: colors.green }]} />
                    </View>
                </View>

                <View style={styles.macroBarContainer}>
                    <View style={styles.macroBarHeader}>
                        <Text style={[styles.macroBarLabel, { color: colors.text }]}>Fats</Text>
                        <Text style={[styles.macroBarValue, { color: colors.text }]}>
                            {totals.fats} <Text style={{ color: colors.textSecondary }}>/ {targets.fats}g</Text>
                        </Text>
                    </View>
                    <View style={[styles.macroProgressBar, { backgroundColor: colors.border }]}>
                        <View style={[styles.macroProgressFill, { width: `${getProgress(totals.fats, targets.fats)}%`, backgroundColor: colors.yellow }]} />
                    </View>
                </View>
            </View>

            {/* Hydration */}
            <View style={[styles.hydrationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.hydrationHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
                        <Droplet size={20} color={colors.blue} />
                    </View>
                    <View>
                        <Text style={[styles.hydrationLabel, { color: colors.blue }]}>HYDRATION</Text>
                        <Text style={[styles.hydrationValue, { color: colors.text }]}>
                            {hydration} <Text style={{ color: colors.textSecondary, fontSize: 14 }}>ml</Text>
                        </Text>
                    </View>
                </View>
                <View style={styles.hydrationButtons}>
                    {[250, 500].map(amount => (
                        <TouchableOpacity
                            key={amount}
                            onPress={() => addHydration(amount)}
                            style={[styles.hydrationBtn, { backgroundColor: colors.blue }]}
                        >
                            <Plus size={14} color="#000" />
                            <Text style={styles.hydrationBtnText}>{amount}ml</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Add Food Modal */}
            <Modal visible={showAddModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Food</Text>
                            <TouchableOpacity onPress={() => setShowAddModal(false)}>
                                <X size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Tab Toggle */}
                        <View style={[styles.tabToggle, { backgroundColor: colors.surface }]}>
                            <TouchableOpacity
                                onPress={() => setActiveTab('favorites')}
                                style={[styles.tabBtn, activeTab === 'favorites' && { backgroundColor: colors.border }]}
                            >
                                <Text style={[styles.tabBtnText, { color: activeTab === 'favorites' ? colors.text : colors.textSecondary }]}>Favorites</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setActiveTab('browse')}
                                style={[styles.tabBtn, activeTab === 'browse' && { backgroundColor: colors.border }]}
                            >
                                <Text style={[styles.tabBtnText, { color: activeTab === 'browse' ? colors.text : colors.textSecondary }]}>Browse</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Search */}
                        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Search size={16} color={colors.textSecondary} />
                            <TextInput
                                placeholder="Search foods..."
                                placeholderTextColor={colors.textSecondary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                style={[styles.searchInput, { color: colors.text }]}
                            />
                        </View>

                        {/* Custom Food Toggle */}
                        <TouchableOpacity
                            onPress={() => setShowCustomForm(!showCustomForm)}
                            style={[styles.customToggle, { borderColor: colors.border }]}
                        >
                            <Plus size={14} color={colors.textSecondary} />
                            <Text style={[styles.customToggleText, { color: colors.textSecondary }]}>Add Custom Food</Text>
                        </TouchableOpacity>

                        {/* Custom Food Form */}
                        {showCustomForm && (
                            <View style={[styles.customForm, { backgroundColor: colors.surface }]}>
                                <TextInput
                                    placeholder="Food name"
                                    placeholderTextColor={colors.textSecondary}
                                    value={customFood.name}
                                    onChangeText={(v) => setCustomFood(p => ({ ...p, name: v }))}
                                    style={[styles.customInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                />
                                <View style={styles.customInputRow}>
                                    <TextInput placeholder="Cal" keyboardType="numeric" placeholderTextColor={colors.textSecondary} value={customFood.calories} onChangeText={(v) => setCustomFood(p => ({ ...p, calories: v }))} style={[styles.customInputSmall, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} />
                                    <TextInput placeholder="Prot" keyboardType="numeric" placeholderTextColor={colors.textSecondary} value={customFood.protein} onChangeText={(v) => setCustomFood(p => ({ ...p, protein: v }))} style={[styles.customInputSmall, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} />
                                    <TextInput placeholder="Carb" keyboardType="numeric" placeholderTextColor={colors.textSecondary} value={customFood.carbs} onChangeText={(v) => setCustomFood(p => ({ ...p, carbs: v }))} style={[styles.customInputSmall, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} />
                                    <TextInput placeholder="Fat" keyboardType="numeric" placeholderTextColor={colors.textSecondary} value={customFood.fats} onChangeText={(v) => setCustomFood(p => ({ ...p, fats: v }))} style={[styles.customInputSmall, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} />
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
                                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                        {activeTab === 'favorites' ? 'No favorites yet. Browse to add some!' : 'No foods found.'}
                                    </Text>
                                </View>
                            ) : (
                                filteredFoods.map(food => (
                                    <TouchableOpacity
                                        key={food.id}
                                        onPress={() => addFoodToMeal(food)}
                                        style={[styles.foodListItem, { backgroundColor: colors.surface }]}
                                    >
                                        <View style={styles.foodListInfo}>
                                            <Text style={[styles.foodListName, { color: colors.text }]}>{food.name}</Text>
                                            <Text style={[styles.foodListCal, { color: colors.textSecondary }]}>{food.calories} cal</Text>
                                        </View>
                                        <View style={styles.foodListActions}>
                                            <TouchableOpacity onPress={() => toggleFavorite(food.id)} style={styles.favBtn}>
                                                <Heart
                                                    size={16}
                                                    color={favorites.includes(food.id) ? '#EF4444' : colors.textSecondary}
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
        paddingHorizontal: 16,
    },
    headerCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 20,
        marginBottom: 16,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 1,
    },
    headerSubtitle: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1,
        marginTop: 2,
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    calorieValue: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -1,
    },
    calorieTarget: {
        fontSize: 14,
        fontWeight: '500',
    },
    progressBar: {
        width: 120,
        height: 6,
        borderRadius: 3,
        marginTop: 8,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    mealTabsContainer: {
        marginBottom: 16,
    },
    mealTab: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginRight: 8,
    },
    mealTabText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    mealCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        marginBottom: 16,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyIcon: {
        fontSize: 40,
        marginBottom: 12,
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
        borderBottomWidth: 1,
    },
    foodInfo: {
        flex: 1,
    },
    foodName: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 4,
    },
    macroRow: {
        flexDirection: 'row',
        gap: 12,
    },
    macroText: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    deleteBtn: {
        padding: 8,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderWidth: 1,
        borderRadius: 12,
        marginTop: 12,
        borderStyle: 'dashed',
    },
    addButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    macroCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 20,
        marginBottom: 16,
    },
    macroCardTitle: {
        fontSize: 10,
        fontWeight: '700',
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
        fontWeight: '600',
    },
    macroBarValue: {
        fontSize: 13,
        fontWeight: '600',
    },
    macroProgressBar: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    macroProgressFill: {
        height: '100%',
        borderRadius: 4,
    },
    hydrationCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 20,
        marginBottom: 32,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    hydrationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    hydrationLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    hydrationValue: {
        fontSize: 24,
        fontWeight: '800',
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
        borderRadius: 20,
    },
    hydrationBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#000',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
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
        fontWeight: '800',
    },
    tabToggle: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    tabBtnText: {
        fontSize: 12,
        fontWeight: '700',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
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
        borderWidth: 1,
        borderRadius: 12,
        borderStyle: 'dashed',
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
        borderRadius: 10,
        borderWidth: 1,
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
        borderRadius: 10,
        borderWidth: 1,
        fontSize: 14,
        textAlign: 'center',
    },
    customAddBtn: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    customAddBtnText: {
        fontSize: 14,
        fontWeight: '700',
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
        padding: 14,
        borderRadius: 14,
        marginBottom: 8,
    },
    foodListInfo: {
        flex: 1,
    },
    foodListName: {
        fontSize: 14,
        fontWeight: '700',
    },
    foodListCal: {
        fontSize: 11,
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
