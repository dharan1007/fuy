'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';

interface Product {
    id: string;
    name: string;
    description: string | null;
    price: number;
    externalUrl: string;
    images: string | null; // JSON string
}

interface Brand {
    id: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
    websiteUrl: string | null;
    products: Product[];
}

export default function BrandPage() {
    const params = useParams();
    const [brand, setBrand] = useState<Brand | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.slug) {
            fetchBrand(params.slug as string);
        }
    }, [params.slug]);

    const fetchBrand = async (slug: string) => {
        try {
            const res = await fetch(`/api/shop/brands/${slug}`);
            if (res.ok) {
                const data = await res.json();
                setBrand(data);
            }
        } catch (error) {
            console.error('Failed to fetch brand', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProductClick = async (product: Product) => {
        // Track the redirect event
        try {
            await fetch('/api/shop/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'REDIRECT',
                    brandId: brand?.id,
                    productId: product.id
                })
            });
        } catch (e) {
            // Ignore analytics error
        }

        // Redirect
        window.open(product.externalUrl, '_blank');
    };

    if (loading) return <div className="min-h-screen bg-white flex items-center justify-center font-bold text-xl">LOADING...</div>;
    if (!brand) return <div className="min-h-screen bg-white flex items-center justify-center font-bold text-xl">BRAND NOT FOUND</div>;

    return (
        <div className="min-h-screen bg-white text-black font-sans">
            {/* Minimal Header */}
            <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md z-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <a href="/shop" className="text-sm font-bold text-gray-500 hover:text-black transition-colors mr-4">← Back</a>
                        {brand.logoUrl && (
                            <img src={brand.logoUrl} alt="Logo" className="w-10 h-10 rounded-full object-cover" />
                        )}
                        <h1 className="text-xl font-black uppercase tracking-tight">{brand.name}</h1>
                    </div>
                    {brand.websiteUrl && (
                        <a
                            href={brand.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-bold border-b-2 border-black pb-1 hover:opacity-70 transition-opacity"
                        >
                            Visit Website ↗
                        </a>
                    )}
                </div>
            </header>

            {/* Banner Area */}
            <div className="pt-20">
                {brand.bannerUrl ? (
                    <div className="h-[50vh] w-full relative">
                        <img src={brand.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute bottom-0 left-0 p-8 md:p-16 text-white max-w-2xl">
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-2xl md:text-4xl font-bold leading-tight"
                            >
                                {brand.description}
                            </motion.p>
                        </div>
                    </div>
                ) : (
                    <div className="py-24 px-6 max-w-4xl mx-auto text-center">
                        <h2 className="text-4xl md:text-6xl font-black uppercase mb-6">{brand.name}</h2>
                        <p className="text-xl text-gray-500 leading-relaxed">{brand.description}</p>
                    </div>
                )}
            </div>

            {/* Products Grid */}
            <div className="max-w-7xl mx-auto px-6 py-24">
                <div className="flex items-center justify-between mb-12">
                    <h2 className="text-2xl font-black uppercase">Collection</h2>
                    <span className="text-sm font-medium text-gray-500">{brand.products.length} Items</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
                    {brand.products.map((product) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            className="group"
                        >
                            <div className="aspect-[3/4] bg-gray-100 mb-6 relative overflow-hidden">
                                {product.images ? (
                                    <img
                                        src={JSON.parse(product.images)[0]}
                                        alt={product.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">No Image</div>
                                )}

                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />

                                <button
                                    onClick={() => handleProductClick(product)}
                                    className="absolute bottom-6 left-6 right-6 py-4 bg-white text-black font-bold uppercase tracking-wide translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 shadow-xl"
                                >
                                    Buy Now — ${product.price}
                                </button>
                            </div>

                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg mb-1">{product.name}</h3>
                                    <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {brand.products.length === 0 && (
                    <div className="text-center py-24 border-t border-b border-gray-100">
                        <p className="text-gray-400 font-medium">No products available yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
