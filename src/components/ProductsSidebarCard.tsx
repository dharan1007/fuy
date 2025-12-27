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
        <div className="w-full mb-6">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/20">
                <h3 className="font-bold text-lg text-white">Trending Shop</h3>
                <Link href="/shop" className="text-xs text-neutral-400 hover:text-white flex items-center gap-1">
                    View All <ArrowRight size={12} />
                </Link>
            </div>

            <SwipeableStack
                items={products}
                containerHeight="320px"
                onCardClick={(product) => {
                    router.push(`/shop/product/${product.id}`);
                }}
            >
                {(product: SuggestedProduct) => (
                    <div className="flex flex-col h-full bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden shadow-xl" style={{ cursor: 'pointer' }}>
                        {/* Product Image Area */}
                        <div className="relative h-40 bg-white/5 flex items-center justify-center overflow-hidden">
                            {product.image ? (
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                />
                            ) : (
                                <div className="text-4xl">🛍️</div>
                            )}
                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-xs font-bold text-green-400 border border-green-500/30">
                                ₹{product.price}
                            </div>
                        </div>

                        {/* Details */}
                        <div className="p-4 flex flex-col flex-1">
                            <h4 className="text-base font-bold text-white mb-1 line-clamp-1">{product.name}</h4>

                            {product.description && (
                                <p className="text-xs text-neutral-400 line-clamp-2 mb-3 leading-relaxed">
                                    {product.description}
                                </p>
                            )}

                            <div className="mt-auto flex items-center justify-between pt-2 border-t border-white/10">
                                <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold flex items-center gap-1">
                                    <Tag size={10} /> Exclusive
                                </span>
                                <button className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded-lg hover:bg-neutral-200 transition-colors flex items-center gap-1">
                                    <ShoppingBag size={12} /> Shop
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </SwipeableStack>
        </div>
    );
}
