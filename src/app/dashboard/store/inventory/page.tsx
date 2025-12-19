'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SpaceBackground } from '@/components/SpaceBackground';
import { Package, Search, Plus, Trash2, Edit2, X, Save, Box } from 'lucide-react';

interface Product {
    id: string;
    name: string;
    description: string | null;
    price: number;
    category: string;
    images: string | null;
    type: string;
}

export default function InventoryManager() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/shop/user-products');
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (error) {
            console.error('Failed to fetch products', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) return;

        try {
            const res = await fetch(`/api/shop/user-products?id=${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setProducts(products.filter(p => p.id !== id));
            } else {
                alert('Failed to delete product');
            }
        } catch (error) {
            console.error('Failed to delete', error);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProduct) return;

        try {
            const res = await fetch('/api/shop/user-products', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingProduct),
            });

            if (res.ok) {
                const updated = await res.json();
                setProducts(products.map(p => p.id === updated.id ? updated : p));
                setEditingProduct(null);
            } else {
                alert('Failed to update product');
            }
        } catch (error) {
            console.error('Failed to update', error);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading) return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono relative">
            <SpaceBackground />
            <div className="z-10 animate-pulse">LOADING INVENTORY...</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden relative">
            <SpaceBackground />

            <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <button
                            onClick={() => router.push('/dashboard/store')}
                            className="mb-4 text-xs font-bold text-gray-400 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2"
                        >
                            ← Back to Store Dashboard
                        </button>
                        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                            Listing Manager
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">Manage, Edit, and Curate your Listings</p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                        <div className="relative group min-w-[300px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-white transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search inventory..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all placeholder:text-gray-600"
                            />
                        </div>
                        <button
                            onClick={() => router.push('/shop/sell')}
                            className="px-6 py-3 bg-white text-black font-black uppercase text-xs rounded-xl hover:bg-gray-200 transition-colors shadow-lg shadow-white/10 flex items-center justify-center gap-2"
                        >
                            <Plus size={16} />
                            Create Listing
                        </button>
                    </div>
                </div>

                {/* Edit Modal */}
                <AnimatePresence>
                    {editingProduct && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                className="bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-lg w-full shadow-2xl relative"
                            >
                                <button
                                    onClick={() => setEditingProduct(null)}
                                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                                <h2 className="text-xl font-bold uppercase mb-6 flex items-center gap-2">
                                    <Edit2 size={20} className="text-blue-400" /> Edit Listing
                                </h2>

                                <form onSubmit={handleUpdate} className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Name</label>
                                        <input
                                            value={editingProduct.name}
                                            onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm focus:border-white/30 outline-none transition-colors"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Price ($)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={editingProduct.price}
                                                onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm focus:border-white/30 outline-none transition-colors"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Category</label>
                                            <input
                                                value={editingProduct.category || ''}
                                                onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm focus:border-white/30 outline-none transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Description</label>
                                        <textarea
                                            value={editingProduct.description || ''}
                                            onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm h-32 resize-none focus:border-white/30 outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="pt-4 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setEditingProduct(null)}
                                            className="flex-1 py-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-sm font-bold uppercase text-gray-400"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 py-3 rounded-lg bg-white text-black hover:bg-gray-200 transition-colors text-sm font-black uppercase flex items-center justify-center gap-2"
                                        >
                                            <Save size={16} /> Save Changes
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Product Grid */}
                {filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProducts.map((product) => {
                            const images = product.images ? JSON.parse(product.images) : [];
                            const image = images[0]?.url || images[0];

                            return (
                                <motion.div
                                    key={product.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/30 transition-all hover:-translate-y-1"
                                >
                                    <div className="aspect-square bg-black/50 relative overflow-hidden">
                                        {image ? (
                                            <img src={image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        ) : (
                                            <div className="flex items-center justify-center w-full h-full text-gray-700">
                                                <Box size={32} />
                                            </div>
                                        )}
                                        <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                                            <button
                                                onClick={() => setEditingProduct(product)}
                                                className="p-2 bg-white/10 backdrop-blur-md rounded-lg hover:bg-white/20 text-white transition-colors"
                                                title="Edit Listing"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id, product.name)}
                                                className="p-2 bg-red-500/20 backdrop-blur-md rounded-lg hover:bg-red-500/40 text-red-400 transition-colors"
                                                title="Delete Listing"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-bold uppercase text-purple-400 bg-purple-500/10 px-2 py-1 rounded">{product.type}</span>
                                            <span className="text-sm font-mono text-green-400">${product.price}</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-1 truncate">{product.name}</h3>
                                        <p className="text-gray-500 text-xs mb-4 line-clamp-2 min-h-[2.5em]">{product.description || 'No description provided.'}</p>

                                        <div className="pt-4 border-t border-white/10 flex justify-between items-center text-xs text-gray-400">
                                            <span>{product.category || 'Uncategorized'}</span>
                                            <span className={product.images ? 'text-blue-400' : 'text-gray-600'}>
                                                {product.images ? 'Has Media' : 'No Media'}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white/5 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center">
                        <div className="p-4 bg-white/5 rounded-full mb-4">
                            <Package size={32} className="text-gray-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No Listings Found</h3>
                        <p className="text-gray-400 max-w-sm mx-auto mb-8">You haven't listed any items for sale yet. Start your journey by creating your first listing.</p>
                        <button
                            onClick={() => router.push('/shop/sell')}
                            className="px-8 py-3 bg-white text-black font-bold uppercase text-sm rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            Create Your First Listing
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
