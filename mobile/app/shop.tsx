import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ScrollView, Dimensions, TextInput, Alert, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, ShoppingBag, Package, Star, ChevronLeft, Filter, Heart } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface Product {
    id: string;
    name: string;
    price: number;
    image: string;
    rating: number;
    reviews: number;
    category: string;
    externalUrl?: string; // New field for Brand Showcase
    brandName?: string;
}

const CATEGORIES = ['All', 'Digital', 'Physical', 'Services', 'Courses'];

const DEMO_PRODUCTS: Product[] = Array.from({ length: 12 }).map((_, i) => {
    const isBrandProduct = i % 3 === 0; // Every 3rd product is external
    return {
        id: `product-${i}`,
        name: isBrandProduct ? ['Nike Air Zoom', 'Sony WH-1000XM5', 'Kindle Paperwhite', 'Logitech MX Master'][i % 4] : ['Premium Course', 'Digital Art Pack', 'Coaching Session', 'E-Book Bundle', 'Template Kit', 'Workshop Access'][i % 6],
        price: [29.99, 49.99, 99.99, 19.99, 39.99, 149.99][i % 6],
        image: `https://picsum.photos/seed/product${i}/400/400`,
        rating: 4 + Math.random(),
        reviews: Math.floor(Math.random() * 500) + 10,
        category: isBrandProduct ? 'Physical' : CATEGORIES[1 + (i % 4)],
        externalUrl: isBrandProduct ? 'https://google.com' : undefined,
        brandName: isBrandProduct ? 'Official Brand' : undefined,
    };
});

export default function ShopScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [wishlist, setWishlist] = useState<Set<string>>(new Set());

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    const toggleWishlist = (productId: string) => {
        setWishlist(prev => {
            const newSet = new Set(prev);
            if (newSet.has(productId)) newSet.delete(productId);
            else newSet.add(productId);
            return newSet;
        });
    };

    const handleExternalLink = (url: string) => {
        Alert.alert(
            "Leaving FUY",
            "You are about to be redirected to an external website. Do you wish to proceed?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Continue", onPress: () => Linking.openURL(url) }
            ]
        );
    };

    const renderProduct = ({ item }: { item: Product }) => (
        <TouchableOpacity
            onPress={() => router.push(`/shop/product/${item.id}`)}
            style={{
                width: CARD_WIDTH,
                marginBottom: 16,
                backgroundColor: colors.card,
                borderRadius: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: colors.border,
            }}
        >
            <View style={{ position: 'relative' }}>
                <Image
                    source={{ uri: item.image }}
                    style={{ width: '100%', height: CARD_WIDTH, backgroundColor: colors.secondary }}
                />

                {/* Wishlist Icon - Only for External/Brand Products (per user request)? Or Both? 
                    User said: "for the products posted by the (cretae brand ) showcase on fuy they should have the wishlist and not the cart"
                    This implies Wishlist is KEY for them. I'll show it for all but ensure it works.
                */}
                <TouchableOpacity
                    onPress={() => toggleWishlist(item.id)}
                    style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <Heart size={16} color="white" fill={wishlist.has(item.id) ? '#ef4444' : 'transparent'} />
                </TouchableOpacity>

                {/* Badge for Type */}
                {item.externalUrl && (
                    <View style={{ position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>Brand</Text>
                    </View>
                )}
            </View>

            <View style={{ padding: 12 }}>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 4 }} numberOfLines={2}>
                    {item.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Star size={12} color="#f59e0b" fill="#f59e0b" />
                    <Text style={{ color: colors.secondary, fontSize: 12, marginLeft: 4 }}>
                        {item.rating.toFixed(1)} ({item.reviews})
                    </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>
                        ${item.price.toFixed(2)}
                    </Text>

                    {/* Action Button: Cart vs External */}
                    {item.externalUrl ? (
                        <TouchableOpacity
                            onPress={() => handleExternalLink(item.externalUrl!)}
                            style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.text, borderRadius: 8 }}
                        >
                            <Text style={{ color: colors.background, fontSize: 10, fontWeight: '700' }}>Buy From</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={{ padding: 6, backgroundColor: colors.border, borderRadius: 20 }}>
                            <ShoppingBag size={14} color={colors.text} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </TouchableOpacity>
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
                    <ShoppingBag color={colors.text} size={24} />
                    <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, flex: 1 }}>Shop</Text>
                    <TouchableOpacity style={{ padding: 8, backgroundColor: colors.card, borderRadius: 12 }}>
                        <Filter color={colors.text} size={20} />
                    </TouchableOpacity>
                </View>

                {/* Search */}
                <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border }}>
                        <Search color={colors.secondary} size={18} />
                        <TextInput
                            placeholder="Search products..."
                            placeholderTextColor={colors.secondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            style={{ flex: 1, marginLeft: 10, fontSize: 15, color: colors.text }}
                        />
                    </View>
                </View>

                {/* Categories */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}
                >
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            onPress={() => setActiveCategory(cat)}
                            style={{
                                paddingHorizontal: 18,
                                paddingVertical: 10,
                                borderRadius: 20,
                                backgroundColor: activeCategory === cat ? colors.text : colors.card,
                                borderWidth: 1,
                                borderColor: activeCategory === cat ? colors.text : colors.border,
                            }}
                        >
                            <Text style={{ color: activeCategory === cat ? colors.background : colors.text, fontWeight: '600', fontSize: 13 }}>
                                {cat}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Products Grid */}
                <FlatList
                    data={filteredProducts}
                    keyExtractor={item => item.id}
                    renderItem={renderProduct}
                    numColumns={2}
                    columnWrapperStyle={{ paddingHorizontal: 16, gap: 16 }}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 60 }}>
                            <Package color={colors.secondary} size={48} />
                            <Text style={{ color: colors.secondary, fontSize: 16, marginTop: 12 }}>No products found</Text>
                        </View>
                    }
                />
            </SafeAreaView>
        </View>
    );
}
