import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, RefreshControl, TextInput, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { ShopService, Brand } from '../../../services/ShopService';
import { ArrowLeft, Search, Store } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export default function BrandsScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();

    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const isDark = mode === 'dark';
    const subtleText = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
    const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';

    const fetchBrands = useCallback(async () => {
        try {
            const data = await ShopService.fetchBrands(50);
            setBrands(data);
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchBrands(); }, [fetchBrands]);

    const onRefresh = () => { setRefreshing(true); fetchBrands(); };

    const filteredBrands = brands.filter(b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const BrandCard = ({ brand }: { brand: Brand }) => (
        <TouchableOpacity
            onPress={() => router.push(`/shop/brand/${brand.slug}`)}
            style={{ width: CARD_WIDTH, marginBottom: 12, borderRadius: 12, overflow: 'hidden', backgroundColor: cardBg }}
            activeOpacity={0.8}
        >
            <View style={{ aspectRatio: 1, backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5', alignItems: 'center', justifyContent: 'center' }}>
                {brand.logoUrl ? (
                    <Image source={{ uri: brand.logoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                    <Text style={{ fontSize: 40, fontWeight: '800', color: subtleText }}>{brand.name[0]}</Text>
                )}
            </View>
            <View style={{ padding: 10 }}>
                <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{brand.name}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity onPress={() => router.back()}>
                            <ArrowLeft size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Brands</Text>
                    </View>

                    {/* Search */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginTop: 12,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                    }}>
                        <Search size={16} color={subtleText} />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search brands..."
                            placeholderTextColor={subtleText}
                            style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14, color: colors.text }}
                        />
                    </View>
                </View>

                {loading ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator color={colors.text} />
                    </View>
                ) : (
                    <FlatList
                        data={filteredBrands}
                        renderItem={({ item }) => <BrandCard brand={item} />}
                        keyExtractor={item => item.id}
                        numColumns={2}
                        columnWrapperStyle={{ justifyContent: 'space-between' }}
                        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', paddingTop: 60 }}>
                                <Store size={40} color={subtleText} />
                                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 12 }}>
                                    {searchQuery ? 'No brands found' : 'No brands yet'}
                                </Text>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </View>
    );
}
