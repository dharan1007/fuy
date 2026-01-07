'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import FeedPostItem from '@/components/FeedPostItem';
import { ArrowLeft } from 'lucide-react';
import { useSession } from '@/hooks/use-session';

export default function PostDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const [post, setPost] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const res = await fetch(`/api/posts/${params.postId}`);
                if (!res.ok) throw new Error('Failed to load post');
                const data = await res.json();
                setPost(data);
            } catch (err) {
                setError('Post not found or deleted');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (params.postId) {
            fetchPost();
        }
    }, [params.postId]);

    const handleBack = () => {
        if (window.history.length > 2) {
            router.back();
        } else {
            router.push('/explore');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
                <h1 className="text-xl font-bold mb-4">{error || 'Post not found'}</h1>
                <button
                    onClick={() => router.push('/explore')}
                    className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20"
                >
                    Go Home
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10 p-4 flex items-center gap-4">
                <button
                    onClick={handleBack}
                    className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <span className="font-bold text-lg">Post</span>
            </div>

            {/* Content Container */}
            <div className="flex-1 w-full max-w-2xl mx-auto p-4">
                <FeedPostItem
                    post={post}
                    currentUserId={session?.user?.id}
                    className="w-full"
                    isProfileView={false} // Use standard view
                />
            </div>
        </div>
    );
}
