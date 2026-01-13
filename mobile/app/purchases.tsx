import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ShoppingBag } from 'lucide-react-native';
import { api } from '../lib/api-client';

interface Purchase {
    id: string;
    totalAmount: number;
    createdAt: string;
    items: {
        id: string;
        product: {
            id: string;
            name: string;
            images: string;
            type: string;
        };
    }[];
}

export default function PurchasesScreen() {
    const router = useRouter();
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPurchases();
    }, []);

    const fetchPurchases = async () => {
        try {
            const { data, error } = await api.get<Purchase[]>('/api/user/purchases');
            if (data && !error) {
                setPurchases(data);
            }
        } catch (e) {
            console.error('Failed to fetch purchases:', e);
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
                        <ShoppingBag color="#3b82f6" size={28} />
                        <Text style={styles.headerTitle}>Purchases</Text>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="white" />
                    </View>
                ) : purchases.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <ShoppingBag size={48} color="rgba(255,255,255,0.3)" />
                        <Text style={styles.emptyTitle}>No Purchases Yet</Text>
                        <Text style={styles.emptySubtitle}>Start shopping to see your purchases here</Text>
                        <TouchableOpacity
                            style={styles.browseButton}
                            onPress={() => router.push('/shop')}
                        >
                            <Text style={styles.browseButtonText}>Browse Shop</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.listContainer}>
                        {purchases.map((order) => (
                            <View key={order.id} style={styles.purchaseCard}>
                                <View style={styles.purchaseHeader}>
                                    <View>
                                        <Text style={styles.orderIdLabel}>Order ID</Text>
                                        <Text style={styles.orderId}>{order.id.slice(-8)}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.dateLabel}>Date</Text>
                                        <Text style={styles.dateText}>
                                            {new Date(order.createdAt).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.itemsContainer}>
                                    {order.items.map((item) => {
                                        const images = item.product?.images ? JSON.parse(item.product.images) : [];
                                        const image = images[0] || null;
                                        return (
                                            <View key={item.id} style={styles.itemRow}>
                                                <View style={styles.itemImage}>
                                                    {image ? (
                                                        <Image source={{ uri: image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                                    ) : (
                                                        <ShoppingBag size={20} color="rgba(255,255,255,0.3)" />
                                                    )}
                                                </View>
                                                <View style={styles.itemInfo}>
                                                    <Text style={styles.itemName}>{item.product?.name || 'Product'}</Text>
                                                    <Text style={styles.itemType}>{item.product?.type || 'Item'}</Text>
                                                </View>
                                                <TouchableOpacity
                                                    style={styles.viewButton}
                                                    onPress={() => router.push(`/shop/product/${item.product?.id}` as any)}
                                                >
                                                    <Text style={styles.viewButtonText}>View</Text>
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })}
                                </View>

                                <View style={styles.purchaseFooter}>
                                    <Text style={styles.totalLabel}>Total:</Text>
                                    <Text style={styles.totalAmount}>${order.totalAmount}</Text>
                                </View>
                            </View>
                        ))}
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
    listContainer: { padding: 16, gap: 16 },
    purchaseCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    purchaseHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
    orderIdLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
    orderId: { color: 'white', fontFamily: 'monospace', fontSize: 12 },
    dateLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'right' },
    dateText: { color: 'white', fontSize: 12 },
    itemsContainer: { paddingVertical: 16, gap: 12 },
    itemRow: { flexDirection: 'row', alignItems: 'center' },
    itemImage: { width: 56, height: 56, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    itemInfo: { flex: 1, marginLeft: 12 },
    itemName: { color: 'white', fontWeight: 'bold' },
    itemType: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textTransform: 'uppercase' },
    viewButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'white', borderRadius: 8 },
    viewButtonText: { color: 'black', fontWeight: 'bold', fontSize: 12 },
    purchaseFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
    totalLabel: { color: 'rgba(255,255,255,0.5)', marginRight: 8 },
    totalAmount: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});
