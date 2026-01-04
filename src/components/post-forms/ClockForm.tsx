'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Clock, Loader2 } from 'lucide-react';

import { useCreatePost } from '@/context/CreatePostContext';
import { uploadFileClientSide } from '@/lib/upload-helper';

type ClockFormProps = {
    onBack?: () => void;
    initialData?: any;
};

export default function ClockForm({ onBack: propOnBack, initialData }: ClockFormProps) {
    const { onBack: contextOnBack, initialData: contextInitialData } = useCreatePost() || {};
    const onBack = propOnBack || contextOnBack || (() => { });
    const data = initialData || contextInitialData;
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [mediaUrl, setMediaUrl] = useState('');
    const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
    const [duration, setDuration] = useState(24); // Default 24 hours
    const [visibility, setVisibility] = useState('PUBLIC');
    const [preview, setPreview] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Create preview
        const reader = new FileReader();
        reader.onload = (event) => {
            setPreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);

        // Determine media type
        const type = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
        setMediaType(type);

        try {
            const url = await uploadFileClientSide(file, type);
            if (!url) throw new Error('Upload failed - invalid URL returned');
            setMediaUrl(url);
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.message || 'Failed to upload file');
        }
    };

    const handleSubmit = async (e: React.FormEvent | React.MouseEvent, status: 'PUBLISHED' | 'DRAFT' = 'PUBLISHED') => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!mediaUrl) throw new Error('Please upload an image or video');

            const res = await fetch('/api/posts/clocks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mediaUrl,
                    mediaType,
                    duration, // in hours
                    visibility,
                    status,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create clock');
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
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Clock className="w-6 h-6" />
                    Create Clock (Story)
                </h3>

                <div className="space-y-4">
                    {/* Media Upload */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Upload Image or Video</label>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*,video/*"
                            className="hidden"
                        />
                        {preview ? (
                            <div className="relative aspect-[9/16] max-h-[400px] mx-auto rounded-xl overflow-hidden border border-white/20">
                                {mediaType === 'VIDEO' ? (
                                    <video src={preview} className="w-full h-full object-cover" controls />
                                ) : (
                                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPreview(null);
                                        setMediaUrl('');
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }}
                                    className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full aspect-[9/16] max-h-[300px] flex flex-col items-center justify-center gap-3 border-2 border-dashed border-white/20 rounded-xl hover:border-white/40 transition-colors"
                            >
                                <Upload className="w-10 h-10 text-white/40" />
                                <span className="text-white/60">Click to upload</span>
                                <span className="text-xs text-white/40">Image or Video (max 15s for video)</span>
                            </button>
                        )}
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Duration (hours)</label>
                        <div className="flex gap-2">
                            {[1, 6, 12, 24, 48].map((h) => (
                                <button
                                    key={h}
                                    type="button"
                                    onClick={() => setDuration(h)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${duration === h
                                        ? 'bg-white text-black'
                                        : 'bg-white/10 hover:bg-white/20 text-white'
                                        }`}
                                >
                                    {h}h
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Visibility */}
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
                        type="button"
                        onClick={(e) => handleSubmit(e, 'DRAFT')}
                        disabled={loading || !mediaUrl}
                        className="flex-1 py-3 bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 rounded-xl font-bold hover:bg-yellow-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Save Draft'}
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !mediaUrl}
                        className="flex-1 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Create Clock'}
                    </button>
                </div>
            </div>
        </form>
    );
}
