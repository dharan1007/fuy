'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface SuggestedProduct {
    id: string;
    name: string;
    image?: string;
    price: number;
}

export default function ProductsSidebarCard() {
    const [products, setProducts] = useState<SuggestedProduct[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await fetch('/api/suggestions/products');
                if (res.ok) {
                    const data = await res.json();
                    // Show at least 4 products if available, defaulting to empty array
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
            <div className="rounded-2xl p-4 bg-transparent backdrop-blur-md border border-white/20 h-[200px] flex items-center justify-center">
                <div className="text-white/50 text-xs text-center">Loading shop...</div>
            </div>
        );
    }

    if (products.length === 0) return null;

    // Display top 5 products to ensure "at least 4" are visible
    const displayProducts = products.slice(0, 5);

    return (
        <div className="rounded-2xl p-5 bg-transparent backdrop-blur-md border border-white/20 hover:border-white/40 transition-all">
            <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Trending Shop</span>
                <span className="ml-auto text-yellow-500">★</span>
            </div>

            <div className="space-y-4">
                {displayProducts.map((product, i) => (
                    <Link
                        key={product.id}
                        href={`/shop/product/${product.id}`}
                        className="flex items-start gap-3 group"
                    >
                        {/* Product Image */}
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10 group-hover:border-white/30 transition-colors flex-shrink-0">
                            {product.image ? (
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/20">
                                    🛍️
                                </div>
                            )}
                        </div>

                        {/* details */}
                        <div className="flex-1 min-w-0 pt-0.5">
                            <h4 className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors truncate">
                                {product.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-bold text-blue-200">₹{product.price}</span>
                                {/* Optional: Add rating or other info here if available in future */}
                            </div>
                        </div>

                        {/* Arrow/Action */}
                        <div className="self-center">
                            <span className="text-white/20 group-hover:text-white/60 transition-colors text-lg">›</span>
                        </div>
                    </Link>
                ))}
            </div>

            <Link
                href="/shop"
                className="block w-full py-2 mt-4 text-center text-xs font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
            >
                View All Products
            </Link>
        </div>
    );
}
