'use client';

import Link from 'next/link';
import { ArrowLeft, CreditCard, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTransactions() {
            try {
                const res = await fetch('/api/payment/history');
                if (res.ok) {
                    const data = await res.json();
                    setTransactions(data.transactions || []);
                }
            } catch (e) {
                console.error('Failed to load transactions:', e);
            } finally {
                setLoading(false);
            }
        }
        fetchTransactions();
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed': case 'paid': case 'captured': return <CheckCircle className="text-green-400" size={18} />;
            case 'failed': case 'cancelled': return <XCircle className="text-red-400" size={18} />;
            default: return <Clock className="text-yellow-400" size={18} />;
        }
    };

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <div className="flex items-center gap-2">
                        <CreditCard className="text-green-400" size={28} />
                        <h1 className="text-3xl font-bold">Transactions</h1>
                    </div>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full" />
                    </div>
                )}

                {!loading && transactions.length === 0 && (
                    <div className="text-center py-20 bg-white/5 border border-white/10 rounded-xl">
                        <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                        <h3 className="text-xl font-bold mb-2">No Transactions Yet</h3>
                        <p className="text-gray-400 mb-6">Your payment history will appear here.</p>
                        <Link href="/shop" className="inline-block px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors">
                            Browse Shop
                        </Link>
                    </div>
                )}

                {!loading && transactions.length > 0 && (
                    <div className="space-y-3">
                        {transactions.map((tx: any) => (
                            <div key={tx.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {getStatusIcon(tx.status)}
                                    <div>
                                        <p className="font-medium">{tx.description || 'Payment'}</p>
                                        <p className="text-sm text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg">${(tx.amount / 100).toFixed(2)}</p>
                                    <p className="text-sm text-gray-400 capitalize">{tx.status}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
