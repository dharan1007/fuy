import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingBag, Search, Filter, Star, TrendingUp, BookOpen, GraduationCap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'fashion', label: 'Fashion' },
    { id: 'digital', label: 'Digital' },
    { id: 'electronics', label: 'Electronics' },
    { id: 'home', label: 'Home' }
];

const FEATURED_BRANDS = [
    { id: '1', name: 'Nike', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop' },
    { id: '2', name: 'Adidas', image: 'https://images.unsplash.com/photo-1518002171953-a080ee32bed2?w=400&h=400&fit=crop' },
    { id: '3', name: 'Apple', image: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=400&h=400&fit=crop' },
];

const NEW_ARRIVALS = [
    { id: '1', name: 'Wireless Headphones', price: 299, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80', brand: 'AudioPlus' },
    { id: '2', name: 'Smart Watch Series 7', price: 399, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80', brand: 'TechGear' },
    { id: '3', name: 'Premium Backpack', price: 129, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80', brand: 'TravelCo' },
];

export default function ShopScreen() {
    const [selectedCategory, setSelectedCategory] = useState({ id: 'all', label: 'All' });

    return (
        <View style={{ flex: 1, backgroundColor: 'black' }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: 'white', fontSize: 24, fontWeight: '900', textTransform: 'uppercase' }}>Shop</Text>
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                        <TouchableOpacity>
                            <Search color="white" size={24} />
                        </TouchableOpacity>
                        <TouchableOpacity>
                            <ShoppingBag color="white" size={24} />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Hero Section */}
                    <View style={{ height: 400, marginBottom: 24 }}>
                        <Image
                            source={{ uri: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&h=900&fit=crop' }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                        />
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.8)', 'black']}
                            style={{ position: 'absolute', inset: 0 }}
                        />
                        <View style={{ position: 'absolute', bottom: 40, left: 20, right: 20, alignItems: 'center' }}>
                            <Text style={{ color: 'white', fontSize: 42, fontWeight: '900', textAlign: 'center', lineHeight: 42, marginBottom: 8 }}>
                                YOUR STYLE{'\n'}IS HERE
                            </Text>
                            <TouchableOpacity style={{ backgroundColor: 'white', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 100, marginTop: 16 }}>
                                <Text style={{ color: 'black', fontWeight: 'bold', fontSize: 16 }}>SHOP COLLECTION</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Categories */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 32 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
                        {CATEGORIES.map(cat => (
                            <TouchableOpacity
                                key={cat.id}
                                onPress={() => setSelectedCategory(cat)}
                                style={{
                                    paddingHorizontal: 20,
                                    paddingVertical: 10,
                                    borderRadius: 100,
                                    backgroundColor: selectedCategory.id === cat.id ? 'white' : 'rgba(255,255,255,0.1)',
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.1)'
                                }}
                            >
                                <Text style={{ color: selectedCategory.id === cat.id ? 'black' : 'white', fontWeight: 'bold' }}>{cat.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Featured Brands */}
                    <View style={{ paddingHorizontal: 16, marginBottom: 40 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
                            <Text style={{ color: 'white', fontSize: 24, fontWeight: '800' }}>FEATURED BRANDS</Text>
                            <Text style={{ color: '#666', fontWeight: '600' }}>View All</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                            {FEATURED_BRANDS.map(brand => (
                                <TouchableOpacity key={brand.id} style={{ width: 140 }}>
                                    <View style={{ width: 140, height: 180, borderRadius: 16, overflow: 'hidden', backgroundColor: '#111', marginBottom: 8 }}>
                                        <Image source={{ uri: brand.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                    </View>
                                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>{brand.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* New Arrivals */}
                    <View style={{ paddingHorizontal: 16, marginBottom: 120 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
                            <Text style={{ color: 'white', fontSize: 24, fontWeight: '800' }}>NEW ARRIVALS</Text>
                        </View>
                        <View style={{ gap: 24 }}>
                            {NEW_ARRIVALS.map(product => (
                                <TouchableOpacity key={product.id} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                                    <View style={{ height: 300, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
                                        <Image source={{ uri: product.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                    </View>
                                    <View style={{ paddingHorizontal: 4 }}>
                                        <Text style={{ color: '#888', textTransform: 'uppercase', fontSize: 12, fontWeight: '700', marginBottom: 4 }}>{product.brand}</Text>
                                        <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 4 }}>{product.name}</Text>
                                        <Text style={{ color: 'white', fontSize: 18 }}>${product.price}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
