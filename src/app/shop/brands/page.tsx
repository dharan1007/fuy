"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { motion } from "framer-motion";

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
        <div className="min-h-screen bg-white text-black font-sans">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/shop" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-2xl font-black tracking-tighter uppercase">All Brands</h1>
                </div>
                <div className="relative hidden sm:block">
                    <input
                        placeholder="Search brands..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-gray-100 px-4 py-2 pl-10 rounded-full text-sm outline-none focus:ring-2 focus:ring-black/5 w-64 transition-all"
                    />
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-12">
                {loading ? (
                    <div className="text-center py-20 text-gray-400">Loading brands...</div>
                ) : filteredBrands.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <p>No brands found matching "{searchQuery}".</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                        {filteredBrands.map((brand, i) => (
                            <Link href={`/shop/brand/${brand.slug}`} key={brand.id}>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="group cursor-pointer"
                                >
                                    <div className="aspect-[4/5] bg-gray-50 rounded-xl overflow-hidden mb-4 relative shadow-sm border border-gray-100">
                                        {brand.logoUrl ? (
                                            <img
                                                src={brand.logoUrl}
                                                alt={brand.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold text-4xl bg-gray-50">
                                                {brand.name[0]}
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                    </div>
                                    <h3 className="font-bold text-lg text-center">{brand.name}</h3>
                                </motion.div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
