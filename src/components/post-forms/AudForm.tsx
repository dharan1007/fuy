'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';

import { useCreatePost } from '@/context/CreatePostContext';

type AudFormProps = {
    onBack?: () => void; // Optional for backward compatibility/prop usage
    initialData?: any;
};

export default function AudForm({ onBack: propOnBack, initialData }: AudFormProps) {
    const { onBack: contextOnBack, initialData: contextInitialData } = useCreatePost() || {}; // Optional chaining in case used outside provider
    const onBack = propOnBack || contextOnBack || (() => { });
    const data = initialData || contextInitialData;
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Creating audio...');
    const [error, setError] = useState('');

    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [visibility, setVisibility] = useState('PUBLIC');
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [duration, setDuration] = useState(0);

    const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAudioFile(file);

            const audio = document.createElement('audio');
            audio.preload = 'metadata';
            audio.onloadedmetadata = () => {
                setDuration(Math.floor(audio.duration));
                URL.revokeObjectURL(audio.src);
            };
            audio.src = URL.createObjectURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent | React.MouseEvent, status: 'PUBLISHED' | 'DRAFT' = 'PUBLISHED') => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!audioFile) throw new Error('Please select an audio file');

            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(7);
            const ext = audioFile.name.split('.').pop();
            const filename = `audios/${timestamp}-${randomStr}.${ext}`;

            setLoadingMessage("Uploading audio...");

            // Direct upload to Supabase to bypass Vercel 4.5MB limit
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('media')
                .upload(filename, audioFile, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.error("Direct upload error:", uploadError);
                throw new Error("Audio upload failed: " + uploadError.message);
            }

            const { data: { publicUrl } } = supabase.storage
                .from('media')
                .getPublicUrl(filename);

            const res = await fetch('/api/posts/auds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: title,
                    visibility,
                    audioUrl: publicUrl,
                    duration,
                    title,
                    artist,
                    status,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create audio post');
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
                <h3 className="text-xl font-bold mb-4">Create Audio Post</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Audio title..."
                            className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/40"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Artist (Optional)</label>
                        <input
                            type="text"
                            value={artist}
                            onChange={(e) => setArtist(e.target.value)}
                            placeholder="Artist name..."
                            className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/40"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Audio File</label>
                        {audioFile ? (
                            <div className="space-y-2">
                                <div className="p-3 bg-black/20 border border-white/10 rounded-lg">
                                    <p className="text-sm">{audioFile.name}</p>
                                    <p className="text-xs text-white/60 mt-1">Duration: {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setAudioFile(null)}
                                    className="text-sm text-red-400 hover:text-red-300"
                                >
                                    Remove audio
                                </button>
                            </div>
                        ) : (
                            <label className="flex items-center justify-center gap-2 p-8 border-2 border-dashed border-white/20 rounded-xl hover:border-white/40 hover:bg-white/5 cursor-pointer transition-colors">
                                <Upload className="w-6 h-6" />
                                <span>Upload Audio</span>
                                <input
                                    type="file"
                                    accept="audio/*"
                                    onChange={handleAudioChange}
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
                        disabled={loading || !audioFile}
                        className="flex-1 py-3 bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 rounded-xl font-bold hover:bg-yellow-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Save Draft'}
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !audioFile}
                        className="flex-1 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <><Loader2 className="animate-spin" size={20} /> {loadingMessage}</> : 'Create Audio'}
                    </button>
                </div>
            </div>
        </form>
    );
}
