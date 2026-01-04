'use client';


import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import SlashInput from "@/components/post-forms/SlashInput";
import { uploadFileClientSide } from "@/lib/upload-helper";

interface Product {
    id: string;
    name: string;
    description: string | null;
    price: number;
    externalUrl: string;
    images: string | null;
    category: string;
}

export default function InventoryPage() {
    const params = useParams();
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [brandId, setBrandId] = useState<string | null>(null);

    // Add Product Form State
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [newProduct, setNewProduct] = useState({
        name: '',
        description: '',
        price: '',
        externalUrl: '',
        mediaFiles: [] as string[], // Base64 strings
        category: 'OTHER',
        tags: [] as string[],
    });

    useEffect(() => {
        if (params.slug) {
            fetchData(params.slug as string);
        }
    }, [params.slug]);

    const fetchData = async (slug: string) => {
        try {
            const brandRes = await fetch(`/api/shop/brands/${slug}`);
            if (!brandRes.ok) throw new Error('Brand not found');
            const brandData = await brandRes.json();
            setBrandId(brandData.id);
            setProducts(brandData.products || []);
        } catch (error) {
            console.error('Failed to fetch inventory', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setLoading(true); // Optimization: Use local loading state for uploads if preferred, but global loading works for now
            try {
                const uploadedUrls = await Promise.all(
                    files.map(async (file) => {
                        const type = file.type.startsWith('image') ? 'IMAGE' : 'VIDEO';
                        return await uploadFileClientSide(file, type);
                    })
                );
                const validUrls = uploadedUrls.filter((url): url is string => !!url);
                setNewProduct(prev => ({
                    ...prev,
                    mediaFiles: [...prev.mediaFiles, ...validUrls]
                }));
            } catch (error) {
                console.error("Upload failed", error);
                alert("Failed to upload some files");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!brandId) return;

        try {
            const res = await fetch('/api/shop/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    brandId,
                    name: newProduct.name,
                    description: newProduct.description,
                    price: newProduct.price,
                    externalUrl: newProduct.externalUrl,
                    images: newProduct.mediaFiles,
                    category: newProduct.category,
                    tags: JSON.stringify(newProduct.tags)
                })
            });

            if (res.ok) {
                setShowAddProduct(false);
                setNewProduct({ name: '', description: '', price: '', externalUrl: '', mediaFiles: [], category: 'OTHER', tags: [] });
                fetchData(params.slug as string); // Refresh
            }
        } catch (error) {
            console.error('Failed to add product', error);
        }
    };

    const handleDeleteProduct = async (productId: string) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            const res = await fetch(`/api/shop/products?id=${productId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchData(params.slug as string);
            }
        } catch (error) {
            console.error('Failed to delete product', error);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono">LOADING INVENTORY...</div>;

    return (
        <div className="min-h-screen bg-black text-white font-mono p-6 md:p-12">
            <div className="max-w-7xl mx-auto">
                <button
                    onClick={() => router.push(`/shop/brand/${params.slug}/dashboard`)}
                    className="mb-8 text-sm text-gray-500 hover:text-white transition-colors flex items-center gap-2"
                >
                    ← Back to Dashboard
                </button>

                <header className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-white/20 pb-6 gap-4">
                    <div>
                        <h1 className="text-4xl font-bold uppercase tracking-tighter mb-2">Inventory Manager</h1>
                        <p className="text-gray-500 text-sm">Manage your products and stock.</p>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <input
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/20 px-4 py-3 pl-10 focus:border-white outline-none transition-colors text-sm"
                            />
                            <svg className="absolute left-3 top-3.5 text-gray-500" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                        </div>
                        <button
                            onClick={() => setShowAddProduct(!showAddProduct)}
                            className="px-6 py-3 bg-white text-black font-bold uppercase text-sm hover:bg-gray-200 transition-colors whitespace-nowrap"
                        >
                            {showAddProduct ? 'Close Form' : '+ Add Product'}
                        </button>
                    </div>
                </header>

                {/* Add Product Form */}
                {showAddProduct && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mb-16 bg-white/5 border border-white/10 p-8"
                    >
                        <h2 className="text-xl font-bold uppercase mb-8">New Product Details</h2>
                        <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-xs text-gray-500 uppercase">Product Name</label>
                                <input
                                    required
                                    value={newProduct.name}
                                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                    className="w-full bg-black border border-white/20 p-3 focus:border-white outline-none transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-500 uppercase">Price</label>
                                <input
                                    type="number"
                                    required
                                    value={newProduct.price}
                                    onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                                    className="w-full bg-black border border-white/20 p-3 focus:border-white outline-none transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-500 uppercase">Category</label>
                                <select
                                    value={newProduct.category}
                                    onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                                    className="w-full bg-black border border-white/20 p-3 focus:border-white outline-none transition-colors"
                                >
                                    <option value="OTHER">Other</option>
                                    <option value="CLOTHING">Clothing</option>
                                    <option value="ACCESSORIES">Accessories</option>
                                    <option value="DIGITAL">Digital</option>
                                    <option value="ART">Art</option>
                                </select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <SlashInput
                                    slashes={newProduct.tags}
                                    onChange={(tags) => setNewProduct({ ...newProduct, tags })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-500 uppercase">External Buy URL</label>
                                <input
                                    type="url"
                                    required
                                    value={newProduct.externalUrl}
                                    onChange={e => setNewProduct({ ...newProduct, externalUrl: e.target.value })}
                                    className="w-full bg-black border border-white/20 p-3 focus:border-white outline-none transition-colors"
                                />
                            </div>

                            {/* File Upload */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs text-gray-500 uppercase">Product Media (Images/Videos)</label>
                                <div className="relative border border-dashed border-white/20 bg-black/50 p-8 text-center hover:border-white transition-colors cursor-pointer">
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,video/*"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="text-gray-400">
                                        {newProduct.mediaFiles.length > 0 ? (
                                            <span className="text-white font-bold">{newProduct.mediaFiles.length} files selected</span>
                                        ) : (
                                            <span>Click to upload images or videos</span>
                                        )}
                                    </div>
                                </div>
                                {/* Preview Grid */}
                                {newProduct.mediaFiles.length > 0 && (
                                    <div className="grid grid-cols-4 gap-4 mt-4">
                                        {newProduct.mediaFiles.map((file, i) => (
                                            <div key={i} className="aspect-square bg-gray-800 relative overflow-hidden">
                                                {file.startsWith('data:video') ? (
                                                    <video src={file} className="w-full h-full object-cover" />
                                                ) : (
                                                    <img src={file} alt="Preview" className="w-full h-full object-cover" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs text-gray-500 uppercase">Description</label>
                                <textarea
                                    value={newProduct.description}
                                    onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                                    className="w-full bg-black border border-white/20 p-3 focus:border-white outline-none transition-colors"
                                    rows={3}
                                />
                            </div>
                            <button type="submit" className="md:col-span-2 py-4 bg-white text-black font-bold uppercase hover:bg-gray-200">
                                Create Product
                            </button>
                        </form>
                    </motion.div>
                )}

                {/* Product List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.map(product => (
                        <div key={product.id} className="border border-white/10 bg-white/5 p-4 group hover:border-white/30 transition-colors">
                            <div className="aspect-square bg-black mb-4 overflow-hidden relative">
                                {product.images ? (
                                    <img src={JSON.parse(product.images)[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-700">No Image</div>
                                )}
                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleDeleteProduct(product.id)}
                                        className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
                                        title="Delete"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                    </button>
                                </div>
                            </div>
                            <h3 className="font-bold text-lg mb-1">{product.name}</h3>
                            <p className="text-gray-400 text-sm mb-4 line-clamp-2">{product.description}</p>
                            <div className="flex justify-between items-center border-t border-white/10 pt-4">
                                <span className="font-bold text-xl">${product.price}</span>
                                <span className="text-xs text-gray-500 uppercase border border-white/20 px-2 py-1 rounded">{product.category}</span>
                            </div>
                        </div>
                    ))}
                    {filteredProducts.length === 0 && (
                        <div className="col-span-full py-20 text-center text-gray-500">
                            <p>No products found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
