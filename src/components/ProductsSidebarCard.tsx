'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import SwipeableStack from './SwipeableStack';
import { ShoppingBag, ArrowRight, Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SuggestedProduct {
    id: string;
    name: string;
    image?: string;
    price: number;
    description?: string;
}

export default function ProductsSidebarCard() {
    const [products, setProducts] = useState<SuggestedProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await fetch('/api/suggestions/products');
                if (res.ok) {
                    const data = await res.json();
                    setProducts(data.products || []);
                }
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    if (loading) {
        return (
            <div className="rounded-2xl p-4 bg-transparent backdrop-blur-md border border-white/20 h-[280px] flex items-center justify-center">
                <div className="text-white/50 text-xs text-center">Loading shop...</div>
            </div>
        );
    }

    if (products.length === 0) return null;

    return (
        <div className="w-full mb-8">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/20">
                <h3 className="font-bold text-2xl text-white">Trending Shop</h3>
                <Link href="/shop" className="text-sm text-neutral-400 hover:text-white flex items-center gap-1">
                    View All <ArrowRight size={14} />
                </Link>
            </div>

            <SwipeableStack
                items={products}
                containerHeight="360px"
                onCardClick={(product) => {
                    router.push(`/shop/product/${product.id}`);
                }}
            >
                {(product: SuggestedProduct) => (
                    <div className="flex flex-col h-full bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden shadow-xl" style={{ cursor: 'pointer' }}>
                        {/* Product Image Area */}
                        <div className="relative h-48 bg-white/5 flex items-center justify-center overflow-hidden">
                            {product.image ? (
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                />
                            ) : (
                                <div className="text-5xl">🛍️</div>
                            )}
                            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-bold text-green-400 border border-green-500/30">
                                ₹{product.price}
                            </div>
                        </div>

                        {/* Details */}
                        <div className="p-5 flex flex-col flex-1">
                            <h4 className="text-lg font-bold text-white mb-2 line-clamp-1">{product.name}</h4>

                            {product.description && (
                                <p className="text-sm text-neutral-400 line-clamp-2 mb-4 leading-relaxed">
                                    {product.description}
                                </p>
                            )}

                            <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/10">
                                <span className="text-xs text-neutral-500 uppercase tracking-widest font-semibold flex items-center gap-1">
                                    <Tag size={12} /> Exclusive
                                </span>
                                <button className="px-4 py-2 bg-white text-black text-sm font-bold rounded-xl hover:bg-neutral-200 transition-colors flex items-center gap-2">
                                    <ShoppingBag size={14} /> Shop
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </SwipeableStack>
        </div>
    );
}
