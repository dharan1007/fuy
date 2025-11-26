"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";

interface Product {
    id: string;
    name: string;
    price: number;
    images: string | null;
    type: string;
    brand?: {
        name: string;
    };
    seller?: {
        name: string;
    };
}

const CATEGORY_MAP: Record<string, string> = {
    courses: "COURSE",
    books: "EBOOK",
    templates: "TEMPLATE",
};

const TITLE_MAP: Record<string, string> = {
    courses: "All Courses",
    books: "All Books",
    templates: "All Templates",
};

export default function CategoryPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const type = CATEGORY_MAP[slug];

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!type) {
            setLoading(false);
            return;
        }

        fetch(`/api/shop/products?type=${type}&limit=50`)
            .then((res) => res.json())
            .then((data) => {
                setProducts(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, [type]);

    if (!type) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-black">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">Category Not Found</h1>
                    <Link href="/shop" className="text-blue-600 hover:underline">
                        Back to Shop
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-black font-sans">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/shop" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-2xl font-black tracking-tighter uppercase">
                        {TITLE_MAP[slug] || "Products"}
                    </h1>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-12">
                {loading ? (
                    <div className="text-center py-20 text-gray-400">Loading products...</div>
                ) : products.length === 0 ? (
                    <div className="text-center py-20">
                        <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-xl font-bold text-gray-900 mb-2">No products found</p>
                        <p className="text-gray-500">Check back later for new additions.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                        {products.map((product, i) => {
                            const images = product.images ? JSON.parse(product.images) : [];
                            const image = images[0]?.url || images[0] || "/placeholder.png";

                            return (
                                <Link href={`/shop/product/${product.id}`} key={product.id}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="group cursor-pointer"
                                    >
                                        <div className="aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden mb-4 relative">
                                            <img
                                                src={image}
                                                alt={product.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                        </div>
                                        <h3 className="font-bold text-lg leading-tight truncate">{product.name}</h3>
                                        <p className="text-gray-500 text-sm">
                                            {product.brand?.name || product.seller?.name || "Unknown Seller"}
                                        </p>
                                        <p className="font-bold mt-1">${product.price}</p>
                                    </motion.div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
