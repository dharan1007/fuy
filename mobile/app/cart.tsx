import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { ShopService } from '../services/ShopService';
import { ArrowLeft, Trash2, ShoppingBag } from 'lucide-react-native';

interface CartItem {
    id: string;
    quantity: number;
    product: { id: string; name: string; price: number; images: string | null };
}

export default function CartScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();

    const [items, setItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const isDark = mode === 'dark';
    const subtleText = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
    const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

    const fetchCart = useCallback(async () => {
        try {
            const data = await ShopService.fetchCart();
            setItems(data);
        } catch (error) {
            console.error('Fetch cart error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchCart(); }, [fetchCart]);

    const onRefresh = () => { setRefreshing(true); fetchCart(); };

    const getProductImage = (item: CartItem): string | null => {
        if (item.product?.images) {
            try { return JSON.parse(item.product.images)[0]; } catch { return item.product.images; }
        }
        return null;
    };

    const handleRemove = async (id: string) => {
        const success = await ShopService.removeFromCart(id);
        if (success) setItems(items.filter(i => i.id !== id));
    };

    const total = items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);

    const renderItem = ({ item }: { item: CartItem }) => {
        const img = getProductImage(item);
        return (
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: cardBg, borderRadius: 12, marginBottom: 10, gap: 12 }}>
                <View style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                    {img ? <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} /> : <ShoppingBag size={20} color={subtleText} />}
                </View>
                <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{item.product?.name}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 4 }}>${item.product?.price}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ paddingHorizontal: 12, paddingVertical: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{item.quantity}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemove(item.id)} style={{ padding: 6 }}>
                        <Trash2 size={18} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12 }}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <ArrowLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Cart</Text>
                    {items.length > 0 && <Text style={{ fontSize: 13, color: subtleText }}>({items.length})</Text>}
                </View>

                {loading ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.text} /></View>
                ) : (
                    <>
                        <FlatList
                            data={items}
                            renderItem={renderItem}
                            keyExtractor={item => item.id}
                            contentContainerStyle={{ padding: 20, paddingBottom: 150 }}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
                            ListEmptyComponent={
                                <View style={{ alignItems: 'center', paddingTop: 80 }}>
                                    <ShoppingBag size={48} color={subtleText} />
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 16 }}>Cart is empty</Text>
                                    <Text style={{ fontSize: 13, color: subtleText, marginTop: 4 }}>Add items to get started</Text>
                                    <TouchableOpacity onPress={() => router.push('/shop')} style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.text, borderRadius: 10 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.background }}>Browse Shop</Text>
                                    </TouchableOpacity>
                                </View>
                            }
                        />

                        {items.length > 0 && (
                            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 36, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <Text style={{ fontSize: 14, color: subtleText }}>Total</Text>
                                    <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>${total.toFixed(2)}</Text>
                                </View>
                                <TouchableOpacity style={{ paddingVertical: 16, backgroundColor: colors.text, borderRadius: 12, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.background }}>Checkout</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                )}
            </SafeAreaView>
        </View>
    );
}
