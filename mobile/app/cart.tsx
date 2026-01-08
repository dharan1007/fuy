import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ShoppingCart, ChevronLeft, Trash2, Plus, Minus, CreditCard } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

interface CartItem {
    id: string;
    name: string;
    price: number;
    image: string;
    quantity: number;
    seller: string;
}

const DEMO_CART: CartItem[] = [
    { id: '1', name: 'Premium Design Course', price: 49.99, image: 'https://picsum.photos/seed/cart1/200', quantity: 1, seller: 'DesignPro' },
    { id: '2', name: 'E-Book Bundle', price: 19.99, image: 'https://picsum.photos/seed/cart2/200', quantity: 2, seller: 'BookStore' },
    { id: '3', name: 'Template Kit', price: 29.99, image: 'https://picsum.photos/seed/cart3/200', quantity: 1, seller: 'CreativeHub' },
];

export default function CartScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const [cartItems, setCartItems] = useState<CartItem[]>(DEMO_CART);

    const updateQuantity = (id: string, delta: number) => {
        setCartItems(prev => prev.map(item =>
            item.id === id
                ? { ...item, quantity: Math.max(1, item.quantity + delta) }
                : item
        ));
    };

    const removeItem = (id: string) => {
        setCartItems(prev => prev.filter(item => item.id !== id));
    };

    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    const renderCartItem = ({ item }: { item: CartItem }) => (
        <View
            style={{
                flexDirection: 'row',
                padding: 16,
                backgroundColor: colors.card,
                borderRadius: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: colors.border,
            }}
        >
            <Image
                source={{ uri: item.image }}
                style={{ width: 80, height: 80, borderRadius: 12 }}
            />
            <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }} numberOfLines={2}>{item.name}</Text>
                <Text style={{ fontSize: 12, color: colors.secondary, marginTop: 2 }}>by {item.seller}</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 8 }}>${item.price.toFixed(2)}</Text>
            </View>
            <View style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <TouchableOpacity onPress={() => removeItem(item.id)} style={{ padding: 8 }}>
                    <Trash2 size={18} color="#ef4444" />
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 12, padding: 4 }}>
                    <TouchableOpacity onPress={() => updateQuantity(item.id, -1)} style={{ padding: 6 }}>
                        <Minus size={14} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={{ paddingHorizontal: 12, fontSize: 14, fontWeight: '700', color: colors.text }}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => updateQuantity(item.id, 1)} style={{ padding: 6 }}>
                        <Plus size={14} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <LinearGradient
                colors={mode === 'light' ? ['#fff', '#f5f5f5'] : ['#000', '#0a0a0a']}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, backgroundColor: colors.card, borderRadius: 12 }}>
                        <ChevronLeft color={colors.text} size={22} />
                    </TouchableOpacity>
                    <ShoppingCart color={colors.text} size={24} />
                    <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>Cart</Text>
                    <View style={{ backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>{cartItems.length}</Text>
                    </View>
                </View>

                {cartItems.length === 0 ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ShoppingCart size={64} color={colors.secondary} />
                        <Text style={{ color: colors.secondary, fontSize: 18, marginTop: 16 }}>Your cart is empty</Text>
                        <TouchableOpacity
                            onPress={() => router.push('/shop')}
                            style={{ marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 }}
                        >
                            <Text style={{ color: 'white', fontWeight: '700' }}>Browse Shop</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <FlatList
                            data={cartItems}
                            keyExtractor={item => item.id}
                            renderItem={renderCartItem}
                            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
                            showsVerticalScrollIndicator={false}
                        />

                        {/* Summary */}
                        <View style={{ paddingHorizontal: 16, paddingVertical: 20, backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: colors.border }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text style={{ color: colors.secondary, fontSize: 14 }}>Subtotal</Text>
                                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>${subtotal.toFixed(2)}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                                <Text style={{ color: colors.secondary, fontSize: 14 }}>Tax (10%)</Text>
                                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>${tax.toFixed(2)}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
                                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Total</Text>
                                <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>${total.toFixed(2)}</Text>
                            </View>
                            <TouchableOpacity
                                style={{ backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                            >
                                <CreditCard size={20} color="white" />
                                <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>Checkout</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </SafeAreaView>
        </View>
    );
}
