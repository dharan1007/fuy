'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Plus } from 'lucide-react';

type ChapterFormProps = {
    onBack: () => void;
};

export default function ChapterForm({ onBack }: ChapterFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState('PUBLIC');
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setMediaFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setMediaFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Upload all media files first
            const urls: string[] = [];
            for (const file of mediaFiles) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('type', file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image');

                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!uploadRes.ok) {
                    const errorData = await uploadRes.json();
                    throw new Error(errorData.error || 'File upload failed');
                }

                const uploadData = await uploadRes.json();
                urls.push(uploadData.url);
            }

            // Create chapter post
            const res = await fetch('/api/posts/chapters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    description,
                    content: description,
                    visibility,
                    mediaUrls: urls,
                    mediaTypes: mediaFiles.map(f =>
                        f.type.startsWith('video') ? 'VIDEO' :
                            f.type.startsWith('audio') ? 'AUDIO' : 'IMAGE'
                    ),
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create chapter');
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
                <h3 className="text-xl font-bold mb-4">Create Chapter</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Chapter title..."
                            className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/40"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe your chapter..."
                            rows={4}
                            className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/40 resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Media Files</label>
                        <div className="space-y-2">
                            {mediaFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-black/20 border border-white/10 rounded-lg">
                                    <span className="text-sm truncate flex-1">{file.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(index)}
                                        className="ml-2 p-1 hover:bg-white/10 rounded"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}

                            <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-white/20 rounded-xl hover:border-white/40 hover:bg-white/5 cursor-pointer transition-colors">
                                <Upload className="w-5 h-5" />
                                <span>Add Media</span>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*,video/*,audio/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </label>
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
                        disabled={loading || mediaFiles.length === 0}
                        className="flex-1 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Creating...' : 'Create Chapter'}
                    </button>
                </div>
            </div>
        </form>
    );
}
