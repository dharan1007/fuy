'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Plus, Search, Link as LinkIcon, Lock, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { uploadFileClientSide } from '@/lib/upload-helper';

import { useCreatePost } from '@/context/CreatePostContext';

type ChapterFormProps = {
    onBack?: () => void;
    initialData?: any;
};

type ConnectablePost = {
    id: string;
    content: string;
    type: string;
    author: string;
    authorAvatar: string;
    mediaUrl: string;
    createdAt: string;
    isOwner: boolean;
};

export default function ChapterForm({ onBack: propOnBack, initialData }: ChapterFormProps) {
    const { onBack: contextOnBack, initialData: contextInitialData } = useCreatePost() || {};
    const onBack = propOnBack || contextOnBack || (() => { });
    const data = initialData || contextInitialData;
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Creating chapter...');
    const [error, setError] = useState('');

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState('PUBLIC');
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);

    // Connection State
    const [linkedPost, setLinkedPost] = useState<ConnectablePost | null>(null);
    const [showConnectionModal, setShowConnectionModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [availablePosts, setAvailablePosts] = useState<ConnectablePost[]>([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (showConnectionModal) {
            fetchConnectablePosts();
        }
    }, [showConnectionModal, searchQuery]);

    const fetchConnectablePosts = async () => {
        setSearching(true);
        try {
            const res = await fetch(`/api/chapters/connectable?q=${searchQuery}`);
            if (res.ok) {
                const data = await res.json();
                setAvailablePosts(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSearching(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setMediaFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setMediaFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent | React.MouseEvent, status: 'PUBLISHED' | 'DRAFT' = 'PUBLISHED') => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Upload all media files first
            const urls: string[] = [];
            setLoadingMessage('Uploading files...');
            for (let i = 0; i < mediaFiles.length; i++) {
                const file = mediaFiles[i];
                setLoadingMessage(`Uploading file ${i + 1} of ${mediaFiles.length}...`);
                const url = await uploadFileClientSide(file, 'chapters');
                urls.push(url);
            }
            setLoadingMessage('Creating chapter...');

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
                    linkedPostId: linkedPost?.id, // Pass the linked post ID
                    status
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create chapter');
            }

            // If visibility is private but chapter access is different, that's handled in the backend/schema defaults
            // Assuming the simple POST creation handles relations if linkedPostId is present.

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
                    {/* Connection Section */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Connect to Chapter/Post</label>
                        {linkedPost ? (
                            <div className="flex items-center justify-between p-3 bg-indigo-500/20 border border-indigo-500/40 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg overflow-hidden relative">
                                        <Image src={linkedPost.mediaUrl} alt="Linked" fill className="object-cover" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-white">Continued from: {linkedPost.author}</span>
                                        <span className="text-xs text-white/60 line-clamp-1">{linkedPost.content}</span>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setLinkedPost(null)} className="p-2 hover:bg-white/10 rounded-full">
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowConnectionModal(true)}
                                className="w-full py-3 border-2 border-dashed border-white/20 rounded-xl hover:border-white/40 hover:bg-white/5 transition-colors flex items-center justify-center gap-2 text-white/60"
                            >
                                <LinkIcon size={18} />
                                <span>Link to existing post or chapter</span>
                            </button>
                        )}
                    </div>

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
                        type="button"
                        onClick={(e) => handleSubmit(e, 'DRAFT')}
                        disabled={loading || mediaFiles.length === 0}
                        className="flex-1 py-3 bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 rounded-xl font-bold hover:bg-yellow-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Save Draft'}
                    </button>
                    <button
                        type="submit"
                        disabled={loading || mediaFiles.length === 0}
                        className="flex-1 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <><Loader2 className="animate-spin" size={20} /> {loadingMessage}</> : 'Create Chapter'}
                    </button>
                </div>
            </div>

            {/* Connection Modal */}
            {showConnectionModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-lg font-bold">Connect to Post</h3>
                            <button onClick={() => setShowConnectionModal(false)} className="p-2 hover:bg-white/10 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 border-b border-white/10 bg-[#161616]">
                            <div className="flex items-center bg-[#222] rounded-xl px-3 py-2 border border-[#333]">
                                <Search size={18} className="text-gray-400 mr-2" />
                                <input
                                    type="text"
                                    placeholder="Search by caption or user..."
                                    className="bg-transparent border-none text-white focus:outline-none flex-1 text-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {searching ? (
                                <div className="text-center py-10 text-gray-400">Loading...</div>
                            ) : availablePosts.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {availablePosts.map(post => (
                                        <div
                                            key={post.id}
                                            onClick={() => {
                                                setLinkedPost(post);
                                                setShowConnectionModal(false);
                                            }}
                                            className="group relative aspect-square bg-gray-800 rounded-lg overflow-hidden cursor-pointer border border-transparent hover:border-pink-500 transition-all"
                                        >
                                            <Image src={post.mediaUrl} alt={post.content} fill className="object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2">
                                                <span className="text-xs font-bold text-white line-clamp-1">{post.author}</span>
                                                <span className="text-[10px] text-gray-300 line-clamp-1">{post.content || 'No description'}</span>
                                            </div>
                                            {!post.isOwner && (
                                                <div className="absolute top-2 right-2">
                                                    {/* Indicator for connected/access logic if needed */}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-500">
                                    <p>No posts found.</p>
                                    <p className="text-sm">Try searching for a friend or caption.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
}
