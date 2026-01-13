import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, CreditCard, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react-native';
import { api } from '../lib/api-client';

interface Transaction {
    id: string;
    amount: number;
    status: string;
    description: string;
    createdAt: string;
}

export default function TransactionsScreen() {
    const router = useRouter();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            const { data, error } = await api.get<{ transactions: Transaction[] }>('/api/payment/history');
            if (data && !error) {
                setTransactions(data.transactions || []);
            }
        } catch (e) {
            console.error('Failed to fetch transactions:', e);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed': case 'paid': case 'captured':
                return <CheckCircle size={18} color="#22c55e" />;
            case 'failed': case 'cancelled':
                return <XCircle size={18} color="#ef4444" />;
            default:
                return <Clock size={18} color="#eab308" />;
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
                        <CreditCard color="#22c55e" size={28} />
                        <Text style={styles.headerTitle}>Transactions</Text>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="white" />
                    </View>
                ) : transactions.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <DollarSign size={48} color="rgba(255,255,255,0.3)" />
                        <Text style={styles.emptyTitle}>No Transactions Yet</Text>
                        <Text style={styles.emptySubtitle}>Your payment history will appear here</Text>
                        <TouchableOpacity
                            style={styles.browseButton}
                            onPress={() => router.push('/shop')}
                        >
                            <Text style={styles.browseButtonText}>Browse Shop</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.listContainer}>
                        {transactions.map((tx) => (
                            <View key={tx.id} style={styles.transactionCard}>
                                <View style={styles.transactionLeft}>
                                    {getStatusIcon(tx.status)}
                                    <View style={styles.transactionInfo}>
                                        <Text style={styles.transactionDesc}>{tx.description || 'Payment'}</Text>
                                        <Text style={styles.transactionDate}>
                                            {new Date(tx.createdAt).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.transactionRight}>
                                    <Text style={styles.transactionAmount}>
                                        ${(tx.amount / 100).toFixed(2)}
                                    </Text>
                                    <Text style={[styles.transactionStatus, {
                                        color: tx.status?.toLowerCase() === 'completed' ? '#22c55e' :
                                            tx.status?.toLowerCase() === 'failed' ? '#ef4444' : '#eab308'
                                    }]}>
                                        {tx.status}
                                    </Text>
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
    listContainer: { padding: 16, gap: 12 },
    transactionCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    transactionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    transactionInfo: { flex: 1 },
    transactionDesc: { color: 'white', fontWeight: '500' },
    transactionDate: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
    transactionRight: { alignItems: 'flex-end' },
    transactionAmount: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    transactionStatus: { fontSize: 12, textTransform: 'capitalize', marginTop: 2 },
});
