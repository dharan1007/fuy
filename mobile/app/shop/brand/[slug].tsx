import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, RefreshControl, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { ShopService, Brand, Product } from '../../../services/ShopService';
import { ArrowLeft, Settings, ShoppingBag, Users } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export default function BrandScreen() {
    const router = useRouter();
    const { slug } = useLocalSearchParams<{ slug: string }>();
    const { colors, mode } = useTheme();

    const [brand, setBrand] = useState<Brand | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOwner, setIsOwner] = useState(false);

    const isDark = mode === 'dark';
    const subtleText = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
    const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';

    const fetchData = useCallback(async () => {
        if (!slug) return;
        try {
            const [brandData, myBrands] = await Promise.all([
                ShopService.fetchBrandBySlug(slug),
                ShopService.fetchUserBrands(),
            ]);
            setBrand(brandData);
            if (brandData) {
                const brandProducts = await ShopService.fetchProducts({ brandId: brandData.id });
                setProducts(brandProducts);
                setIsOwner(myBrands.some(b => b.id === brandData.id));
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const getProductImage = (product: Product): string => {
        if (product.images) {
            try { return JSON.parse(product.images)[0] || 'https://via.placeholder.com/400'; } catch { return product.images; }
        }
        return 'https://via.placeholder.com/400';
    };

    if (loading) {
        return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.text} /></View>;
    }

    if (!brand) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.text }}>Brand not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
                    <Text style={{ color: colors.text, textDecorationLine: 'underline' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 }}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <ArrowLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    {isOwner && (
                        <TouchableOpacity onPress={() => router.push('/dashboard/store')}>
                            <Settings size={22} color={colors.text} />
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                    {/* Brand Header */}
                    <View style={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 }}>
                        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: cardBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 12 }}>
                            {brand.logoUrl ? (
                                <Image source={{ uri: brand.logoUrl }} style={{ width: '100%', height: '100%' }} />
                            ) : (
                                <Text style={{ fontSize: 32, fontWeight: '800', color: subtleText }}>{brand.name[0]}</Text>
                            )}
                        </View>
                        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{brand.name}</Text>
                        {brand.description && (
                            <Text style={{ fontSize: 13, color: subtleText, textAlign: 'center', marginTop: 6, paddingHorizontal: 20 }}>{brand.description}</Text>
                        )}

                        {/* Stats */}
                        <View style={{ flexDirection: 'row', gap: 24, marginTop: 16 }}>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{products.length}</Text>
                                <Text style={{ fontSize: 11, color: subtleText }}>Products</Text>
                            </View>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>0</Text>
                                <Text style={{ fontSize: 11, color: subtleText }}>Followers</Text>
                            </View>
                        </View>

                        {!isOwner && (
                            <TouchableOpacity style={{ marginTop: 16, paddingHorizontal: 28, paddingVertical: 10, backgroundColor: colors.text, borderRadius: 20 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.background }}>Follow</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Products */}
                    <View style={{ paddingHorizontal: 20 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: subtleText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Products</Text>

                        {products.length > 0 ? (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                                {products.map(product => (
                                    <TouchableOpacity
                                        key={product.id}
                                        onPress={() => router.push(`/shop/product/${product.id}`)}
                                        style={{ width: CARD_WIDTH, marginBottom: 12, borderRadius: 12, overflow: 'hidden', backgroundColor: cardBg }}
                                        activeOpacity={0.8}
                                    >
                                        <Image source={{ uri: getProductImage(product) }} style={{ width: '100%', aspectRatio: 1, backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }} resizeMode="cover" />
                                        <View style={{ padding: 10 }}>
                                            <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{product.name}</Text>
                                            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 4 }}>${product.price}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : (
                            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                <ShoppingBag size={32} color={subtleText} />
                                <Text style={{ fontSize: 13, color: subtleText, marginTop: 10 }}>No products yet</Text>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
