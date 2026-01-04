
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Loader2 } from 'lucide-react';
import { uploadFileClientSide } from '@/lib/upload-helper';

import { useCreatePost } from '@/context/CreatePostContext';

interface SimpleFormProps {
    onBack?: () => void;
    initialData?: any;
}

import SlashInput from '@/components/post-forms/SlashInput';

// ... (existing imports, keep SimpleFormProps)

export default function SimpleForm({ onBack: propOnBack, initialData }: SimpleFormProps) {
    const { onBack: contextOnBack, initialData: contextInitialData } = useCreatePost() || {};
    const onBack = propOnBack || contextOnBack || (() => { });
    const data = initialData || contextInitialData;
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Posting...');
    const [error, setError] = useState('');

    const [content, setContent] = useState('');
    const [visibility, setVisibility] = useState('PUBLIC');
    const [mediaItems, setMediaItems] = useState<{ file: File; preview: string; type: 'IMAGE' | 'VIDEO' }[]>([]);
    const [slashes, setSlashes] = useState<string[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // ... (existing logic)
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            if (mediaItems.length + newFiles.length > 8) {
                setError('Maximum 8 items allowed');
                return;
            }
            const newItems = newFiles.map(file => ({
                file,
                preview: URL.createObjectURL(file), // Note: ensure cleanup in production
                type: file.type.startsWith('video/') ? 'VIDEO' as const : 'IMAGE' as const
            }));
            setMediaItems(prev => [...prev, ...newItems]);
            setError('');
        }
    };

    const removeMedia = (index: number) => {
        // ... (existing logic)
        setMediaItems(prev => {
            const newItems = [...prev];
            URL.revokeObjectURL(newItems[index].preview);
            newItems.splice(index, 1);
            return newItems;
        });
    };

    const handleSubmit = async (e: React.FormEvent | React.MouseEvent, status: 'PUBLISHED' | 'DRAFT' = 'PUBLISHED') => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mediaItems.length === 0) {
                throw new Error('Please add at least one photo or video');
            }

            setLoadingMessage('Uploading media...');
            const uploadPromises = mediaItems.map(async (item, index) => {
                try {
                    const url = await uploadFileClientSide(item.file, item.type);
                    return { url, type: item.type };
                } catch (err: any) {
                    throw new Error(`Failed to upload file ${index + 1}: ${err.message}`);
                }
            });

            const uploadedMedia = await Promise.all(uploadPromises);
            setLoadingMessage('Creating post...');

            const res = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postType: 'SIMPLE',
                    content,
                    visibility,
                    media: uploadedMedia,
                    status,
                    slashes
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
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-4 text-white">Create New Data</h3>

                <div className="space-y-6">
                    <div>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Write a caption..."
                            rows={3}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-white/30 text-white placeholder-white/30 resize-none transition-all"
                        />
                    </div>

                    {/* Slash Input */}
                    <SlashInput slashes={slashes} onChange={setSlashes} />

                    {/* Media Grid */}
                    <div className="grid grid-cols-4 gap-2">
                        {mediaItems.map((item, index) => (
                            <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-white/5 group border border-white/5">
                                {item.type === 'VIDEO' ? (
                                    <video src={item.preview} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                ) : (
                                    <img src={item.preview} alt="preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                )}
                                <button
                                    type="button"
                                    onClick={() => removeMedia(index)}
                                    className="absolute top-1 right-1 p-1 bg-black/60 rounded-full hover:bg-white text-white hover:text-black transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}

                        {mediaItems.length < 8 && (
                            <label className="aspect-square border border-dashed border-white/20 rounded-lg hover:border-white/50 hover:bg-white/5 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 text-white/40 hover:text-white group">
                                <Upload size={20} className="group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-medium">Add Media</span>
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
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-white/30 text-white appearance-none cursor-pointer hover:bg-white/10 transition-colors"
                        >
                            <option value="PUBLIC" className="bg-black text-white">Public</option>
                            <option value="FRIENDS" className="bg-black text-white">Friends Only</option>
                            <option value="PRIVATE" className="bg-black text-white">Private</option>
                        </select>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-white/5 border border-white/20 rounded-lg text-white/80 text-sm flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        {error}
                    </div>
                )}

                <div className="flex gap-3 mt-8 pt-4 border-t border-white/10">
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex-1 py-3 bg-transparent border border-white/20 hover:bg-white/10 rounded-xl font-medium text-white transition-all"
                    >
                        Back
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleSubmit(e, 'DRAFT')}
                        disabled={loading || mediaItems.length === 0}
                        className="flex-1 py-3 bg-transparent border border-white/20 hover:bg-white/10 text-white rounded-xl font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Draft'}
                    </button>
                    <button
                        type="submit"
                        disabled={loading || mediaItems.length === 0}
                        className="flex-1 py-3 bg-white text-black border border-white rounded-xl font-bold hover:bg-gray-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    >
                        {loading ? <><Loader2 className="animate-spin" size={20} /> {loadingMessage}</> : 'Post'}
                    </button>
                </div>
            </div>
        </form>
    );
}

