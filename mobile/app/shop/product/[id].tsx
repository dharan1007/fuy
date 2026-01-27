import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Dimensions, Alert, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { ShopService, Product } from '../../../services/ShopService';
import { ArrowLeft, Heart, Share2, ShoppingCart, ExternalLink, Star, Store } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function ProductScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors, mode } = useTheme();

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [addingToCart, setAddingToCart] = useState(false);

    const isDark = mode === 'dark';
    const subtleText = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';

    useEffect(() => {
        if (id) fetchProduct();
    }, [id]);

    const fetchProduct = async () => {
        try {
            const data = await ShopService.fetchProductById(id!);
            setProduct(data);
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getImages = (): string[] => {
        if (!product?.images) return ['https://via.placeholder.com/600'];
        try {
            const imgs = JSON.parse(product.images);
            return imgs.length > 0 ? imgs : ['https://via.placeholder.com/600'];
        } catch {
            return [product.images];
        }
    };

    const handleAddToCart = async () => {
        if (!product) return;
        setAddingToCart(true);
        try {
            const success = await ShopService.addToCart(product.id);
            if (success) {
                Alert.alert('Added', `${product.name} added to cart`);
            }
        } catch (error) {
            Alert.alert('Error', 'Could not add to cart');
        } finally {
            setAddingToCart(false);
        }
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

    const images = product ? getImages() : [];

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={colors.text} />
            </View>
        );
    }

    if (!product) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.text }}>Product not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
                    <Text style={{ color: colors.text, textDecorationLine: 'underline' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Floating Header */}
            <View style={{ position: 'absolute', top: 50, left: 0, right: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 }}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}
                >
                    <ArrowLeft size={20} color="#fff" />
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                        onPress={() => setIsWishlisted(!isWishlisted)}
                        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Heart size={20} color="#fff" fill={isWishlisted ? '#ef4444' : 'transparent'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Share2 size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {/* Main Image */}
                <View style={{ width, height: width, backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }}>
                    <Image source={{ uri: images[selectedImage] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    {product.type !== 'PHYSICAL' && (
                        <View style={{ position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{product.type}</Text>
                        </View>
                    )}
                </View>

                {/* Thumbnails */}
                {images.length > 1 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 12, gap: 8 }}>
                        {images.map((img, i) => (
                            <TouchableOpacity
                                key={i}
                                onPress={() => setSelectedImage(i)}
                                style={{ width: 50, height: 50, borderRadius: 6, borderWidth: 2, borderColor: selectedImage === i ? colors.text : 'transparent', overflow: 'hidden' }}
                            >
                                <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* Product Info */}
                <View style={{ padding: 20 }}>
                    {/* Brand */}
                    {product.brand && (
                        <TouchableOpacity
                            onPress={() => router.push(`/shop/brand/${product.brand!.slug}`)}
                            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}
                        >
                            <Store size={12} color={subtleText} />
                            <Text style={{ fontSize: 12, color: subtleText, marginLeft: 4 }}>{product.brand.name}</Text>
                        </TouchableOpacity>
                    )}

                    {/* Name */}
                    <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 6 }}>{product.name}</Text>

                    {/* Rating */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        {[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} color="#f59e0b" fill="#f59e0b" style={{ marginRight: 2 }} />)}
                        <Text style={{ fontSize: 12, color: subtleText, marginLeft: 6 }}>4.8 (120)</Text>
                    </View>

                    {/* Price */}
                    <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 16 }}>${product.price}</Text>

                    {/* Description */}
                    {product.description && (
                        <Text style={{ fontSize: 14, color: subtleText, lineHeight: 20, marginBottom: 20 }}>{product.description}</Text>
                    )}

                    {/* Related Posts from Community */}
                    <View style={{ marginTop: 10 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 }}>See it in action</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                            {[1, 2, 3].map((_, i) => (
                                <View key={i} style={{ width: 140, height: 200, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                                    <Image
                                        source={{ uri: `https://picsum.photos/seed/post${i}/300/500` }}
                                        style={{ width: '100%', height: '100%' }}
                                    />
                                    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8, backgroundColor: 'rgba(0,0,0,0.6)' }}>
                                        <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }} numberOfLines={1}>User {i + 1}</Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Actions */}
            <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                <View style={{ flexDirection: 'row', padding: 16, gap: 10 }}>
                    {/* Only show Cart button if NOT external */}
                    {!product.externalUrl && (
                        <TouchableOpacity
                            onPress={handleAddToCart}
                            disabled={addingToCart}
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.text, gap: 6 }}
                        >
                            {addingToCart ? <ActivityIndicator color={colors.text} size="small" /> : (
                                <>
                                    <ShoppingCart size={18} color={colors.text} />
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Add to Cart</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        onPress={() => product.externalUrl ? handleExternalLink(product.externalUrl) : router.push('/cart')}
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10, backgroundColor: colors.text, gap: 6 }}
                    >
                        {product.externalUrl ? <ExternalLink size={18} color={colors.background} /> : null}
                        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.background }}>{product.externalUrl ? 'Buy From' : 'Buy Now'}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}
