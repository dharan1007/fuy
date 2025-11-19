'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Post {
  id: string;
  userId: string;
  content: string;
  feature: string;
  visibility: string;
  joyScore: number;
  connectionScore: number;
  createdAt: string;
  user?: {
    name: string;
    profile?: {
      displayName: string;
      avatarUrl: string;
    };
  };
  media?: {
    id: string;
    url: string;
    type: string;
  }[];
  likes?: { id: string }[];
  comments?: { id: string }[];
}

export default function ExplorePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/posts?limit=50');
        if (!response.ok) {
          throw new Error('Failed to fetch posts');
        }
        const data = await response.json();
        setPosts(data.posts || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching posts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black relative z-20 pt-20 pb-20">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">Explore</h1>
          <p className="text-white/80">Discover amazing content from the community</p>
        </div>

        {/* Posts Grid */}
        {posts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <div
                key={post.id}
                className="group relative rounded-2xl overflow-hidden bg-white/10 backdrop-blur-2xl border border-white/20 hover:border-white/40 transition-all duration-300 hover:shadow-xl cursor-pointer"
              >
                {/* Media */}
                {post.media && post.media.length > 0 ? (
                  <div className="relative w-full h-64 overflow-hidden bg-black/50">
                    {post.media[0].type === 'IMAGE' ? (
                      <img
                        src={post.media[0].url}
                        alt="Post media"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <video
                        src={post.media[0].url}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                ) : (
                  <div className="w-full h-64 bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center">
                    <span className="text-white/40 text-3xl">📄</span>
                  </div>
                )}

                {/* Content */}
                <div className="p-4 flex flex-col h-full">
                  {/* User info */}
                  <Link
                    href={`/profile/${post.userId}`}
                    className="flex items-center gap-3 mb-3 hover:opacity-75 transition-opacity"
                  >
                    {post.user?.profile?.avatarUrl && (
                      <img
                        src={post.user.profile.avatarUrl}
                        alt={post.user.profile.displayName}
                        className="w-8 h-8 rounded-full object-cover border border-white/20"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {post.user?.profile?.displayName || post.user?.name}
                      </p>
                    </div>
                  </Link>

                  {/* Post content */}
                  <p className="text-white/80 text-sm mb-3 line-clamp-2">{post.content}</p>

                  {/* Feature badge */}
                  <div className="mb-3">
                    <span className="inline-block px-2 py-1 bg-blue-600/30 border border-blue-400/50 rounded text-xs text-blue-300 font-medium">
                      {post.feature}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-4 mt-auto">
                    <div className="flex items-center gap-1 text-white/70 text-sm">
                      <span>❤️</span>
                      <span>{post.likes?.length || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-white/70 text-sm">
                      <span>💬</span>
                      <span>{post.comments?.length || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-white/70 text-sm">
                      <span>✨</span>
                      <span>{post.joyScore || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center min-h-96">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🔍</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">No posts to explore yet</h2>
              <p className="text-white/80 mb-6 max-w-md">
                The community hasn't created any posts yet. Check back soon or share your own content to get started!
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
