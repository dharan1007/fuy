import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../context/ThemeContext';
import { Activity, Flame, Users, ArrowUp, Zap, MapPin, Plus } from 'lucide-react-native';

interface ActivityMetrics {
    distance: number;
    duration: number; // hours
    calories: number;
    elevation: number;
    speed: number;
}

interface TogetherBurnUser {
    id: string;
    name: string;
    caloriesBurned: number;
}

export default function ActivityView() {
    const { colors, mode } = useTheme();
    const isDark = mode === 'dark';
    const [activityType, setActivityType] = useState<'walk' | 'run' | 'bike'>('run');

    // --- Together Burn State ---
    const [friends, setFriends] = useState<TogetherBurnUser[]>([]);
    const [newFriendName, setNewFriendName] = useState("");
    const [newFriendCals, setNewFriendCals] = useState("");

    // --- Mock Metrics (would come from sensors/backend) ---
    const metrics: Record<typeof activityType, ActivityMetrics> = {
        walk: { distance: 3.2, duration: 0.8, calories: 240, elevation: 45, speed: 4.0 },
        run: { distance: 8.5, duration: 0.9, calories: 720, elevation: 120, speed: 9.4 },
        bike: { distance: 24.0, duration: 1.2, calories: 550, elevation: 340, speed: 20.0 },
    };
    const current = metrics[activityType];
    const totalGroupBurn = friends.reduce((acc, curr) => acc + curr.caloriesBurned, 0);

    const addFriend = () => {
        if (!newFriendName || !newFriendCals) return;
        setFriends([...friends, {
            id: Date.now().toString(),
            name: newFriendName,
            caloriesBurned: Number(newFriendCals) || 0
        }]);
        setNewFriendName("");
        setNewFriendCals("");
    };

    return (
        <View className="px-6 space-y-6">
            {/* Activity Type Selector */}
            <View className="flex-row gap-2">
                {(['walk', 'run', 'bike'] as const).map(t => (
                    <TouchableOpacity
                        key={t}
                        onPress={() => setActivityType(t)}
                        className={`flex-1 py-3 rounded-xl items-center border ${activityType === t ? 'bg-blue-500 border-blue-500' : (isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10')}`}
                    >
                        <Text style={{ color: activityType === t ? 'white' : colors.text }} className="font-bold capitalize">{t}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Metrics Grid */}
            <View className="flex-row flex-wrap justify-between gap-y-4">
                <BlurView intensity={20} tint={isDark ? "dark" : "light"} className={`w-[48%] p-4 rounded-2xl border ${isDark ? 'border-white/10' : 'border-black/5'}`}>
                    <View className="flex-row items-center gap-2 mb-1 opacity-60">
                        <MapPin size={14} color={colors.text} />
                        <Text style={{ color: colors.text }} className="text-xs font-bold uppercase">Distance</Text>
                    </View>
                    <Text style={{ color: colors.text }} className="text-2xl font-bold">{current.distance} <Text className="text-sm font-normal">km</Text></Text>
                </BlurView>
                <BlurView intensity={20} tint={isDark ? "dark" : "light"} className={`w-[48%] p-4 rounded-2xl border ${isDark ? 'border-white/10' : 'border-black/5'}`}>
                    <View className="flex-row items-center gap-2 mb-1 opacity-60">
                        <Flame size={14} color="#f97316" />
                        <Text style={{ color: colors.text }} className="text-xs font-bold uppercase">Calories</Text>
                    </View>
                    <Text style={{ color: colors.text }} className="text-2xl font-bold">{current.calories} <Text className="text-sm font-normal">kcal</Text></Text>
                </BlurView>
                <BlurView intensity={20} tint={isDark ? "dark" : "light"} className={`w-[48%] p-4 rounded-2xl border ${isDark ? 'border-white/10' : 'border-black/5'}`}>
                    <View className="flex-row items-center gap-2 mb-1 opacity-60">
                        <Zap size={14} color={colors.text} />
                        <Text style={{ color: colors.text }} className="text-xs font-bold uppercase">Avg Speed</Text>
                    </View>
                    <Text style={{ color: colors.text }} className="text-2xl font-bold">{current.speed} <Text className="text-sm font-normal">km/h</Text></Text>
                </BlurView>
                <BlurView intensity={20} tint={isDark ? "dark" : "light"} className={`w-[48%] p-4 rounded-2xl border ${isDark ? 'border-white/10' : 'border-black/5'}`}>
                    <View className="flex-row items-center gap-2 mb-1 opacity-60">
                        <ArrowUp size={14} color={colors.text} />
                        <Text style={{ color: colors.text }} className="text-xs font-bold uppercase">Elevation</Text>
                    </View>
                    <Text style={{ color: colors.text }} className="text-2xl font-bold">{current.elevation} <Text className="text-sm font-normal">m</Text></Text>
                </BlurView>
            </View>

            {/* Together Burn Section */}
            <View className={`rounded-3xl p-6 ${isDark ? 'bg-purple-900/20' : 'bg-purple-100'}`}>
                <View className="flex-row items-center gap-2 mb-4">
                    <Users size={24} color={colors.accent} />
                    <Text style={{ color: colors.text }} className="text-xl font-bold">Together Burn</Text>
                </View>

                <View className="items-center mb-6">
                    <Text style={{ color: colors.text }} className="opacity-60 text-xs uppercase font-bold tracking-widest">Total Group Energy</Text>
                    <Text className="text-5xl font-bold text-purple-500">{totalGroupBurn} <Text className="text-lg">kcal</Text></Text>
                </View>

                {/* Add Friend Form */}
                <View className="flex-row gap-2 mb-4">
                    <TextInput
                        placeholder="Name"
                        placeholderTextColor={colors.text + '80'}
                        value={newFriendName}
                        onChangeText={setNewFriendName}
                        className={`flex-1 p-2 rounded-lg ${isDark ? 'bg-black/20 text-white' : 'bg-white text-black'}`}
                    />
                    <TextInput
                        placeholder="Kcal"
                        placeholderTextColor={colors.text + '80'}
                        value={newFriendCals}
                        onChangeText={setNewFriendCals}
                        keyboardType="numeric"
                        className={`w-20 p-2 rounded-lg ${isDark ? 'bg-black/20 text-white' : 'bg-white text-black'}`}
                    />
                    <TouchableOpacity onPress={addFriend} className="bg-purple-500 px-3 justify-center rounded-lg">
                        <Plus size={20} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Friends List */}
                <View className="space-y-2">
                    {friends.map(f => (
                        <View key={f.id} className={`flex-row justify-between p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white/40 border-black/5'}`}>
                            <Text style={{ color: colors.text }} className="font-bold">{f.name}</Text>
                            <Text className="text-purple-500 font-bold">{f.caloriesBurned} kcal</Text>
                        </View>
                    ))}
                    {friends.length === 0 && (
                        <Text style={{ color: colors.text }} className="text-center opacity-40 text-sm">Add friends to complete the challenge!</Text>
                    )}
                </View>
            </View>
        </View>
    );
}
