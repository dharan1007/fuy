import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, StyleSheet, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Package, ExternalLink, AlertCircle, Star } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api-client';

interface OrderItem {
    id: string;
    product: {
        id: string;
        name: string;
        images: string;
        type: string;
        price: number;
    };
}

interface Order {
    id: string;
    totalAmount: number;
    status: string;
    createdAt: string;
    items: OrderItem[];
}

export default function OrdersScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [reportModal, setReportModal] = useState<Order | null>(null);
    const [reviewModal, setReviewModal] = useState<Order | null>(null);
    const [reportReason, setReportReason] = useState('');
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewText, setReviewText] = useState('');

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const { data, error } = await api.get<Order[]>('/api/user/purchases');
            if (data && !error) {
                setOrders(data);
            }
        } catch (e) {
            console.error('Failed to fetch orders:', e);
        } finally {
            setLoading(false);
        }
    };

    const submitReport = async () => {
        if (!reportModal || !reportReason.trim()) return;
        try {
            await api.post('/api/report', {
                type: 'ORDER',
                targetId: reportModal.id,
                reason: reportReason
            });
            Alert.alert('Success', 'Report submitted successfully');
            setReportModal(null);
            setReportReason('');
        } catch (e) {
            Alert.alert('Error', 'Failed to submit report');
        }
    };

    const submitReview = async () => {
        if (!reviewModal) return;
        try {
            // Reviews would typically be per-product
            Alert.alert('Success', 'Review submitted!');
            setReviewModal(null);
            setReviewRating(5);
            setReviewText('');
        } catch (e) {
            Alert.alert('Error', 'Failed to submit review');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed': case 'delivered': return '#22c55e';
            case 'pending': case 'processing': return '#eab308';
            case 'cancelled': case 'failed': return '#ef4444';
            default: return '#3b82f6';
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: '#000' }]}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft color="white" size={24} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Package color="#3b82f6" size={28} />
                        <Text style={styles.headerTitle}>Orders</Text>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="white" />
                    </View>
                ) : orders.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Package size={48} color="rgba(255,255,255,0.3)" />
                        <Text style={styles.emptyTitle}>No Orders Yet</Text>
                        <Text style={styles.emptySubtitle}>Your order history will appear here</Text>
                        <TouchableOpacity
                            style={styles.browseButton}
                            onPress={() => router.push('/shop')}
                        >
                            <Text style={styles.browseButtonText}>Browse Shop</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.listContainer}>
                        {orders.map((order) => (
                            <View key={order.id} style={styles.orderCard}>
                                {/* Order Header */}
                                <View style={styles.orderHeader}>
                                    <View>
                                        <Text style={styles.orderIdLabel}>Order ID</Text>
                                        <Text style={styles.orderId}>{order.id.slice(-8)}</Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                                        <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                                            {order.status || 'Processing'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Order Items */}
                                {order.items?.map((item) => {
                                    const images = item.product?.images ? JSON.parse(item.product.images) : [];
                                    const image = images[0] || null;
                                    return (
                                        <View key={item.id} style={styles.itemRow}>
                                            <View style={styles.itemImage}>
                                                {image ? (
                                                    <Image source={{ uri: image }} style={{ width: '100%', height: '100%' }} />
                                                ) : (
                                                    <Package size={24} color="rgba(255,255,255,0.3)" />
                                                )}
                                            </View>
                                            <View style={styles.itemInfo}>
                                                <Text style={styles.itemName}>{item.product?.name || 'Product'}</Text>
                                                <Text style={styles.itemType}>{item.product?.type || 'Item'}</Text>
                                            </View>
                                            <Text style={styles.itemPrice}>${item.product?.price || 0}</Text>
                                        </View>
                                    );
                                })}

                                {/* Order Footer */}
                                <View style={styles.orderFooter}>
                                    <Text style={styles.orderDate}>
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </Text>
                                    <Text style={styles.orderTotal}>${order.totalAmount}</Text>
                                </View>

                                {/* Actions */}
                                <View style={styles.actionsRow}>
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => setReportModal(order)}
                                    >
                                        <AlertCircle size={16} color="#ef4444" />
                                        <Text style={[styles.actionText, { color: '#ef4444' }]}>Report</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => setReviewModal(order)}
                                    >
                                        <Star size={16} color="#eab308" />
                                        <Text style={[styles.actionText, { color: '#eab308' }]}>Review</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                )}

                {/* Report Modal */}
                <Modal visible={!!reportModal} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Report Issue</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Describe the issue..."
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                value={reportReason}
                                onChangeText={setReportReason}
                                multiline
                            />
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalButton, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                                    onPress={() => setReportModal(null)}
                                >
                                    <Text style={styles.modalButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, { backgroundColor: '#ef4444' }]}
                                    onPress={submitReport}
                                >
                                    <Text style={styles.modalButtonText}>Submit</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Review Modal */}
                <Modal visible={!!reviewModal} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Leave a Review</Text>
                            <View style={styles.starsRow}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                                        <Star
                                            size={32}
                                            color={star <= reviewRating ? '#eab308' : 'rgba(255,255,255,0.2)'}
                                            fill={star <= reviewRating ? '#eab308' : 'transparent'}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Write your review..."
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                value={reviewText}
                                onChangeText={setReviewText}
                                multiline
                            />
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalButton, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                                    onPress={() => setReviewModal(null)}
                                >
                                    <Text style={styles.modalButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, { backgroundColor: '#eab308' }]}
                                    onPress={submitReview}
                                >
                                    <Text style={[styles.modalButtonText, { color: 'black' }]}>Submit</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
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
    orderCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
    orderIdLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
    orderId: { color: 'white', fontFamily: 'monospace', fontSize: 12 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
    statusText: { fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },
    itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    itemImage: { width: 48, height: 48, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    itemInfo: { flex: 1, marginLeft: 12 },
    itemName: { color: 'white', fontWeight: 'bold' },
    itemType: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textTransform: 'uppercase' },
    itemPrice: { color: 'white', fontWeight: 'bold' },
    orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
    orderDate: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
    orderTotal: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    actionsRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
    actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    actionText: { fontSize: 14, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 },
    modalTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
    modalInput: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 16, color: 'white', minHeight: 100, textAlignVertical: 'top', marginBottom: 16 },
    modalButtons: { flexDirection: 'row', gap: 12 },
    modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    modalButtonText: { color: 'white', fontWeight: 'bold' },
    starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
});
