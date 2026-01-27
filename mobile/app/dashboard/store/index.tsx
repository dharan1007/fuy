import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, RefreshControl, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { ShopService, Product, ShopAnalytics } from '../../../services/ShopService';
import { ArrowLeft, Plus, Eye, DollarSign, Package, BarChart3, Settings, ChevronRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function DashboardStoreScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();

    const [analytics, setAnalytics] = useState<ShopAnalytics | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
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

    const getProductImage = (product: Product): string | null => {
        if (product.images) {
            try { return JSON.parse(product.images)[0]; } catch { return product.images; }
        }
        return null;
    };

    // Compact KPI Card
    const KPI = ({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) => (
        <View style={{ flex: 1, padding: 14, backgroundColor: cardBg, borderRadius: 12 }}>
            <Icon size={18} color={colors.text} />
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 8 }}>{value}</Text>
            <Text style={{ fontSize: 10, fontWeight: '600', color: subtleText, textTransform: 'uppercase', marginTop: 2 }}>{label}</Text>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity onPress={() => router.back()}>
                            <ArrowLeft size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>My Store</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => router.push('/shop/sell')}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.text, borderRadius: 8, gap: 4 }}
                    >
                        <Plus size={16} color={colors.background} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.background }}>Add</Text>
                    </TouchableOpacity>
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
                            {/* KPIs */}
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                                <KPI label="Listings" value={analytics?.activeListings || 0} icon={Package} />
                                <KPI label="Orders" value={analytics?.totalOrders || 0} icon={Eye} />
                                <KPI label="Revenue" value={`$${analytics?.totalRevenue || 0}`} icon={DollarSign} />
                            </View>

                            {/* Quick Links */}
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                                <TouchableOpacity
                                    onPress={() => router.push('/dashboard/store/inventory')}
                                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: cardBg, borderRadius: 12 }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Package size={16} color={colors.text} />
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Inventory</Text>
                                    </View>
                                    <ChevronRight size={16} color={subtleText} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => router.push('/dashboard/store/insights')}
                                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: cardBg, borderRadius: 12 }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <BarChart3 size={16} color={colors.text} />
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Insights</Text>
                                    </View>
                                    <ChevronRight size={16} color={subtleText} />
                                </TouchableOpacity>
                            </View>

                            {/* Products List */}
                            <Text style={{ fontSize: 12, fontWeight: '600', color: subtleText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Your Products</Text>

                            {products.length > 0 ? (
                                <View style={{ gap: 10 }}>
                                    {products.map(product => {
                                        const img = getProductImage(product);
                                        return (
                                            <TouchableOpacity
                                                key={product.id}
                                                onPress={() => router.push(`/shop/product/${product.id}`)}
                                                style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: cardBg, borderRadius: 12, gap: 12 }}
                                            >
                                                <View style={{ width: 50, height: 50, borderRadius: 8, backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0', overflow: 'hidden' }}>
                                                    {img ? <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} /> : <Package size={20} color={subtleText} style={{ alignSelf: 'center', marginTop: 15 }} />}
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{product.name}</Text>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                                                        <Text style={{ fontSize: 11, color: subtleText }}>{product.type}</Text>
                                                        <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: subtleText }} />
                                                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>${product.price}</Text>
                                                    </View>
                                                </View>
                                                <View style={{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: product.status === 'ACTIVE' ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.15)', borderRadius: 4 }}>
                                                    <Text style={{ fontSize: 9, fontWeight: '700', color: product.status === 'ACTIVE' ? '#22c55e' : '#f97316' }}>{product.status}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ) : (
                                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                    <Package size={36} color={subtleText} />
                                    <Text style={{ fontSize: 14, color: subtleText, marginTop: 12 }}>No products yet</Text>
                                    <TouchableOpacity
                                        onPress={() => router.push('/shop/sell')}
                                        style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: subtleText, borderRadius: 8 }}
                                    >
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Create First Listing</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
