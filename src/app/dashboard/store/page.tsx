"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Package, DollarSign, TrendingUp } from "lucide-react";

interface Product {
    id: string;
    name: string;
    price: number;
    images: string;
    type: string;
    status: string;
    brand?: {
        name: string;
        slug: string;
    };
    views?: number;
    sales?: number;
}

export default function StoreDashboardPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/shop/user-products")
            .then((res) => res.json())
            .then((data) => {
                setProducts(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const totalListings = products.length;
    // Mocking sales data for now as it's not in the product model yet
    const totalSales = products.reduce((acc, p) => acc + (p.sales || 0), 0);
    const totalRevenue = products.reduce((acc, p) => acc + ((p.sales || 0) * p.price), 0);

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12 font-mono">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center">
                        <Link href="/dashboard" className="mr-4 p-2 hover:bg-white/10 rounded-full transition-colors">
                            <ArrowLeft className="w-6 h-6" />
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tighter">Store Dashboard</h1>
                    </div>
                    <Link
                        href="/shop/sell"
                        className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        List New Item
                    </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-blue-500/20 text-blue-500 rounded-lg">
                                <Package className="w-6 h-6" />
                            </div>
                            <span className="text-white/50">Total Listings</span>
                        </div>
                        <p className="text-3xl font-bold">{totalListings}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-green-500/20 text-green-500 rounded-lg">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <span className="text-white/50">Total Sales</span>
                        </div>
                        <p className="text-3xl font-bold">{totalSales}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-purple-500/20 text-purple-500 rounded-lg">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <span className="text-white/50">Total Revenue</span>
                        </div>
                        <p className="text-3xl font-bold">${totalRevenue.toFixed(2)}</p>
                    </div>
                </div>

                {/* Listings List */}
                <h2 className="text-2xl font-bold mb-6">Your Listings</h2>
                {loading ? (
                    <div className="text-center py-20 text-white/50">Loading listings...</div>
                ) : products.length === 0 ? (
                    <div className="text-center py-20 border border-white/10 rounded-xl">
                        <Package className="w-12 h-12 mx-auto mb-4 text-white/30" />
                        <p className="text-xl font-bold mb-2">No listings yet</p>
                        <p className="text-white/50 mb-6">Start selling your digital products today.</p>
                        <Link href="/shop/sell" className="text-sm underline hover:text-white/70">
                            Create your first listing
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {products.map((product) => {
                            const images = product.images ? JSON.parse(product.images) : [];
                            const image = images[0]?.url || images[0] || "/placeholder.png"; // Handle object or string

                            return (
                                <div key={product.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden group hover:border-white/30 transition-colors">
                                    <div className="aspect-video bg-white/10 relative">
                                        <img src={image} alt={product.name} className="w-full h-full object-cover" />
                                        <div className="absolute top-2 right-2 bg-black/50 backdrop-blur px-2 py-1 rounded text-xs font-bold uppercase">
                                            {product.type}
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-bold text-lg leading-tight mb-1">{product.name}</h3>
                                                {product.brand && (
                                                    <p className="text-xs text-white/50">via {product.brand.name}</p>
                                                )}
                                            </div>
                                            <span className="font-bold">${product.price}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-white/50 mt-4 pt-4 border-t border-white/10">
                                            <span>{product.status}</span>
                                            <span className="ml-auto">Edit</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
