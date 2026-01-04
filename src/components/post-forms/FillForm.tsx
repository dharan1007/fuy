'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2 } from 'lucide-react';
import { uploadFileClientSide } from '@/lib/upload-helper';

import { useCreatePost } from '@/context/CreatePostContext';

type FillFormProps = {
    onBack?: () => void;
    initialData?: any;
};

export default function FillForm({ onBack: propOnBack, initialData }: FillFormProps) {
    const { onBack: contextOnBack, initialData: contextInitialData } = useCreatePost() || {};
    const onBack = propOnBack || contextOnBack || (() => { });
    const data = initialData || contextInitialData;
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Creating fill...');
    const [error, setError] = useState('');

    const [content, setContent] = useState('');
    const [visibility, setVisibility] = useState('PUBLIC');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [duration, setDuration] = useState(0);

    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setVideoFile(file);

            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                setDuration(Math.floor(video.duration));
                URL.revokeObjectURL(video.src);
            };
            video.src = URL.createObjectURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent | React.MouseEvent, status: 'PUBLISHED' | 'DRAFT' = 'PUBLISHED') => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!videoFile) throw new Error('Please select a video');

            setLoadingMessage("Uploading video...");
            const publicUrl = await uploadFileClientSide(videoFile, 'VIDEO');

            const res = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postType: 'FILL',
                    content,
                    visibility,
                    media: [{ url: publicUrl, type: 'VIDEO' }],
                    duration,
                    status,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create fill');
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
                <h3 className="text-xl font-bold mb-4">Create Fill (Long Video)</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Title/Description</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Describe your video..."
                            rows={3}
                            className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/40 resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Video</label>
                        {videoFile ? (
                            <div className="space-y-2">
                                <div className="p-3 bg-black/20 border border-white/10 rounded-lg">
                                    <p className="text-sm">{videoFile.name}</p>
                                    <p className="text-xs text-white/60 mt-1">Duration: {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setVideoFile(null)}
                                    className="text-sm text-red-400 hover:text-red-300"
                                >
                                    Remove video
                                </button>
                            </div>
                        ) : (
                            <label className="flex items-center justify-center gap-2 p-8 border-2 border-dashed border-white/20 rounded-xl hover:border-white/40 hover:bg-white/5 cursor-pointer transition-colors">
                                <Upload className="w-6 h-6" />
                                <span>Upload Video</span>
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={handleVideoChange}
                                    className="hidden"
                                />
                            </label>
                        )}
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
                        disabled={loading}
                        className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
                    >
                        Back
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleSubmit(e, 'DRAFT')}
                        disabled={loading || !videoFile}
                        className="flex-1 py-3 bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 rounded-xl font-bold hover:bg-yellow-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Save Draft'}
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !videoFile}
                        className="flex-1 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <><Loader2 className="animate-spin" size={20} /> {loadingMessage}</> : 'Create Fill'}
                    </button>
                </div>
            </div>
        </form>
    );
}
