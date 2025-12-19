
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Loader2 } from 'lucide-react';

type SimpleFormProps = {
    onBack: () => void;
};

export default function SimpleForm({ onBack }: SimpleFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [content, setContent] = useState('');
    const [visibility, setVisibility] = useState('PUBLIC');
    const [mediaItems, setMediaItems] = useState<{ file: File; preview: string; type: 'IMAGE' | 'VIDEO' }[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);

            if (mediaItems.length + newFiles.length > 8) {
                setError('Maximum 8 items allowed');
                return;
            }

            const newItems = newFiles.map(file => ({
                file,
                preview: URL.createObjectURL(file),
                type: file.type.startsWith('video/') ? 'VIDEO' as const : 'IMAGE' as const
            }));

            setMediaItems(prev => [...prev, ...newItems]);
            setError('');
        }
    };

    const removeMedia = (index: number) => {
        setMediaItems(prev => {
            const newItems = [...prev];
            URL.revokeObjectURL(newItems[index].preview);
            newItems.splice(index, 1);
            return newItems;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mediaItems.length === 0) {
                throw new Error('Please add at least one photo or video');
            }

            // Upload all files
            const uploadPromises = mediaItems.map(async (item) => {
                const formData = new FormData();
                formData.append('file', item.file);
                formData.append('type', item.type === 'VIDEO' ? 'video' : 'image');

                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!res.ok) throw new Error('Upload failed');
                return res.json();
            });

            const uploadedFiles = await Promise.all(uploadPromises);
            const mediaUrls = uploadedFiles.map(f => f.url);
            const mediaTypes = mediaItems.map(i => i.type);

            // Create post
            const res = await fetch('/api/posts/simple', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    visibility,
                    mediaUrls,
                    mediaTypes,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create post');
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
                <h3 className="text-xl font-bold mb-4">Create New Data</h3>

                <div className="space-y-4">
                    <div>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Write a caption..."
                            rows={3}
                            className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/40 resize-none"
                        />
                    </div>

                    {/* Media Grid */}
                    <div className="grid grid-cols-4 gap-2">
                        {mediaItems.map((item, index) => (
                            <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-black/40 group">
                                {item.type === 'VIDEO' ? (
                                    <video src={item.preview} className="w-full h-full object-cover" />
                                ) : (
                                    <img src={item.preview} alt="preview" className="w-full h-full object-cover" />
                                )}
                                <button
                                    type="button"
                                    onClick={() => removeMedia(index)}
                                    className="absolute top-1 right-1 p-1 bg-black/50 rounded-full hover:bg-red-500/80 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}

                        {mediaItems.length < 8 && (
                            <label className="aspect-square border-2 border-dashed border-white/20 rounded-lg hover:border-white/40 hover:bg-white/5 cursor-pointer transition-colors flex flex-col items-center justify-center gap-1 text-white/50 hover:text-white">
                                <Upload size={20} />
                                <span className="text-xs">Add</span>
                                <input
                                    type="file"
                                    accept="image/*,video/*"
                                    multiple
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>

                    <div>
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
                        disabled={loading || mediaItems.length === 0}
                        className="flex-1 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Post'}
                    </button>
                </div>
            </div>
        </form>
    );
}
