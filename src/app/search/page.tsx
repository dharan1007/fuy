'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Search as SearchIcon, ArrowLeft, X } from 'lucide-react';
import Link from 'next/link';

export default function SearchPage() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{ users: any[], posts: any[] }>({ users: [], posts: [] });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!query.trim()) {
                setResults({ users: [], posts: [] });
                return;
            }
            setLoading(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=all`);
                if (res.ok) {
                    const data = await res.json();
                    setResults({ users: data.users || [], posts: data.posts || [] });
                }
            } catch (e) {
                console.error('Search error:', e);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="max-w-2xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex-1 relative">
                        <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search users, posts, content..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                            className="w-full pl-12 pr-10 py-3 bg-white/10 border border-white/20 rounded-full text-white placeholder:text-gray-500 focus:outline-none focus:border-white/40"
                        />
                        {query && (
                            <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Results */}
                {loading && <div className="text-center py-8 text-gray-400">Searching...</div>}

                {!loading && query && (
                    <div className="space-y-6">
                        {/* Users */}
                        {results.users.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-gray-400 mb-3">PEOPLE</h3>
                                <div className="space-y-2">
                                    {results.users.map((user: any) => (
                                        <Link key={user.id} href={`/profile/${user.id}`} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                                            <img src={user.avatarUrl || '/default-avatar.png'} className="w-10 h-10 rounded-full" />
                                            <div>
                                                <p className="font-medium">{user.displayName || user.name}</p>
                                                <p className="text-sm text-gray-400">@{user.name}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Posts */}
                        {results.posts.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-gray-400 mb-3">POSTS</h3>
                                <div className="space-y-2">
                                    {results.posts.map((post: any) => (
                                        <Link key={post.id} href={`/post/${post.id}`} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                                            {post.image && <img src={post.image} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />}
                                            <div>
                                                <p className="line-clamp-2">{post.content}</p>
                                                <p className="text-sm text-gray-400 mt-1">by {post.author}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {results.users.length === 0 && results.posts.length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                                No results found for "{query}"
                            </div>
                        )}
                    </div>
                )}

                {!query && (
                    <div className="text-center py-12 text-gray-500">
                        <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Start typing to search</p>
                    </div>
                )}
            </div>
        </div>
    );
}
