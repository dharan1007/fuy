"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";

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

export default function PurchasesPage() {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/user/purchases")
            .then((res) => res.json())
            .then((data) => {
                setPurchases(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12 font-mono">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center mb-8">
                    <Link href="/dashboard" className="mr-4 p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tighter">Purchase History</h1>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-white/50">Loading purchases...</div>
                ) : purchases.length === 0 ? (
                    <div className="text-center py-20 border border-white/10 rounded-xl">
                        <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-white/30" />
                        <p className="text-xl font-bold mb-2">No purchases yet</p>
                        <Link href="/shop" className="text-sm underline hover:text-white/70">
                            Browse the shop
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {purchases.map((order) => (
                            <div key={order.id} className="bg-white/5 border border-white/10 rounded-xl p-6">
                                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
                                    <div>
                                        <p className="text-sm text-white/50">Order ID</p>
                                        <p className="font-mono text-xs">{order.id}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-white/50">Date</p>
                                        <p className="text-sm">{new Date(order.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="grid gap-4">
                                    {order.items.map((item) => {
                                        const images = item.product.images ? JSON.parse(item.product.images) : [];
                                        const image = images[0] || "/placeholder.png";
                                        return (
                                            <div key={item.id} className="flex items-center gap-4">
                                                <div className="w-16 h-16 bg-white/10 rounded-lg overflow-hidden">
                                                    <img src={image} alt={item.product.name} className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <p className="font-bold">{item.product.name}</p>
                                                    <p className="text-xs text-white/50 uppercase">{item.product.type}</p>
                                                </div>
                                                <div className="ml-auto">
                                                    <Link
                                                        href={`/shop/product/${item.product.id}`} // Or a dedicated "access" page
                                                        className="px-4 py-2 bg-white text-black text-sm font-bold rounded hover:bg-gray-200 transition-colors"
                                                    >
                                                        View
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
                                    <p className="font-bold">Total: ${order.totalAmount}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
