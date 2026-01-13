import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Eye } from 'lucide-react-native';
import { api } from '../lib/api-client';

interface ProductView {
    id: string;
    viewedAt: string;
    product: {
        id: string;
        name: string;
        images: string;
        type: string;
        price: number;
        slug: string;
    };
}

export default function ViewsScreen() {
    const router = useRouter();
    const [views, setViews] = useState<ProductView[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchViews();
    }, []);

    const fetchViews = async () => {
        try {
            const { data, error } = await api.get<ProductView[]>('/api/user/views');
            if (data && !error) {
                setViews(data);
            }
        } catch (e) {
            console.error('Failed to fetch views:', e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft color="white" size={24} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Eye color="#8b5cf6" size={28} />
                        <Text style={styles.headerTitle}>Recently Viewed</Text>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="white" />
                    </View>
                ) : views.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Eye size={48} color="rgba(255,255,255,0.3)" />
                        <Text style={styles.emptyTitle}>No Viewing History</Text>
                        <Text style={styles.emptySubtitle}>Products you view will appear here</Text>
                        <TouchableOpacity
                            style={styles.browseButton}
                            onPress={() => router.push('/shop')}
                        >
                            <Text style={styles.browseButtonText}>Start Exploring</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.gridContainer}>
                        <View style={styles.grid}>
                            {views.map((view) => {
                                const images = view.product?.images ? JSON.parse(view.product.images) : [];
                                const image = images[0] || null;
                                return (
                                    <TouchableOpacity
                                        key={view.id}
                                        style={styles.productCard}
                                        onPress={() => router.push(`/shop/product/${view.product?.slug || view.product?.id}` as any)}
                                    >
                                        <View style={styles.productImage}>
                                            {image ? (
                                                <Image source={{ uri: image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                            ) : (
                                                <Eye size={24} color="rgba(255,255,255,0.3)" />
                                            )}
                                        </View>
                                        <View style={styles.productInfo}>
                                            <Text style={styles.productName} numberOfLines={1}>{view.product?.name}</Text>
                                            <View style={styles.productFooter}>
                                                <Text style={styles.productPrice}>${view.product?.price}</Text>
                                                <Text style={styles.viewedDate}>
                                                    {new Date(view.viewedAt).toLocaleDateString()}
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    headerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 16 },
    emptySubtitle: { color: 'rgba(255,255,255,0.5)', marginTop: 8, textAlign: 'center' },
    browseButton: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: 'white', borderRadius: 999 },
    browseButtonText: { color: 'black', fontWeight: 'bold' },
    gridContainer: { padding: 16 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    productCard: { width: '48%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    productImage: { aspectRatio: 1, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    productInfo: { padding: 12 },
    productName: { color: 'white', fontWeight: 'bold', marginBottom: 8 },
    productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    productPrice: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
    viewedDate: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
});
