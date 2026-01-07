'use client';

import Link from 'next/link';
import { ArrowLeft, BookOpen, GraduationCap, FileCode, ShoppingBag } from 'lucide-react';

const CATEGORIES = [
    { slug: 'courses', title: 'Courses', description: 'Learn new skills', icon: GraduationCap, color: 'from-blue-500 to-cyan-500' },
    { slug: 'books', title: 'Books', description: 'Digital books & guides', icon: BookOpen, color: 'from-green-500 to-emerald-500' },
    { slug: 'templates', title: 'Templates', description: 'Ready-to-use templates', icon: FileCode, color: 'from-orange-500 to-red-500' },
];

export default function CategoriesPage() {
    return (
        <div className="min-h-screen bg-white text-black font-sans">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/shop" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-2xl font-black tracking-tighter uppercase">Categories</h1>
                </div>
            </div>

            {/* Categories Grid */}
            <div className="max-w-4xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {CATEGORIES.map((cat) => (
                        <Link
                            key={cat.slug}
                            href={`/shop/category/${cat.slug}`}
                            className="group block"
                        >
                            <div className={`aspect-square rounded-2xl bg-gradient-to-br ${cat.color} p-6 flex flex-col justify-between relative overflow-hidden`}>
                                <cat.icon className="w-12 h-12 text-white" />
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-1">{cat.title}</h3>
                                    <p className="text-white/80 text-sm">{cat.description}</p>
                                </div>
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </div>
                        </Link>
                    ))}
                </div>

                {/* All Products Link */}
                <div className="mt-12 text-center">
                    <Link href="/shop" className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-full font-semibold hover:bg-gray-800 transition-colors">
                        <ShoppingBag size={20} />
                        Browse All Products
                    </Link>
                </div>
            </div>
        </div>
    );
}
