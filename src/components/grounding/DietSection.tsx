"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { Plus, Trash2, Pencil, Droplet, Activity, Flame, Save, X, Bookmark, Search, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { GENERIC_FOODS, GenericFood } from "@/lib/foodData";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface FoodItem {
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
}

interface SavedFood {
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

export default function DietSection() {
    // 1. Fetching Data
    const { data: profileData } = useSWR("/api/grounding/health", fetcher);
    const { data: logData, mutate: mutateLog } = useSWR("/api/grounding/diet", fetcher);
    const { data: biometricData, mutate: mutateBiometrics } = useSWR("/api/grounding/health/biometrics", fetcher);
    const { data: savedFoodsData, mutate: mutateSavedFoods } = useSWR<SavedFood[]>("/api/grounding/diet/saved", fetcher);

    // 2. State
    const [meals, setMeals] = useState<MealLog>({ breakfast: [], lunch: [], dinner: [], snacks: [] });
    const [activeMeal, setActiveMeal] = useState<keyof MealLog>("breakfast");
    const [isAdding, setIsAdding] = useState(false);

    // Quick Add State
    const [quickAddTab, setQuickAddTab] = useState<"favorites" | "browse">("favorites");
    const [searchQuery, setSearchQuery] = useState("");

    // Edit/Manage Mode State
    const [editingItem, setEditingItem] = useState<{ id: string; meal: keyof MealLog } | null>(null);
    const [savedFoodToEdit, setSavedFoodToEdit] = useState<SavedFood | null>(null);
    const [isCreatingSaved, setIsCreatingSaved] = useState(false);

    // Form State
    const [newItem, setNewItem] = useState({ name: "", calories: "", protein: "", carbs: "", fats: "" });

    // 3. Sync Log Data
    useEffect(() => {
        if (logData && logData.meals) {
            setMeals({
                breakfast: logData.meals.breakfast || [],
                lunch: logData.meals.lunch || [],
                dinner: logData.meals.dinner || [],
                snacks: logData.meals.snacks || [],
            });
        }
    }, [logData]);

    // 4. Calculations
    const todayBiometric = useMemo(() => {
        if (!Array.isArray(biometricData)) return null;
        const today = new Date().toDateString();
        return biometricData.find((l: any) => new Date(l.date).toDateString() === today);
    }, [biometricData]);

    const currentHydration = todayBiometric?.hydration || 0;
    const currentWeight = todayBiometric?.weight || (profileData?.profile?.weight ? parseFloat(profileData.profile.weight) : 0);

    const targets = useMemo(() => {
        if (!profileData?.profile) return { calories: 2000, protein: 150, carbs: 250, fats: 70 };
        const { gender, height, weight, dob } = profileData.profile;
        let w = parseFloat(weight) || 70;
        let h = 170; // fallback
        if (height) {
            const match = height.match(/(\d+)/);
            if (match) h = parseInt(match[0]);
        }
        let age = 30;
        if (dob) age = new Date().getFullYear() - new Date(dob).getFullYear();

        // BMR (Mifflin-St Jeor)
        let bmr = 10 * w + 6.25 * h - 5 * age + (gender === "Female" ? -161 : 5);
        let tdee = bmr * 1.2;

        return {
            calories: Math.round(tdee),
            protein: Math.round(w * 2), // 2g/kg
            carbs: Math.round((tdee * 0.4) / 4),
            fats: Math.round((tdee * 0.3) / 9),
        }
    }, [profileData]);

    const totals = useMemo(() => {
        let c = 0, p = 0, ca = 0, f = 0;
        Object.values(meals).flat().forEach((m: any) => {
            c += (m.calories || 0);
            p += (m.protein || 0);
            ca += (m.carbs || 0);
            f += (m.fats || 0);
        });
        return { calories: c, protein: p, carbs: ca, fats: f };
    }, [meals]);

    // Filtered Lists
    const filteredSaved = useMemo(() => {
        if (!savedFoodsData) return [];
        return savedFoodsData.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [savedFoodsData, searchQuery]);

    const filteredGeneric = useMemo(() => {
        return GENERIC_FOODS.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [searchQuery]);


    // 5. Actions: Daily Log
    const handleSaveLogItem = async () => {
        if (!newItem.name) return;

        const itemPayload: FoodItem = {
            id: editingItem ? editingItem.id : Date.now().toString(),
            name: newItem.name,
            calories: parseInt(newItem.calories) || 0,
            protein: parseInt(newItem.protein) || 0,
            carbs: parseInt(newItem.carbs) || 0,
            fats: parseInt(newItem.fats) || 0,
        };

        let updatedMeals = { ...meals };
        if (editingItem) {
            updatedMeals[editingItem.meal] = updatedMeals[editingItem.meal].map(x => x.id === editingItem.id ? itemPayload : x);
        } else {
            updatedMeals[activeMeal] = [...updatedMeals[activeMeal], itemPayload];
        }

        setMeals(updatedMeals);
        setNewItem({ name: "", calories: "", protein: "", carbs: "", fats: "" });
        setIsAdding(false);
        setEditingItem(null);
        saveLog(updatedMeals);
    };

    const handleEditLogItem = (item: FoodItem, meal: keyof MealLog) => {
        setNewItem({
            name: item.name,
            calories: item.calories.toString(),
            protein: item.protein.toString(),
            carbs: item.carbs.toString(),
            fats: item.fats.toString(),
        });
        setEditingItem({ id: item.id, meal });
        setActiveMeal(meal);
        setIsAdding(true);
        setIsCreatingSaved(false); setSavedFoodToEdit(null);
    };

    const removeLogItem = async (meal: keyof MealLog, id: string) => {
        if (confirm("Delete from today's log?")) {
            const updatedMeals = {
                ...meals,
                [meal]: meals[meal].filter(x => x.id !== id)
            };
            setMeals(updatedMeals);
            saveLog(updatedMeals);
        }
    };

    const saveLog = async (currentMeals: MealLog) => {
        let c = 0, p = 0, ca = 0, f = 0;
        Object.values(currentMeals).flat().forEach((m: any) => {
            c += (m.calories || 0);
            p += (m.protein || 0);
            ca += (m.carbs || 0);
            f += (m.fats || 0);
        });

        await fetch("/api/grounding/diet", {
            method: "POST",
            body: JSON.stringify({
                meals: currentMeals,
                calories: c,
                protein: p,
                carbs: ca,
                fats: f
            })
        });
        mutateLog();
    };

    // 6. Actions: Saved Foods / Favorites
    const handleSaveQuickAdd = async () => {
        if (!newItem.name) return;
        const payload = {
            name: newItem.name,
            calories: newItem.calories || 0,
            protein: newItem.protein || 0,
            carbs: newItem.carbs || 0,
            fats: newItem.fats || 0
        };

        if (savedFoodToEdit) {
            await fetch("/api/grounding/diet/saved", {
                method: "PUT",
                body: JSON.stringify({ ...payload, id: savedFoodToEdit.id })
            });
        } else {
            await fetch("/api/grounding/diet/saved", {
                method: "POST",
                body: JSON.stringify(payload)
            });
        }
        mutateSavedFoods();
        setNewItem({ name: "", calories: "", protein: "", carbs: "", fats: "" });
        setIsCreatingSaved(false); setSavedFoodToEdit(null); setIsAdding(false);
    };

    const handleDeleteSavedFood = async (id: string, confirmDel = true) => {
        if (!confirmDel || confirm("Remove from Favorites?")) {
            await fetch(`/api/grounding/diet/saved?id=${id}`, { method: "DELETE" });
            mutateSavedFoods();
        }
    };

    const toggleFavorite = async (food: GenericFood) => {
        // Check if already in favorites
        const existing = savedFoodsData?.find(f => f.name === food.name);
        if (existing) {
            handleDeleteSavedFood(existing.id, false); // Remove without confirmation
        } else {
            // Add to favorites
            await fetch("/api/grounding/diet/saved", {
                method: "POST",
                body: JSON.stringify(food)
            });
            mutateSavedFoods();
        }
    }

    const openCreateSavedFood = () => {
        setNewItem({ name: "", calories: "", protein: "", carbs: "", fats: "" });
        setIsCreatingSaved(true);
        setSavedFoodToEdit(null);
        setEditingItem(null);
        setIsAdding(true);
    };

    const openEditSavedFood = (item: SavedFood) => {
        setNewItem({
            name: item.name,
            calories: item.calories.toString(),
            protein: item.protein.toString(),
            carbs: item.carbs.toString(),
            fats: item.fats.toString()
        });
        setSavedFoodToEdit(item);
        setIsCreatingSaved(true);
        setEditingItem(null);
        setIsAdding(true);
    };


    // 7. Misc Actions
    const addHydration = async (amount: number) => {
        const newVal = currentHydration + amount;
        await fetch("/api/grounding/health/biometrics", {
            method: "POST",
            body: JSON.stringify({ hydration: newVal, date: new Date() })
        });
        mutateBiometrics();
    };

    const logQuickAddItem = (saved: SavedFood | GenericFood) => {
        const item: FoodItem = {
            id: Date.now().toString(),
            name: saved.name,
            calories: saved.calories,
            protein: saved.protein,
            carbs: saved.carbs,
            fats: saved.fats
        };
        const updatedMeals = {
            ...meals,
            [activeMeal]: [...meals[activeMeal], item]
        };
        setMeals(updatedMeals);
        saveLog(updatedMeals);
    };

    const getProgress = (current: number, target: number) => Math.min(100, Math.round((current / target) * 100));

    return (
        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-8 h-full">
            {/* LEFT: Main Tracker */}
            <div className="bg-neutral-900/50 border border-white/10 rounded-3xl p-6 flex flex-col relative overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 z-10 relative">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500">
                            <Flame size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-tight">Daily Fuel</h3>
                            <div className="text-xs text-gray-500 font-mono">NET CALORIES</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black text-white tracking-tighter">{totals.calories} <span className="text-sm font-medium text-gray-500">/ {targets.calories}</span></div>
                        <div className="h-1.5 w-32 bg-white/10 rounded-full mt-2 ml-auto overflow-hidden">
                            <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${getProgress(totals.calories, targets.calories)}%` }} />
                        </div>
                    </div>
                </div>

                {/* Meal Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                    {(["breakfast", "lunch", "dinner", "snacks"] as const).map(m => (
                        <button key={m} onClick={() => { setActiveMeal(m); setIsAdding(false); }} className={cn("px-5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap border", activeMeal === m ? "bg-white text-black border-white" : "bg-transparent text-gray-400 border-white/10 hover:border-white/30 hover:text-white")}>
                            {m}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto min-h-[300px] mb-4 pr-1 custom-scrollbar space-y-2">
                    {/* Log List */}
                    {meals[activeMeal].length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-600 border-2 border-dashed border-white/5 rounded-2xl">
                            <span className="text-3xl mb-3 opacity-30">🍽️</span>
                            <p className="text-sm font-medium">No items logged for {activeMeal} yet.</p>
                        </div>
                    ) : (
                        meals[activeMeal].map((item) => (
                            <div key={item.id} className="group flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all">
                                <div>
                                    <div className="font-bold text-white text-sm">{item.name}</div>
                                    <div className="text-[10px] uppercase tracking-wider text-gray-500 flex gap-3 mt-1.5 ">
                                        <span className="text-orange-400 font-bold">{item.calories} KCAL</span>
                                        <span>P: {item.protein}g</span>
                                        <span>C: {item.carbs}g</span>
                                        <span>F: {item.fats}g</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEditLogItem(item, activeMeal)} className="p-2 hover:bg-blue-500/20 hover:text-blue-400 text-gray-500 rounded-lg transition-colors"><Pencil size={14} /></button>
                                    <button onClick={() => removeLogItem(activeMeal, item.id)} className="p-2 hover:bg-red-500/20 hover:text-red-400 text-gray-500 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Shared Form */}
                <div className="mt-auto pt-4 border-t border-white/10">
                    {isAdding ? (
                        <div className="bg-neutral-900 border border-white/20 rounded-2xl p-5 animate-in slide-in-from-bottom-2 shadow-2xl">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-white font-bold text-sm flex items-center gap-2">
                                    {isCreatingSaved ? <Bookmark size={16} className="text-blue-400" /> : null}
                                    {isCreatingSaved ? (savedFoodToEdit ? "Edit Favorite" : "New Favorite") : (editingItem ? "Edit Logged Item" : "Log Custom Item")}
                                </h4>
                                <button onClick={() => { setIsAdding(false); setEditingItem(null); setIsCreatingSaved(false); setSavedFoodToEdit(null); }} className="text-gray-500 hover:text-white"><X size={16} /></button>
                            </div>

                            <input
                                placeholder="Food Name"
                                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white outline-none mb-3 focus:border-white/50 transition-colors text-sm"
                                value={newItem.name}
                                onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                autoFocus
                            />
                            <div className="grid grid-cols-4 gap-2 mb-4">
                                <MacroInput label="Cal" val={newItem.calories} set={v => setNewItem({ ...newItem, calories: v })} />
                                <MacroInput label="Prot" val={newItem.protein} set={v => setNewItem({ ...newItem, protein: v })} />
                                <MacroInput label="Carb" val={newItem.carbs} set={v => setNewItem({ ...newItem, carbs: v })} />
                                <MacroInput label="Fat" val={newItem.fats} set={v => setNewItem({ ...newItem, fats: v })} />
                            </div>

                            {isCreatingSaved ? (
                                <button onClick={handleSaveQuickAdd} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-sm">
                                    <Save size={16} /> {savedFoodToEdit ? "Update Favorite" : "Save Favorite"}
                                </button>
                            ) : (
                                <button onClick={handleSaveLogItem} className="w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm">
                                    <Save size={16} /> {editingItem ? "Save Changes" : "Log to Daily"}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setNewItem({ name: "", calories: "", protein: "", carbs: "", fats: "" });
                                    setIsAdding(true);
                                    setIsCreatingSaved(false);
                                }}
                                className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-300 font-bold transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                <Plus size={16} /> Log Custom
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: Biometrics & Stats */}
            <div className="space-y-6 flex flex-col h-full">

                {/* 1. Biometrics Link Card */}
                <div className="bg-gradient-to-br from-blue-900/40 to-neutral-900/50 border border-white/10 rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-blue-500/20 rounded-lg text-blue-400">
                            <Activity size={20} />
                        </div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">Bio-Link</h4>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-black/20 rounded-xl p-4 flex items-center justify-between border border-white/5">
                            <div className="flex items-center gap-3">
                                <Droplet className="text-blue-400" size={18} fill="currentColor" fillOpacity={0.5} />
                                <div>
                                    <div className="text-xs text-blue-300 font-bold uppercase">Hydration</div>
                                    <div className="text-xl font-bold text-white">{currentHydration} <span className="text-sm text-gray-500">ml</span></div>
                                </div>
                            </div>
                            <button onClick={() => addHydration(250)} className="h-8 w-8 rounded-full bg-blue-500 hover:bg-blue-400 text-black flex items-center justify-center transition-colors"><Plus size={16} /></button>
                        </div>

                        <div className="bg-black/20 rounded-xl p-4 flex items-center justify-between border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="text-gray-400 font-mono text-sm">⚖️</div>
                                <div>
                                    <div className="text-xs text-gray-400 font-bold uppercase">Current Weight</div>
                                    <div className="text-xl font-bold text-white">{currentWeight || "--"} <span className="text-sm text-gray-500">kg</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Macro Detail */}
                <div className="bg-neutral-900/50 border border-white/10 rounded-3xl p-6">
                    <h4 className="text-gray-500 font-bold mb-5 uppercase text-[10px] tracking-widest">Target Macros</h4>
                    <div className="space-y-5">
                        <MacroBar label="Protein" current={totals.protein} target={targets.protein} color="bg-blue-500" />
                        <MacroBar label="Carbs" current={totals.carbs} target={targets.carbs} color="bg-green-500" />
                        <MacroBar label="Fats" current={totals.fats} target={targets.fats} color="bg-yellow-500" />
                    </div>
                </div>

                {/* 3. Quick Add / Search / Favorites */}
                <div className="bg-neutral-900/50 border border-white/10 rounded-3xl p-6 flex-1 flex flex-col min-h-[400px]">

                    {/* Tabs & Search */}
                    <div className="flex flex-col gap-3 mb-4">
                        <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/5">
                            <button
                                onClick={() => setQuickAddTab("favorites")}
                                className={cn("flex-1 py-1.5 text-xs font-bold rounded-lg transition-all", quickAddTab === "favorites" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300")}
                            >
                                Favorites
                            </button>
                            <button
                                onClick={() => setQuickAddTab("browse")}
                                className={cn("flex-1 py-1.5 text-xs font-bold rounded-lg transition-all", quickAddTab === "browse" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300")}
                            >
                                Browse
                            </button>
                        </div>

                        <div className="relative group">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" />
                            <input
                                className="w-full bg-black/20 border border-white/5 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white outline-none focus:border-white/20 transition-all placeholder:text-gray-600"
                                placeholder="Search foods..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {quickAddTab === "favorites" && (
                            <button onClick={openCreateSavedFood} className="text-[10px] font-bold bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 w-full border border-white/5 hover:border-white/20">
                                <Plus size={12} /> Add Custom Favorite
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[350px] custom-scrollbar pr-1 flex-1">
                        {quickAddTab === "favorites" ? (
                            filteredSaved.length > 0 ? (
                                filteredSaved.map((food) => (
                                    <QuickAddItem
                                        key={food.id}
                                        item={food}
                                        isFavorite={true}
                                        onAdd={() => logQuickAddItem(food)}
                                        onEdit={() => openEditSavedFood(food)}
                                        onDelete={() => handleDeleteSavedFood(food.id)}
                                        onToggleFav={() => handleDeleteSavedFood(food.id, true)}
                                    />
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-2 opacity-60">
                                    <Bookmark size={24} />
                                    <div className="text-xs text-center">No favorites yet.<br />Search in "Browse" to add some!</div>
                                </div>
                            )
                        ) : (
                            filteredGeneric.map((food, idx) => {
                                const isFav = savedFoodsData?.some(s => s.name === food.name);
                                return (
                                    <QuickAddItem
                                        key={idx}
                                        item={food}
                                        isFavorite={!!isFav}
                                        emoji={(food as GenericFood).emoji}
                                        onAdd={() => logQuickAddItem(food)}
                                        onToggleFav={() => toggleFavorite(food)}
                                    />
                                )
                            })
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

function MacroInput({ label, val, set }: { label: string, val: string, set: (v: string) => void }) {
    return (
        <div className="bg-black/30 rounded-xl p-2 border border-white/5 focus-within:border-white/30 transition-colors">
            <div className="text-[9px] text-gray-500 uppercase font-bold mb-1 text-center">{label}</div>
            <input type="number" className="w-full bg-transparent text-center text-white text-sm outline-none font-mono" value={val} onChange={e => set(e.target.value)} />
        </div>
    )
}

function MacroBar({ label, current, target, color }: { label: string, current: number, target: number, color: string }) {
    const pct = Math.min(100, Math.round((current / target) * 100));
    return (
        <div>
            <div className="flex justify-between text-xs mb-2 font-medium">
                <span className="text-gray-300">{label}</span>
                <span className="text-white">{current} <span className="text-gray-600">/</span> {target}g</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className={cn("h-full transition-all duration-500 rounded-full", color)} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

interface QuickAddItemProps {
    item: SavedFood | GenericFood;
    emoji?: string;
    isFavorite: boolean;
    onAdd: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onToggleFav: () => void;
}

function QuickAddItem({ item, emoji, isFavorite, onAdd, onEdit, onDelete, onToggleFav }: QuickAddItemProps) {
    return (
        <div className="w-full p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 text-left transition-all flex justify-between items-center group relative cursor-pointer" onClick={onAdd}>
            <div className="flex-1 flex items-center gap-3">
                {emoji && <span className="text-lg">{emoji}</span>}
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-200">{item.name}</span>
                    <span className="text-[10px] text-gray-500">{item.calories} cal</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                {/* Heart Logic */}
                <button
                    onClick={onToggleFav}
                    className={cn("p-2 rounded-lg transition-colors", isFavorite ? "text-red-500 hover:text-red-400" : "text-gray-600 hover:text-gray-300")}
                    title={isFavorite ? "Remove Favorite" : "Add to Favorites"}
                >
                    <Heart size={14} fill={isFavorite ? "currentColor" : "none"} />
                </button>

                {/* Edit/Delete if Custom Favorite */}
                {onEdit && onDelete && (
                    <div className="flex gap-1 pl-1 border-l border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={onEdit} className="p-2 hover:bg-blue-500/20 hover:text-blue-400 text-gray-500 rounded-lg transition-colors"><Pencil size={14} /></button>
                        <button onClick={onDelete} className="p-2 hover:bg-red-500/20 hover:text-red-400 text-gray-500 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                )}

                {/* Log Button Visual */}
                <div className="h-7 w-7 rounded-full bg-white/5 hover:bg-white text-white hover:text-black flex items-center justify-center transition-colors ml-1" onClick={onAdd}>
                    <Plus size={14} strokeWidth={3} />
                </div>
            </div>
        </div>
    )
}
