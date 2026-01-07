'use client';

import Link from 'next/link';
import { ArrowLeft, Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function WishlistPage() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchWishlist() {
            try {
                const res = await fetch('/api/shop/wishlist');
                if (res.ok) {
                    const data = await res.json();
                    setItems(data.items || []);
                }
            } catch (e) {
                console.error('Failed to load wishlist:', e);
            } finally {
                setLoading(false);
            }
        }
        fetchWishlist();
    }, []);

    const removeItem = async (productId: string) => {
        setItems(prev => prev.filter(item => item.productId !== productId));
        try {
            await fetch('/api/shop/wishlist', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId })
            });
        } catch (e) {
            console.error('Failed to remove from wishlist:', e);
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
                        <Heart className="text-red-400" size={28} />
                        <h1 className="text-3xl font-bold">Wishlist</h1>
                    </div>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full" />
                    </div>
                )}

                {!loading && items.length === 0 && (
                    <div className="text-center py-20 bg-white/5 border border-white/10 rounded-xl">
                        <Heart className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                        <h3 className="text-xl font-bold mb-2">Your Wishlist is Empty</h3>
                        <p className="text-gray-400 mb-6">Save items you love for later.</p>
                        <Link href="/shop" className="inline-block px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors">
                            Browse Shop
                        </Link>
                    </div>
                )}

                {!loading && items.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {items.map((item: any) => (
                            <div key={item.productId} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                                <div className="aspect-square bg-black relative">
                                    {item.product?.images?.[0] ? (
                                        <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                                            <ShoppingBag size={48} />
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h3 className="font-semibold mb-1">{item.product?.name || 'Product'}</h3>
                                    <p className="text-green-400 font-bold mb-3">${(item.product?.price / 100)?.toFixed(2) || '0.00'}</p>
                                    <div className="flex gap-2">
                                        <Link href={`/shop/product/${item.productId}`} className="flex-1 py-2 bg-white text-black rounded-lg text-center font-medium hover:bg-gray-200 transition-colors">
                                            View
                                        </Link>
                                        <button onClick={() => removeItem(item.productId)} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
