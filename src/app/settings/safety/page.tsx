'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/use-session';
import { SpaceBackground } from '@/components/SpaceBackground';
import AppHeader from '@/components/AppHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import { UserX, Ghost, EyeOff, Check, X, Ban, Trash2, PauseCircle } from 'lucide-react';
import Image from 'next/image';

type Tab = 'blocked' | 'paused' | 'hidden';

export default function SafetySettingsPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [activeTab, setActiveTab] = useState<Tab>('blocked');
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchData();
        } else if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/safety');
            if (res.ok) {
                const data = await res.json();
                if (activeTab === 'blocked') setItems(data.blocked || []);
                else if (activeTab === 'paused') setItems(data.ghosted || []);
                else if (activeTab === 'hidden') setItems(data.hidden || []);
            }
        } catch (e) {
            console.error("Failed to fetch safety data", e);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: string, type: 'BLOCKED' | 'GHOSTED' | 'HIDDEN') => {
        if (!confirm(`Are you sure you want to remove this ${activeTab} item?`)) return;

        try {
            const res = await fetch('/api/safety', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'DELETE', id, type })
            });

            if (res.ok) {
                setItems(prev => prev.filter(i => i.id !== id));
            } else {
                alert("Failed to perform action");
            }
        } catch (e) {
            console.error("Action failed", e);
            alert("Action failed");
        }
    };

    if (status === 'loading') return <LoadingSpinner variant="auth" />;

    return (
        <div className="min-h-screen bg-black text-white relative font-sans">
            <SpaceBackground />
            <AppHeader title="Safety & Privacy" showBackButton showSettingsAndLogout={false} />

            <div className="max-w-4xl mx-auto px-6 py-8 relative z-10">
                {/* Tabs */}
                <div className="flex justify-center gap-4 mb-8">
                    <button
                        onClick={() => setActiveTab('blocked')}
                        className={`px-6 py-2 rounded-full font-bold transition-all flex items-center gap-2 ${activeTab === 'blocked' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                        <UserX size={18} /> Blocked
                    </button>
                    <button
                        onClick={() => setActiveTab('paused')}
                        className={`px-6 py-2 rounded-full font-bold transition-all flex items-center gap-2 ${activeTab === 'paused' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                        <PauseCircle size={18} /> Paused
                    </button>
                    <button
                        onClick={() => setActiveTab('hidden')}
                        className={`px-6 py-2 rounded-full font-bold transition-all flex items-center gap-2 ${activeTab === 'hidden' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                        <EyeOff size={18} /> Hidden
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <LoadingSpinner variant="default" />
                    </div>
                ) : (
                    <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-lg p-6 min-h-[400px]">
                        {items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-20 text-white/40">
                                {activeTab === 'blocked' && <UserX size={48} className="mb-4 opacity-50" />}
                                {activeTab === 'paused' && <PauseCircle size={48} className="mb-4 opacity-50" />}
                                {activeTab === 'hidden' && <EyeOff size={48} className="mb-4 opacity-50" />}
                                <p>No {activeTab} items found.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {items.map(item => (
                                    <div key={item.id} className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-between group hover:border-white/30 transition-all">
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            {activeTab === 'hidden' ? (
                                                <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                                                    {item.mediaUrl ? (
                                                        <img src={item.mediaUrl} className="w-full h-full object-cover" alt="Hidden Post" />
                                                    ) : (
                                                        <EyeOff size={20} className="text-white/50" />
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden shrink-0">
                                                    {item.avatarUrl ? (
                                                        <img src={item.avatarUrl} className="w-full h-full object-cover" alt={item.name} />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-white/50 font-bold text-lg">
                                                            {item.name?.[0]}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="min-w-0">
                                                <p className="font-bold text-white truncate text-sm">
                                                    {activeTab === 'hidden' ? (item.content || 'Hidden Post') : (item.displayName || item.name)}
                                                </p>
                                                {activeTab !== 'hidden' && (
                                                    <p className="text-xs text-white/50 truncate">@{item.name}</p>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleAction(item.id, activeTab === 'blocked' ? 'BLOCKED' : activeTab === 'paused' ? 'GHOSTED' : 'HIDDEN')}
                                            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 border border-transparent transition-all text-xs font-bold uppercase tracking-wider"
                                        >
                                            {activeTab === 'blocked' ? 'Unblock' : activeTab === 'paused' ? 'Unpause' : 'Unhide'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
