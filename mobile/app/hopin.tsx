import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Map, Calendar, MapPin, Plus } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

interface Plan {
    id: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    location: string;
    imageUrl?: string;
}

export default function HopinScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const [myPlans, setMyPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'MY_PLANS' | 'EXPLORE'>('MY_PLANS');

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch My Plans
            const { data, error } = await supabase
                .from('PlanMember')
                .select('plan:Plan(*)')
                .eq('userId', user.id);

            if (data) {
                const plans = data.map((d: any) => d.plan).filter(Boolean);
                setMyPlans(plans);
            }
        } catch (error) {
            console.error("Error fetching plans:", error);
        } finally {
            setLoading(false);
        }
    };

    const getGradientColors = (): [string, string, string] => {
        return mode === 'light' ? ['#ffffff', '#f8f9fa', '#e9ecef'] :
            mode === 'eye-care' ? ['#F5E6D3', '#E6D5C0', '#DBC4A0'] :
                ['#000000', '#0a0a0a', '#171717'];
    };

    const formatDate = (dateString: string, includeYear = false) => {
        const d = new Date(dateString);
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: includeYear ? 'numeric' : undefined
        });
    };

    const renderPlanItem = ({ item }: { item: Plan }) => (
        <TouchableOpacity
            className="mb-4 rounded-xl overflow-hidden shadow-sm"
            style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
            onPress={() => console.log('Open Plan', item.id)}
        >
            <View className="h-32 bg-gray-200 relative">
                {/* Placeholder for Plan Image - could be map snapshot or upload */}
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} className="absolute inset-0 z-10" />
                <Image
                    source={{ uri: item.imageUrl || `https://source.unsplash.com/random/800x600?travel&sig=${item.id}` }}
                    className="w-full h-full"
                    resizeMode="cover"
                />
                <View className="absolute bottom-3 left-4 z-20">
                    <Text className="text-white font-bold text-lg">{item.title}</Text>
                </View>
            </View>
            <View className="p-4">
                <View className="flex-row items-center mb-2">
                    <Calendar size={14} color={colors.secondary} />
                    <Text className="ml-2 text-xs" style={{ color: colors.secondary }}>
                        {formatDate(item.startDate)} - {formatDate(item.endDate, true)}
                    </Text>
                </View>
                <View className="flex-row items-center">
                    <MapPin size={14} color={colors.secondary} />
                    <Text className="ml-2 text-xs" style={{ color: colors.secondary }}>{item.location}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <LinearGradient colors={getGradientColors()} className="flex-1">
            <SafeAreaView className="flex-1 px-6">
                {/* Header */}
                <View className="flex-row items-center justify-between py-4">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full bg-gray-200/20">
                        <ChevronLeft color={colors.text} size={24} />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold" style={{ color: colors.text }}>Hopin</Text>
                    <TouchableOpacity className="p-2 rounded-full bg-blue-500">
                        <Plus color="white" size={20} />
                    </TouchableOpacity>
                </View>

                {/* Tabs */}
                <View className="flex-row mb-6 bg-gray-100/50 p-1 rounded-xl" style={{ backgroundColor: colors.card }}>
                    <TouchableOpacity
                        className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'MY_PLANS' ? 'bg-white shadow-sm' : ''}`}
                        style={activeTab === 'MY_PLANS' ? { backgroundColor: colors.background } : {}}
                        onPress={() => setActiveTab('MY_PLANS')}
                    >
                        <Text className={`font-bold ${activeTab === 'MY_PLANS' ? 'text-blue-500' : 'text-gray-500'}`}>My Plans</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'EXPLORE' ? 'bg-white shadow-sm' : ''}`}
                        style={activeTab === 'EXPLORE' ? { backgroundColor: colors.background } : {}}
                        onPress={() => setActiveTab('EXPLORE')}
                    >
                        <Text className={`font-bold ${activeTab === 'EXPLORE' ? 'text-blue-500' : 'text-gray-500'}`}>Explore</Text>
                    </TouchableOpacity>
                </View>

                {/* Content */}
                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator color={colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={myPlans} // For now only My Plans logic is hooked up fully
                        renderItem={renderPlanItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        ListEmptyComponent={
                            <View className="flex-1 items-center justify-center py-20">
                                <View className="p-6 rounded-full bg-blue-500/10 mb-6">
                                    <Map size={48} color={colors.primary} />
                                </View>
                                <Text className="text-lg font-bold mb-2" style={{ color: colors.text }}>No plans yet</Text>
                                <Text className="text-center opacity-70" style={{ color: colors.secondary }}>
                                    Start planning your next adventure!
                                </Text>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </LinearGradient>
    );
}
