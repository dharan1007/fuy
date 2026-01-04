'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { uploadFileClientSide } from '@/lib/upload-helper';

export default function CreateBrandPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        websiteUrl: '',
        logoUrl: '',
        bannerUrl: ''
    });

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'bannerUrl') => {
        const file = e.target.files?.[0];
        if (file) {
            setLoading(true);
            try {
                const url = await uploadFileClientSide(file, 'IMAGE');
                if (url) {
                    setFormData(prev => ({ ...prev, [field]: url }));
                }
            } catch (err) {
                console.error(err);
                alert("Upload failed");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/shop/brands', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                const brand = await res.json();
                router.push(`/shop/brand/${brand.slug}/dashboard`);
            } else {
                console.error('Failed to create brand');
            }
        } catch (error) {
            console.error('Error creating brand:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12"
            >
                <Link href="/shop" className="text-sm text-gray-500 hover:text-white mb-6 inline-block transition-colors">
                    ← Back to Shop
                </Link>

                <h1 className="text-3xl font-bold mb-2">Create Your Brand</h1>
                <p className="text-gray-400 mb-8">Launch your store and start selling in minutes.</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Brand Name</label>
                        <input
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 focus:border-white transition-colors outline-none"
                            placeholder="e.g. Nordic Essentials"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                        <textarea
                            required
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 focus:border-white transition-colors outline-none"
                            rows={4}
                            placeholder="Tell us about your brand..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Website URL</label>
                        <input
                            type="url"
                            value={formData.websiteUrl}
                            onChange={e => setFormData({ ...formData, websiteUrl: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 focus:border-white transition-colors outline-none"
                            placeholder="https://your-brand.com"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Brand Logo</label>
                            <div className="relative group cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, 'logoUrl')}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="w-full aspect-square rounded-xl bg-black/50 border border-white/10 flex items-center justify-center overflow-hidden group-hover:border-white transition-colors">
                                    {formData.logoUrl ? (
                                        <img src={formData.logoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center p-4">
                                            <div className="text-2xl mb-2">📷</div>
                                            <span className="text-xs text-gray-500">Click to upload logo</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Banner Image</label>
                            <div className="relative group cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, 'bannerUrl')}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="w-full aspect-video rounded-xl bg-black/50 border border-white/10 flex items-center justify-center overflow-hidden group-hover:border-white transition-colors">
                                    {formData.bannerUrl ? (
                                        <img src={formData.bannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center p-4">
                                            <div className="text-2xl mb-2">🖼️</div>
                                            <span className="text-xs text-gray-500">Click to upload banner</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 mt-8"
                    >
                        {loading ? 'Creating Brand...' : 'Create Brand'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
