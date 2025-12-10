'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';

type XrayFormProps = {
    onBack: () => void;
};

export default function XrayForm({ onBack }: XrayFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [content, setContent] = useState('');
    const [visibility, setVisibility] = useState('PUBLIC');
    const [topLayerFile, setTopLayerFile] = useState<File | null>(null);
    const [bottomLayerFile, setBottomLayerFile] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!topLayerFile || !bottomLayerFile) {
                throw new Error('Both layers are required');
            }

            // Upload both layers
            const uploadLayer = async (file: File) => {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('type', file.type.startsWith('video') ? 'video' : 'image');

                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || 'Upload failed');
                }
                return await res.json();
            };

            const [topData, bottomData] = await Promise.all([
                uploadLayer(topLayerFile),
                uploadLayer(bottomLayerFile),
            ]);

            // Create xray post
            const res = await fetch('/api/posts/xrays', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: content || 'Scratch to reveal!',
                    visibility,
                    topLayerUrl: topData.url,
                    topLayerType: topLayerFile.type.startsWith('video') ? 'VIDEO' : 'IMAGE',
                    bottomLayerUrl: bottomData.url,
                    bottomLayerType: bottomLayerFile.type.startsWith('video') ? 'VIDEO' : 'IMAGE',
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create xray');
            }

            router.push('/');
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-4">Create Xray (Scratch to Reveal)</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Caption</label>
                        <input
                            type="text"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Add a caption..."
                            className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/40"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">Top Layer (Visible)</label>
                            {topLayerFile ? (
                                <div className="p-3 bg-black/20 border border-white/10 rounded-lg">
                                    <p className="text-sm truncate">{topLayerFile.name}</p>
                                    <button
                                        type="button"
                                        onClick={() => setTopLayerFile(null)}
                                        className="text-xs text-red-400 hover:text-red-300 mt-1"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-white/20 rounded-xl hover:border-white/40 hover:bg-white/5 cursor-pointer transition-colors">
                                    <Upload className="w-5 h-5" />
                                    <span className="text-sm">Upload</span>
                                    <input
                                        type="file"
                                        accept="image/*,video/*"
                                        onChange={(e) => e.target.files && setTopLayerFile(e.target.files[0])}
                                        className="hidden"
                                    />
                                </label>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">Bottom Layer (Hidden)</label>
                            {bottomLayerFile ? (
                                <div className="p-3 bg-black/20 border border-white/10 rounded-lg">
                                    <p className="text-sm truncate">{bottomLayerFile.name}</p>
                                    <button
                                        type="button"
                                        onClick={() => setBottomLayerFile(null)}
                                        className="text-xs text-red-400 hover:text-red-300 mt-1"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-white/20 rounded-xl hover:border-white/40 hover:bg-white/5 cursor-pointer transition-colors">
                                    <Upload className="w-5 h-5" />
                                    <span className="text-sm">Upload</span>
                                    <input
                                        type="file"
                                        accept="image/*,video/*"
                                        onChange={(e) => e.target.files && setBottomLayerFile(e.target.files[0])}
                                        className="hidden"
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Visibility</label>
                        <select
                            value={visibility}
                            onChange={(e) => setVisibility(e.target.value)}
                            className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white"
                        >
                            <option value="PUBLIC">Public</option>
                            <option value="FRIENDS">Friends Only</option>
                            <option value="PRIVATE">Private</option>
                        </select>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <div className="flex gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
                    >
                        Back
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !topLayerFile || !bottomLayerFile}
                        className="flex-1 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Creating...' : 'Create Xray'}
                    </button>
                </div>
            </div>
        </form>
    );
}
