"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Store } from "lucide-react";

interface Brand {
    id: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    slug: string;
}

export default function BrandsPage() {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetch("/api/shop/brands")
            .then((res) => res.json())
            .then((data) => {
                setBrands(data.brands || []);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const filteredBrands = brands.filter((b) =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/shop" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <ArrowLeft className="w-6 h-6" />
                        </Link>
                        <h1 className="text-2xl font-bold">All Brands</h1>
                    </div>
                    <div className="relative hidden sm:block">
                        <input
                            placeholder="Search brands..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white/10 border border-white/20 px-4 py-2 pl-10 rounded-full text-sm outline-none focus:border-white/40 w-64 transition-all text-white placeholder:text-gray-500"
                        />
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-12">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full" />
                    </div>
                ) : filteredBrands.length === 0 ? (
                    <div className="text-center py-20">
                        <Store className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                        <p className="text-gray-400">
                            {searchQuery ? `No brands found matching "${searchQuery}".` : "No brands available yet."}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {filteredBrands.map((brand) => (
                            <Link href={`/shop/brand/${brand.slug}`} key={brand.id} className="group">
                                <div className="aspect-square bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-3 relative hover:border-white/30 transition-all">
                                    {brand.logoUrl ? (
                                        <img
                                            src={brand.logoUrl}
                                            alt={brand.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-4xl bg-white/5">
                                            {brand.name[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <h3 className="font-semibold text-center text-white group-hover:text-gray-300 transition-colors">{brand.name}</h3>
                                {brand.description && (
                                    <p className="text-sm text-gray-500 text-center line-clamp-1 mt-1">{brand.description}</p>
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
