
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/use-session';
import { SpaceBackground } from '@/components/SpaceBackground';
import AppHeader from '@/components/AppHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ChevronLeft, Globe, Users, Lock, UserPlus, Check, Search, X } from 'lucide-react';
import Image from 'next/image';

const PRIVACY_OPTIONS = [
    { value: 'PUBLIC', label: 'Public', icon: Globe, description: 'Everyone on FUY can see this' },
    { value: 'FOLLOWERS', label: 'Followers Only', icon: Users, description: 'Only your followers can see this' },
    { value: 'SELECTED', label: 'Selected Users', icon: UserPlus, description: 'Only specific people you choose' },
    { value: 'PRIVATE', label: 'Only Me', icon: Lock, description: 'Visible only to you' }
];

export default function VisibilitySettingsPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState({
        defaultPostPrivacy: 'PUBLIC',
        profileCardPrivacy: 'PUBLIC',
        stalkMePrivacy: 'PUBLIC'
    });

    // Allowlist State
    const [showUserModal, setShowUserModal] = useState(false);
    const [activeFeature, setActiveFeature] = useState<string | null>(null);
    const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchSettings();
        }
    }, [status]);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings/privacy');
            if (res.ok) {
                const data = await res.json();
                setSettings({
                    defaultPostPrivacy: data.defaultPostVisibility || 'PUBLIC',
                    profileCardPrivacy: data.profileCardPrivacy || 'PUBLIC',
                    stalkMePrivacy: data.stalkMePrivacy || 'PUBLIC'
                });
            }
        } catch (e) {
            console.error('Failed to load settings', e);
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async (key: string, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        try {
            const payload: any = {};
            if (key === 'defaultPostPrivacy') payload.defaultPostVisibility = value;
            if (key === 'profileCardPrivacy') payload.profileCardPrivacy = value;
            if (key === 'stalkMePrivacy') payload.stalkMePrivacy = value;

            await fetch('/api/settings/privacy', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (value === 'SELECTED') {
                const feature = key === 'defaultPostPrivacy' ? 'POSTS'
                    : key === 'profileCardPrivacy' ? 'CARD'
                        : 'STALK_ME';
                openUserModal(feature);
            }
        } catch (e) {
            console.error('Failed to update setting', e);
        }
    };

    const openUserModal = async (feature: string) => {
        setActiveFeature(feature);
        setShowUserModal(true);
        // Load allowlist
        try {
            const res = await fetch(`/api/settings/privacy/allowlist?feature=${feature}`);
            if (res.ok) {
                const users = await res.json();
                setSelectedUsers(users);
            }
        } catch (e) {
            console.error('Failed to load allowlist', e);
        }
    };

    const searchUsers = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value;
        setSearchQuery(text);
        if (text.length < 2) {
            setSearchResults([]);
            return;
        }
        setSearchLoading(true);
        try {
            const res = await fetch(`/api/users/search?q=${encodeURIComponent(text)}`);
            if (res.ok) {
                setSearchResults(await res.json());
            }
        } finally {
            setSearchLoading(false);
        }
    };

    const toggleUser = async (user: any) => {
        if (!activeFeature) return;
        const exists = selectedUsers.find(u => u.id === user.id);

        // Optimistic
        if (exists) {
            setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
        } else {
            setSelectedUsers(prev => [...prev, user]);
        }

        try {
            const method = exists ? 'DELETE' : 'POST';
            await fetch('/api/settings/privacy/allowlist', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userIds: [user.id],
                    feature: activeFeature
                })
            });
        } catch (e) {
            console.error('Failed to update list', e);
        }
    };


    if (status === 'loading' || loading) return <LoadingSpinner variant="auth" />;
    if (status === 'unauthenticated') { router.push('/login'); return null; }

    const renderSection = (title: string, settingKey: string, currentValue: string) => (
        <section className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-wider border-b border-white/10 pb-2">
                {title}
            </h2>
            <div className="grid gap-3">
                {PRIVACY_OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => updateSetting(settingKey, opt.value)}
                        className={`flex items-center justify-between p-4 rounded-lg border transition-all ${currentValue === opt.value
                                ? 'bg-white/10 border-white/40'
                                : 'bg-transparent border-white/5 hover:bg-white/5'
                            }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${currentValue === opt.value ? 'bg-white text-black' : 'bg-white/10 text-gray-400'}`}>
                                <opt.icon size={20} />
                            </div>
                            <div className="text-left">
                                <p className={`font-bold ${currentValue === opt.value ? 'text-white' : 'text-gray-300'}`}>
                                    {opt.label}
                                </p>
                                <p className="text-sm text-gray-500">{opt.description}</p>
                            </div>
                        </div>
                        {currentValue === opt.value && <Check className="text-white" size={20} />}
                    </button>
                ))}
            </div>
            {currentValue === 'SELECTED' && (
                <button
                    onClick={() => openUserModal(
                        settingKey === 'defaultPostPrivacy' ? 'POSTS'
                            : settingKey === 'profileCardPrivacy' ? 'CARD' : 'STALK_ME'
                    )}
                    className="mt-4 w-full py-2 border border-white/20 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-white/10 transition-colors"
                >
                    Manage Allowed Users
                </button>
            )}
        </section>
    );

    return (
        <div className="min-h-screen bg-black text-white relative font-sans">
            <SpaceBackground />
            <AppHeader title="Visibility & Preferences" showBackButton />

            <div className="max-w-2xl mx-auto px-6 py-8 relative z-10">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 font-bold uppercase tracking-widest text-xs">
                    <ChevronLeft size={16} /> Back to Settings
                </button>

                {renderSection('Default Post Visibility', 'defaultPostPrivacy', settings.defaultPostPrivacy)}
                {renderSection('Profile Card Visibility', 'profileCardPrivacy', settings.profileCardPrivacy)}
                {renderSection('"Stalk Me" Section Visibility', 'stalkMePrivacy', settings.stalkMePrivacy)}
            </div>

            {showUserModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-md h-[80vh] flex flex-col shadow-2xl">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <h3 className="font-bold text-lg">Select Users</h3>
                            <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-white/10 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 text-gray-500" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by name or code..."
                                    value={searchQuery}
                                    onChange={searchUsers}
                                    className="w-full bg-black border border-white/20 rounded-lg py-3 pl-10 pr-4 focus:border-white outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {!searchQuery && selectedUsers.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Selected</p>
                                    {selectedUsers.map(u => (
                                        <div key={u.id} onClick={() => toggleUser(u)} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden relative">
                                                    {u.avatarUrl || u.profile?.avatarUrl ? (
                                                        <Image src={u.avatarUrl || u.profile?.avatarUrl} alt={u.name} fill className="object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs font-bold">{u.name?.[0]}</div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold">{u.displayName || u.profile?.displayName || u.name}</p>
                                                </div>
                                            </div>
                                            <Check className="text-green-500" size={18} />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {searchQuery && (
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Search Results</p>
                                    {searchResults.map(u => {
                                        const isSelected = selectedUsers.some(sel => sel.id === u.id);
                                        return (
                                            <div key={u.id} onClick={() => toggleUser(u)} className={`flex items-center justify-between p-3 bg-neutral-900 rounded-lg border ${isSelected ? 'border-green-500/50 bg-green-900/10' : 'border-white/10'} cursor-pointer hover:bg-white/5`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden relative">
                                                        {u.profile?.avatarUrl ? (
                                                            <Image src={u.profile.avatarUrl} alt={u.name} fill className="object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">{u.name?.[0]}</div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold">{u.profile?.displayName || u.name}</p>
                                                        <p className="text-xs text-gray-400">#{u.profileCode}</p>
                                                    </div>
                                                </div>
                                                {isSelected && <Check className="text-green-500" size={18} />}
                                            </div>
                                        );
                                    })}
                                    {searchResults.length === 0 && !searchLoading && (
                                        <p className="text-center text-gray-500 mt-4">No users found</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
