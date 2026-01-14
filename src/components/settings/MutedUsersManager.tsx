
"use client";

import React, { useState, useEffect } from 'react';
import { VolumeX, ChevronDown, ChevronRight, Settings2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const MuteOptionsModal = dynamic(() => import('@/components/MuteOptionsModal').then(mod => mod.MuteOptionsModal), { ssr: false });

export default function MutedUsersManager() {
    const [isOpen, setIsOpen] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);

    useEffect(() => {
        if (isOpen) fetchUsers();
    }, [isOpen]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/interactions/mute');
            const data = await res.json();
            if (data.mutedUsers) setUsers(data.mutedUsers);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleUnmute = async (targetUserId: string) => {
        try {
            const res = await fetch(`/api/interactions/mute?targetUserId=${targetUserId}`, { method: 'DELETE' });
            if (res.ok) {
                setUsers(prev => prev.filter(u => u.mutedUserId !== targetUserId));
            }
        } catch (e) {
            console.error(e);
            alert("Failed to unmute");
        }
    };

    const formatTypes = (jsonTypes: string) => {
        try {
            const types = JSON.parse(jsonTypes);
            if (Array.isArray(types)) {
                if (types.includes("ALL")) return "All Content";
                return types.join(", ");
            }
        } catch { return "All Content"; }
        return "All Content";
    };

    return (
        <section className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                <div className="flex items-center gap-3">
                    <VolumeX className="w-5 h-5 text-white" />
                    <h2 className="text-xl font-bold text-white uppercase tracking-wider">Muted Users ({users.length > 0 ? users.length : (isOpen ? '...' : '')})</h2>
                </div>
                {isOpen ? <ChevronDown className="w-5 h-5 text-white" /> : <ChevronRight className="w-5 h-5 text-white" />}
            </div>

            {isOpen && (
                <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                    {loading ? (
                        <p className="text-gray-500 text-sm">Loading...</p>
                    ) : users.length === 0 ? (
                        <p className="text-gray-500 text-sm">No muted users.</p>
                    ) : (
                        users.map((item) => (
                            <div key={item.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={item.mutedUser?.profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${item.mutedUserId}`}
                                        alt="Avatar"
                                        className="w-8 h-8 rounded-full bg-gray-700"
                                    />
                                    <div>
                                        <p className="font-bold text-sm text-white">{item.mutedUser?.profile?.displayName || item.mutedUser?.name || "User"}</p>
                                        <p className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded inline-block mt-1">
                                            Muted: {formatTypes(item.mutedTypes)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setEditingUser(item)}
                                        className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors"
                                        title="Edit Mute Settings"
                                    >
                                        <Settings2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleUnmute(item.mutedUserId)}
                                        className="text-xs border border-white/30 px-3 py-1 rounded hover:bg-white hover:text-black transition-colors"
                                    >
                                        UNMUTE
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {editingUser && (
                <MuteOptionsModal
                    isOpen={!!editingUser}
                    onClose={() => setEditingUser(null)}
                    targetUserId={editingUser.mutedUserId}
                    targetUserName={editingUser.mutedUser?.profile?.displayName}
                    onMuteComplete={() => {
                        setEditingUser(null);
                        fetchUsers();
                    }}
                />
            )}
        </section>
    );
}
