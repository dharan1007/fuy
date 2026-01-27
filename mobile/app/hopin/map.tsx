import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    FlatList,
    Dimensions,
    StyleSheet
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import {
    ChevronLeft,
    Plus,
    Map as MapIcon,
    MapPin,
    Calendar,
    List,
    Grid
} from 'lucide-react-native';
import HopinService, { Plan } from '../../services/HopinService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Monochrome palette
const MONO = {
    black: '#000000',
    white: '#FFFFFF',
    gray100: '#F8F8F8',
    gray200: '#E8E8E8',
    gray300: '#D0D0D0',
    gray400: '#A0A0A0',
    gray500: '#707070',
    gray600: '#505050',
    gray700: '#303030',
    gray800: '#1A1A1A',
    gray900: '#0A0A0A',
};

// NOTE: To enable full interactive map functionality, install:
// npx expo install react-native-maps expo-location

export default function HopinMapScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();

    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const isDark = mode === 'dark';
    const bg = isDark ? MONO.gray900 : MONO.white;
    const cardBg = isDark ? MONO.gray800 : MONO.gray100;
    const textPrimary = isDark ? MONO.white : MONO.black;
    const textSecondary = isDark ? MONO.gray400 : MONO.gray600;
    const accent = isDark ? MONO.white : MONO.black;

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const data = await HopinService.fetchPublicPlans();
            setPlans(data);
        } catch (error) {
            console.error('Error fetching plans:', error);
        } finally {
            setLoading(false);
        }
    };

    const getMediaUrl = (plan: Plan) => {
        if (plan.mediaUrls) {
            try {
                const urls = JSON.parse(plan.mediaUrls);
                if (urls.length > 0) return urls[0];
            } catch { }
        }
        return `https://picsum.photos/seed/${plan.id}/400/400`;
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return { day: '--', month: '---' };
        const d = new Date(dateString);
        return {
            day: d.getDate().toString().padStart(2, '0'),
            month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
        };
    };

    const GridCard = ({ plan }: { plan: Plan }) => {
        const dateInfo = formatDate(plan.date);
        return (
            <TouchableOpacity
                onPress={() => router.push(`/hopin/${plan.id}`)}
                className="mb-4 rounded-2xl overflow-hidden"
                style={{ width: (SCREEN_WIDTH - 52) / 2, aspectRatio: 0.85 }}
            >
                <Image source={{ uri: getMediaUrl(plan) }} className="absolute inset-0 w-full h-full" resizeMode="cover" />
                <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} />
                <View className="absolute top-3 left-3 items-center p-2 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}>
                    <Text style={[styles.fontCondensed, { fontSize: 18, color: MONO.black, lineHeight: 18 }]}>{dateInfo.day}</Text>
                    <Text style={[styles.fontMono, { fontSize: 8, color: MONO.gray600, letterSpacing: 1 }]}>{dateInfo.month}</Text>
                </View>
                <View className="absolute bottom-0 left-0 right-0 p-4">
                    <Text style={[styles.fontMono, { fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, marginBottom: 4 }]}>{plan.type}</Text>
                    <Text style={[styles.fontSerif, { fontSize: 16, color: MONO.white, lineHeight: 20 }]} numberOfLines={2}>{plan.title}</Text>
                    {plan.location && (
                        <View className="flex-row items-center mt-2">
                            <MapPin size={10} color="rgba(255,255,255,0.6)" />
                            <Text style={[styles.fontSans, { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginLeft: 4 }]} numberOfLines={1}>{plan.location}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const ListCard = ({ plan }: { plan: Plan }) => {
        const dateInfo = formatDate(plan.date);
        return (
            <TouchableOpacity
                onPress={() => router.push(`/hopin/${plan.id}`)}
                className="flex-row items-center py-4 mx-5"
                style={{ borderBottomWidth: 1, borderBottomColor: isDark ? MONO.gray800 : MONO.gray200 }}
            >
                <View className="w-14 items-center">
                    <Text style={[styles.fontCondensed, { fontSize: 24, color: textPrimary }]}>{dateInfo.day}</Text>
                    <Text style={[styles.fontMono, { fontSize: 9, color: textSecondary, letterSpacing: 1 }]}>{dateInfo.month}</Text>
                </View>
                <View className="flex-1 mx-4">
                    <Text style={[styles.fontMono, { fontSize: 9, color: textSecondary, letterSpacing: 2, marginBottom: 2 }]}>{plan.type}</Text>
                    <Text style={[styles.fontSerif, { fontSize: 18, color: textPrimary }]} numberOfLines={1}>{plan.title}</Text>
                    {plan.location && (
                        <View className="flex-row items-center mt-2">
                            <MapPin size={12} color={textSecondary} />
                            <Text style={[styles.fontSans, { fontSize: 12, color: textSecondary, marginLeft: 6 }]} numberOfLines={1}>{plan.location}</Text>
                        </View>
                    )}
                </View>
                <Image source={{ uri: getMediaUrl(plan) }} className="w-16 h-16 rounded-xl" resizeMode="cover" />
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: bg }}>
                <ActivityIndicator size="large" color={textPrimary} />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: bg }}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-4">
                <TouchableOpacity onPress={() => router.back()} className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: cardBg }}>
                    <ChevronLeft size={24} color={textPrimary} />
                </TouchableOpacity>
                <View className="items-center">
                    <Text style={[styles.fontMono, { fontSize: 10, color: textSecondary, letterSpacing: 3 }]}>NEARBY</Text>
                    <Text style={[styles.fontSerif, { fontSize: 24, color: textPrimary }]}>{plans.length} Events</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/hopin/create')} className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: accent }}>
                    <Plus size={22} color={isDark ? MONO.black : MONO.white} />
                </TouchableOpacity>
            </View>

            {/* View Toggle */}
            <View className="flex-row mx-5 mb-4 rounded-2xl overflow-hidden" style={{ backgroundColor: cardBg }}>
                <TouchableOpacity onPress={() => setViewMode('grid')} className="flex-1 flex-row items-center justify-center py-4" style={{ backgroundColor: viewMode === 'grid' ? accent : 'transparent' }}>
                    <Grid size={16} color={viewMode === 'grid' ? (isDark ? MONO.black : MONO.white) : textSecondary} />
                    <Text style={[styles.fontMono, { fontSize: 11, letterSpacing: 1, marginLeft: 8, color: viewMode === 'grid' ? (isDark ? MONO.black : MONO.white) : textSecondary }]}>GRID</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setViewMode('list')} className="flex-1 flex-row items-center justify-center py-4" style={{ backgroundColor: viewMode === 'list' ? accent : 'transparent' }}>
                    <List size={16} color={viewMode === 'list' ? (isDark ? MONO.black : MONO.white) : textSecondary} />
                    <Text style={[styles.fontMono, { fontSize: 11, letterSpacing: 1, marginLeft: 8, color: viewMode === 'list' ? (isDark ? MONO.black : MONO.white) : textSecondary }]}>LIST</Text>
                </TouchableOpacity>
            </View>

            {/* Map placeholder */}
            <View className="mx-5 mb-4 p-5 rounded-2xl items-center" style={{ backgroundColor: cardBg }}>
                <MapIcon size={32} color={textSecondary} />
                <Text style={[styles.fontSerif, { fontSize: 18, color: textPrimary, marginTop: 12 }]}>Map Coming Soon</Text>
                <Text style={[styles.fontSans, { fontSize: 12, color: textSecondary, textAlign: 'center', marginTop: 4 }]}>
                    Install react-native-maps for interactive map
                </Text>
            </View>

            {/* Events */}
            {viewMode === 'grid' ? (
                <FlatList
                    data={plans}
                    numColumns={2}
                    renderItem={({ item }) => <GridCard plan={item} />}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                    columnWrapperStyle={{ justifyContent: 'space-between' }}
                    ListEmptyComponent={
                        <View className="items-center py-20">
                            <Text style={[styles.fontSerif, { fontSize: 20, color: textPrimary }]}>No Events</Text>
                            <Text style={[styles.fontSans, { fontSize: 14, color: textSecondary, marginTop: 4 }]}>Check back soon</Text>
                        </View>
                    }
                />
            ) : (
                <FlatList
                    data={plans}
                    renderItem={({ item }) => <ListCard plan={item} />}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={
                        <View className="items-center py-20">
                            <Text style={[styles.fontSerif, { fontSize: 20, color: textPrimary }]}>No Events</Text>
                            <Text style={[styles.fontSans, { fontSize: 14, color: textSecondary, marginTop: 4 }]}>Check back soon</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

// Typography styles
const styles = StyleSheet.create({
    fontSerif: { fontFamily: 'System', fontWeight: '700' },
    fontSans: { fontFamily: 'System', fontWeight: '400' },
    fontMono: { fontFamily: 'System', fontWeight: '500' },
    fontCondensed: { fontFamily: 'System', fontWeight: '700' },
});
