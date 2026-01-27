import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { ShopService, Product, ShopAnalytics } from '../../../services/ShopService';
import { ArrowLeft, Eye, DollarSign, ShoppingCart, Package } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function InsightsScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();

    const [analytics, setAnalytics] = useState<ShopAnalytics | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('7d');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const isDark = mode === 'dark';
    const subtleText = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
    const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

    const fetchData = useCallback(async () => {
        try {
            const [analyticsData, productsData] = await Promise.all([
                ShopService.fetchStoreAnalytics(),
                ShopService.fetchUserProducts(),
            ]);
            setAnalytics(analyticsData);
            setProducts(productsData);
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const onRefresh = () => { setRefreshing(true); fetchData(); };

    // Generate simple chart data
    const chartData = Array.from({ length: 7 }, (_, i) => ({
        day: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i],
        value: Math.floor(Math.random() * 50 + 10),
    }));
    const maxValue = Math.max(...chartData.map(d => d.value), 1);

    // Stat Card
    const Stat = ({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) => (
        <View style={{ flex: 1, padding: 14, backgroundColor: cardBg, borderRadius: 12 }}>
            <Icon size={16} color={colors.text} />
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 8 }}>{value}</Text>
            <Text style={{ fontSize: 10, fontWeight: '600', color: subtleText, textTransform: 'uppercase', marginTop: 2 }}>{label}</Text>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12 }}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <ArrowLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Insights</Text>
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
                    showsVerticalScrollIndicator={false}
                >
                    {loading ? (
                        <View style={{ alignItems: 'center', paddingTop: 60 }}><ActivityIndicator color={colors.text} /></View>
                    ) : (
                        <>
                            {/* Date Range */}
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                                {(['7d', '30d', 'all'] as const).map(range => (
                                    <TouchableOpacity
                                        key={range}
                                        onPress={() => setDateRange(range)}
                                        style={{
                                            paddingHorizontal: 14,
                                            paddingVertical: 8,
                                            borderRadius: 16,
                                            backgroundColor: dateRange === range ? colors.text : cardBg,
                                        }}
                                    >
                                        <Text style={{ fontSize: 11, fontWeight: '600', color: dateRange === range ? colors.background : colors.text }}>
                                            {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Stats */}
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                                <Stat label="Views" value={analytics?.totalViews || 0} icon={Eye} />
                                <Stat label="Orders" value={analytics?.totalOrders || 0} icon={ShoppingCart} />
                                <Stat label="Revenue" value={`$${analytics?.totalRevenue || 0}`} icon={DollarSign} />
                            </View>

                            {/* Chart */}
                            <Text style={{ fontSize: 12, fontWeight: '600', color: subtleText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Activity</Text>
                            <View style={{ padding: 16, backgroundColor: cardBg, borderRadius: 12, marginBottom: 24 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 80 }}>
                                    {chartData.map((d, i) => (
                                        <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                                            <View style={{ width: 16, height: (d.value / maxValue) * 60, backgroundColor: colors.text, borderRadius: 4, marginBottom: 6 }} />
                                            <Text style={{ fontSize: 9, color: subtleText }}>{d.day}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>

                            {/* Top Products */}
                            <Text style={{ fontSize: 12, fontWeight: '600', color: subtleText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Top Products</Text>

                            {products.length > 0 ? (
                                <View style={{ gap: 8 }}>
                                    {products.slice(0, 5).map((product, i) => (
                                        <View key={product.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: cardBg, borderRadius: 10, gap: 10 }}>
                                            <Text style={{ width: 20, fontSize: 13, fontWeight: '700', color: colors.text }}>{i + 1}</Text>
                                            <View style={{ flex: 1 }}>
                                                <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '500', color: colors.text }}>{product.name}</Text>
                                            </View>
                                            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>${product.price}</Text>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                                    <Package size={32} color={subtleText} />
                                    <Text style={{ fontSize: 13, color: subtleText, marginTop: 10 }}>No products</Text>
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
