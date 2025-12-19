import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ShoppingBag, Tag, Star } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl?: string;
    category?: string;
    rating?: number;
}

export default function StoreScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('Product')
                .select('*')
                .order('createdAt', { ascending: false });

            if (data) {
                setProducts(data);
            }
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setLoading(false);
        }
    };

    const getGradientColors = (): [string, string, string] => {
        return mode === 'light' ? ['#ffffff', '#f8f9fa', '#e9ecef'] :
            mode === 'eye-care' ? ['#F5E6D3', '#E6D5C0', '#DBC4A0'] :
                ['#000000', '#0a0a0a', '#171717'];
    };

    const renderProductItem = ({ item }: { item: Product }) => (
        <TouchableOpacity
            className="mb-4 rounded-xl overflow-hidden shadow-sm"
            style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: 1,
                width: COLUMN_WIDTH
            }}
            onPress={() => console.log('Open Product', item.id)}
        >
            <View className="h-40 bg-gray-200">
                <Image
                    source={{ uri: item.imageUrl || `https://source.unsplash.com/random/400x400?product&sig=${item.id}` }}
                    className="w-full h-full"
                    resizeMode="cover"
                />
                {item.price > 0 && (
                    <View className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded">
                        <Text className="text-white text-xs font-bold">${item.price.toFixed(2)}</Text>
                    </View>
                )}
            </View>
            <View className="p-3">
                <Text className="font-bold text-sm mb-1" numberOfLines={1} style={{ color: colors.text }}>{item.name}</Text>
                <Text className="text-xs mb-2 line-clamp-2" numberOfLines={2} style={{ color: colors.secondary }}>{item.description}</Text>

                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                        <Star size={12} color="#f59e0b" fill="#f59e0b" />
                        <Text className="text-xs ml-1" style={{ color: colors.secondary }}>{item.rating || 4.5}</Text>
                    </View>
                    <TouchableOpacity className="bg-blue-500 px-2 py-1 rounded-full">
                        <Text className="text-white text-[10px] font-bold">ADD</Text>
                    </TouchableOpacity>
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
                    <Text className="text-xl font-bold" style={{ color: colors.text }}>Store</Text>
                    <TouchableOpacity className="p-2 rounded-full bg-gray-200/20">
                        <ShoppingBag color={colors.text} size={20} />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator color={colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={products}
                        renderItem={renderProductItem}
                        keyExtractor={item => item.id}
                        numColumns={2}
                        columnWrapperStyle={{ justifyContent: 'space-between' }}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View className="flex-1 items-center justify-center py-20">
                                <View className="p-6 rounded-full bg-orange-500/10 mb-6">
                                    <ShoppingBag size={48} color="#f59e0b" />
                                </View>
                                <Text className="text-lg font-bold mb-2" style={{ color: colors.text }}>No products found</Text>
                                <Text className="text-center opacity-70" style={{ color: colors.secondary }}>
                                    Check back later for new items!
                                </Text>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </LinearGradient>
    );
}
