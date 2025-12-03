import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function SearchOverlay() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const searchUsers = async () => {
            if (!query.trim()) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                const res = await fetch(`/api/search/users?search=${encodeURIComponent(query)}`);
                if (res.ok) {
                    const data = await res.json();
                    setResults(data.users || []);
                    setIsOpen(true);
                }
            } catch (error) {
                console.error('Search failed:', error);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(searchUsers, 300);
        return () => clearTimeout(timeoutId);
    }, [query]);

    return (
        <div className="absolute top-0 left-0 right-0 z-10 flex justify-center pt-8 px-4 pointer-events-none">
            <div className="w-full max-w-md pointer-events-auto" ref={searchRef}>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl leading-5 bg-black/40 backdrop-blur-xl text-white placeholder-gray-400 focus:outline-none focus:bg-black/60 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 sm:text-sm transition-all shadow-lg"
                        placeholder="Search users..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => query && setIsOpen(true)}
                    />

                    {/* Results Dropdown */}
                    {isOpen && (results.length > 0 || loading) && (
                        <div className="absolute mt-2 w-full rounded-xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden animate-fadeIn">
                            {loading ? (
                                <div className="p-4 text-center text-gray-400 text-sm">Searching...</div>
                            ) : (
                                <ul className="max-h-60 overflow-y-auto py-2">
                                    {results.map((user) => (
                                        <li key={user.id}>
                                            <Link
                                                href={`/profile/${user.id}`}
                                                className="flex items-center px-4 py-3 hover:bg-white/10 transition-colors"
                                                onClick={() => setIsOpen(false)}
                                            >
                                                {user.profile?.avatarUrl ? (
                                                    <img
                                                        src={user.profile.avatarUrl}
                                                        alt=""
                                                        className="h-8 w-8 rounded-full object-cover border border-white/20"
                                                    />
                                                ) : (
                                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold border border-white/20">
                                                        {user.name?.[0] || 'U'}
                                                    </div>
                                                )}
                                                <div className="ml-3">
                                                    <p className="text-sm font-medium text-white">
                                                        {user.profile?.displayName || user.name}
                                                    </p>
                                                    <p className="text-xs text-gray-400">@{user.username || 'user'}</p>
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
