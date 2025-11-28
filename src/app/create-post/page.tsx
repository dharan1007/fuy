'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Image as ImageIcon, Link as LinkIcon, Type } from 'lucide-react';
import Link from 'next/link';
import ScrollStarfield from '@/components/ScrollStarfield';

type CreatePostTab = 'text' | 'media' | 'link';

export default function CreatePostPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [createPostTab, setCreatePostTab] = useState<CreatePostTab>('text');
    const [postTitle, setPostTitle] = useState('');
    const [postContent, setPostContent] = useState('');
    const [postFeature, setPostFeature] = useState('OTHER');
    const [postVisibility, setPostVisibility] = useState('PUBLIC');
    const [postError, setPostError] = useState('');
    const [postSubmitting, setPostSubmitting] = useState(false);

    const features = ['JOURNAL', 'JOY', 'AWE', 'BONDS', 'SERENDIPITY', 'CHECKIN', 'PROGRESS', 'OTHER'];
    const visibilities = ['PUBLIC', 'FRIENDS', 'PRIVATE'];

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        setPostError('');
        setPostSubmitting(true);

        try {
            if (!postContent.trim()) {
                setPostError('Post content cannot be empty');
                setPostSubmitting(false);
                return;
            }

            const res = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: postTitle,
                    content: postContent,
                    feature: postFeature,
                    visibility: postVisibility,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setPostError(data.details || data.error || 'Failed to create post');
                setPostSubmitting(false);
                return;
            }

            // Redirect to home on success
            router.push('/');
            router.refresh();
        } catch (err) {
            setPostError('Something went wrong. Please try again.');
            console.error(err);
        } finally {
            setPostSubmitting(false);
        }
    };

    if (status === 'loading') {
        return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
    }

    if (status === 'unauthenticated') {
        router.push('/');
        return null;
    }

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col">
            <ScrollStarfield />

            {/* Header */}
            <header className="sticky top-0 z-50 px-4 py-4 bg-black/50 backdrop-blur-md border-b border-white/10">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-lg font-bold">Create Post</h1>
                    <div className="w-10" /> {/* Spacer for centering */}
                </div>
            </header>

            <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 relative z-10">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-white/10">
                        <button
                            onClick={() => setCreatePostTab('text')}
                            className={`flex-1 py-4 text-sm font-medium text-center transition-colors flex items-center justify-center gap-2 ${createPostTab === 'text'
                                    ? 'bg-white/10 text-white'
                                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <Type className="w-4 h-4" />
                            Text
                        </button>
                        <button
                            onClick={() => setCreatePostTab('media')}
                            className={`flex-1 py-4 text-sm font-medium text-center transition-colors flex items-center justify-center gap-2 border-l border-white/10 ${createPostTab === 'media'
                                    ? 'bg-white/10 text-white'
                                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <ImageIcon className="w-4 h-4" />
                            Media
                        </button>
                        <button
                            onClick={() => setCreatePostTab('link')}
                            className={`flex-1 py-4 text-sm font-medium text-center transition-colors flex items-center justify-center gap-2 border-l border-white/10 ${createPostTab === 'link'
                                    ? 'bg-white/10 text-white'
                                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <LinkIcon className="w-4 h-4" />
                            Link
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleCreatePost} className="p-6 space-y-6">
                        {createPostTab === 'text' && (
                            <>
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="Title (optional)"
                                        value={postTitle}
                                        onChange={(e) => setPostTitle(e.target.value)}
                                        maxLength={100}
                                        className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-base bg-black/20 text-white placeholder-white/40"
                                    />
                                    <textarea
                                        placeholder="What's on your mind?"
                                        value={postContent}
                                        onChange={(e) => setPostContent(e.target.value)}
                                        maxLength={2000}
                                        rows={8}
                                        className="w-full px-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-base bg-black/20 text-white placeholder-white/40 resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-white/60 ml-1">Category</label>
                                        <div className="relative">
                                            <select
                                                value={postFeature}
                                                onChange={(e) => setPostFeature(e.target.value)}
                                                className="w-full px-4 py-2.5 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-sm bg-black/20 text-white appearance-none"
                                            >
                                                {features.map(f => <option key={f} value={f} className="bg-gray-900">{f}</option>)}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-white/60 ml-1">Visibility</label>
                                        <div className="relative">
                                            <select
                                                value={postVisibility}
                                                onChange={(e) => setPostVisibility(e.target.value)}
                                                className="w-full px-4 py-2.5 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-sm bg-black/20 text-white appearance-none"
                                            >
                                                {visibilities.map(v => <option key={v} value={v} className="bg-gray-900">{v}</option>)}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {createPostTab === 'media' && (
                            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-white/20 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                                <ImageIcon className="w-12 h-12 text-white/40 mb-3" />
                                <p className="text-sm font-medium text-white/80">Upload images or videos</p>
                                <p className="text-xs text-white/40 mt-1">Drag and drop or click to browse</p>
                            </div>
                        )}

                        {createPostTab === 'link' && (
                            <div className="space-y-4">
                                <div className="relative">
                                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                                    <input
                                        type="url"
                                        placeholder="Paste your link here..."
                                        className="w-full pl-12 pr-4 py-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-base bg-black/20 text-white placeholder-white/40"
                                    />
                                </div>
                                <p className="text-xs text-white/50 text-center">Share interesting articles, videos, or resources with your network</p>
                            </div>
                        )}

                        {postError && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center gap-2">
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {postError}
                            </div>
                        )}

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={postSubmitting || !postContent.trim()}
                                className="w-full py-3.5 bg-white text-black rounded-xl font-bold text-base hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/10"
                            >
                                {postSubmitting ? 'Posting...' : 'Share Post'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
