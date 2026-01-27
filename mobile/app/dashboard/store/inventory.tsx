import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { ShopService, Product } from '../../../services/ShopService';
import { ArrowLeft, Plus, Package, MoreVertical, Edit2, Trash2, Eye, EyeOff } from 'lucide-react-native';

export default function InventoryScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [menuOpen, setMenuOpen] = useState<string | null>(null);

    const isDark = mode === 'dark';
    const subtleText = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
    const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

    const fetchProducts = useCallback(async () => {
        try {
            const data = await ShopService.fetchUserProducts();
            setProducts(data);
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    const onRefresh = () => { setRefreshing(true); fetchProducts(); };

    const getProductImage = (product: Product): string | null => {
        if (product.images) {
            try { return JSON.parse(product.images)[0]; } catch { return product.images; }
        }
        return null;
    };

    const handleDelete = async (id: string) => {
        Alert.alert('Delete', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    const success = await ShopService.deleteProduct(id);
                    if (success) setProducts(products.filter(p => p.id !== id));
                }
            },
        ]);
    };

    const toggleStatus = async (product: Product) => {
        const newStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        const updated = await ShopService.updateProduct(product.id, { status: newStatus } as any);
        if (updated) setProducts(products.map(p => p.id === product.id ? { ...p, status: newStatus } : p));
        setMenuOpen(null);
    };

    const renderProduct = ({ item }: { item: Product }) => {
        const img = getProductImage(item);
        const isOpen = menuOpen === item.id;
        return (
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: cardBg, borderRadius: 12, marginBottom: 10, gap: 12 }}>
                <View style={{ width: 50, height: 50, borderRadius: 8, backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                    {img ? <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} /> : <Package size={20} color={subtleText} />}
                </View>
                <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{item.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
                        <Text style={{ fontSize: 11, color: subtleText }}>{item.type}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>${item.price}</Text>
                    </View>
                </View>
                <View style={{ position: 'relative' }}>
                    <TouchableOpacity onPress={() => setMenuOpen(isOpen ? null : item.id)} style={{ padding: 6 }}>
                        <MoreVertical size={18} color={colors.text} />
                    </TouchableOpacity>
                    {isOpen && (
                        <View style={{ position: 'absolute', top: 30, right: 0, width: 140, backgroundColor: colors.background, borderRadius: 10, padding: 6, zIndex: 100, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 }}>
                            <TouchableOpacity onPress={() => { setMenuOpen(null); toggleStatus(item); }} style={{ flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8 }}>
                                {item.status === 'ACTIVE' ? <EyeOff size={14} color={colors.text} /> : <Eye size={14} color={colors.text} />}
                                <Text style={{ fontSize: 13, color: colors.text }}>{item.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { setMenuOpen(null); handleDelete(item.id); }} style={{ flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8 }}>
                                <Trash2 size={14} color="#ef4444" />
                                <Text style={{ fontSize: 13, color: '#ef4444' }}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity onPress={() => router.back()}>
                            <ArrowLeft size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Inventory</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/shop/sell')} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' }}>
                        <Plus size={18} color={colors.background} />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.text} /></View>
                ) : (
                    <FlatList
                        data={products}
                        renderItem={renderProduct}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', paddingTop: 60 }}>
                                <Package size={40} color={subtleText} />
                                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 12 }}>No products</Text>
                                <TouchableOpacity onPress={() => router.push('/shop/sell')} style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.text, borderRadius: 10 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.background }}>Create Listing</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </View>
    );
}
