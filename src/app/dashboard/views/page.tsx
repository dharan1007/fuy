"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";

interface ProductView {
    id: string;
    viewedAt: string;
    product: {
        id: string;
        name: string;
        images: string;
        type: string;
        price: number;
        slug: string;
    };
}

export default function ViewsPage() {
    const [views, setViews] = useState<ProductView[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/user/views")
            .then((res) => res.json())
            .then((data) => {
                setViews(data);
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
                    <h1 className="text-3xl font-bold tracking-tighter">Recently Viewed</h1>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-white/50">Loading history...</div>
                ) : views.length === 0 ? (
                    <div className="text-center py-20 border border-white/10 rounded-xl">
                        <Eye className="w-12 h-12 mx-auto mb-4 text-white/30" />
                        <p className="text-xl font-bold mb-2">No viewing history</p>
                        <Link href="/shop" className="text-sm underline hover:text-white/70">
                            Start exploring
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {views.map((view) => {
                            const images = view.product.images ? JSON.parse(view.product.images) : [];
                            const image = images[0] || "/placeholder.png";
                            return (
                                <Link
                                    href={`/shop/product/${view.product.slug}`} // Or ID if slug not available
                                    key={view.id}
                                    className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/30 transition-all group block"
                                >
                                    <div className="aspect-square bg-white/10 relative">
                                        <img src={image} alt={view.product.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-bold mb-1 truncate">{view.product.name}</h3>
                                        <div className="flex justify-between items-center">
                                            <p className="text-sm text-white/50">${view.product.price}</p>
                                            <p className="text-xs text-white/30">{new Date(view.viewedAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
