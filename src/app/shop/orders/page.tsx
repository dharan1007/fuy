'use client';

import Link from 'next/link';
import { ArrowLeft, Package, Clock, CheckCircle, Truck, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchOrders() {
            try {
                const res = await fetch('/api/shop/orders');
                if (res.ok) {
                    const data = await res.json();
                    setOrders(data.orders || []);
                }
            } catch (e) {
                console.error('Failed to load orders:', e);
            } finally {
                setLoading(false);
            }
        }
        fetchOrders();
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'delivered': return <CheckCircle className="text-green-400" size={18} />;
            case 'shipped': return <Truck className="text-blue-400" size={18} />;
            case 'cancelled': return <XCircle className="text-red-400" size={18} />;
            default: return <Clock className="text-yellow-400" size={18} />;
        }
    };

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/shop" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <div className="flex items-center gap-2">
                        <Package className="text-blue-400" size={28} />
                        <h1 className="text-3xl font-bold">My Orders</h1>
                    </div>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full" />
                    </div>
                )}

                {!loading && orders.length === 0 && (
                    <div className="text-center py-20 bg-white/5 border border-white/10 rounded-xl">
                        <Package className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                        <h3 className="text-xl font-bold mb-2">No Orders Yet</h3>
                        <p className="text-gray-400 mb-6">Start shopping to see your orders here.</p>
                        <Link href="/shop" className="inline-block px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors">
                            Browse Shop
                        </Link>
                    </div>
                )}

                {!loading && orders.length > 0 && (
                    <div className="space-y-4">
                        {orders.map((order: any) => (
                            <div key={order.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <p className="text-sm text-gray-400">Order #{order.id?.slice(-8)}</p>
                                        <p className="text-sm text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(order.status)}
                                        <span className="text-sm capitalize">{order.status}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-16 h-16 bg-black rounded-lg overflow-hidden flex-shrink-0">
                                        {order.items?.[0]?.product?.images?.[0] ? (
                                            <img src={order.items[0].product.images[0]} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package size={24} className="text-gray-600" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium">{order.items?.length || 0} item(s)</p>
                                        <p className="text-green-400 font-bold">${(order.total / 100).toFixed(2)}</p>
                                    </div>
                                </div>
                                <Link href={`/dashboard/orders/${order.id}`} className="block w-full py-2 bg-white/10 text-center rounded-lg hover:bg-white/20 transition-colors">
                                    View Details
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
