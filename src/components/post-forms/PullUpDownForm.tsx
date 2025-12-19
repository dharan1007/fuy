'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, User, Plus, X, Search, Check, Save } from 'lucide-react';

type PullUpDownFormProps = {
    onBack: () => void;
};

// Types for options
type Option = {
    id: string; // Temporary ID for frontend key
    text: string;
    specialDetails: string;
    uniqueDetails: string;
    taggedUser: { id: string; name: string } | null;
};

// Simplified User Type for Search
type SearchUser = {
    id: string;
    name: string;
    handle: string;
    avatar: string;
};

export default function PullUpDownForm({ onBack, initialData }: PullUpDownFormProps & { initialData?: any }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [question, setQuestion] = useState(initialData?.content || initialData?.pullUpDownData?.question || '');
    const [visibility, setVisibility] = useState(initialData?.visibility || 'PUBLIC');

    // Initialize options from draft data or default
    const [options, setOptions] = useState<Option[]>(() => {
        if (initialData?.pullUpDownData?.options?.length > 0) {
            return initialData.pullUpDownData.options.map((o: any) => ({
                id: o.id || Math.random().toString(), // Use existing ID if possible
                text: o.text || '',
                specialDetails: o.specialDetails || '',
                uniqueDetails: o.uniqueDetails || '',
                taggedUser: o.taggedUser ? { id: o.taggedUser.id, name: o.taggedUser.profile?.displayName || 'User' } : null
            }));
        }
        return [
            { id: '1', text: '', specialDetails: '', uniqueDetails: '', taggedUser: null },
            { id: '2', text: '', specialDetails: '', uniqueDetails: '', taggedUser: null },
        ];
    });

    // Tagging Search State
    const [taggingIndex, setTaggingIndex] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
    const [searching, setSearching] = useState(false);

    // Add new option
    const addOption = () => {
        setOptions([
            ...options,
            { id: Math.random().toString(), text: '', specialDetails: '', uniqueDetails: '', taggedUser: null }
        ]);
    };

    // Remove option
    const removeOption = (index: number) => {
        if (options.length <= 2) return;
        const newOptions = [...options];
        newOptions.splice(index, 1);
        setOptions(newOptions);
    };

    // Update option field
    const updateOption = (index: number, field: keyof Option, value: any) => {
        const newOptions = [...options];
        newOptions[index] = { ...newOptions[index], [field]: value };
        setOptions(newOptions);
    };

    // Search Users Effect
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                // Determine if query is simplified or uses API
                const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults(data.users || []);
                }
            } catch (err) {
                console.error('Search error', err);
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Handle Tag User Selection
    const selectUser = (user: SearchUser) => {
        if (taggingIndex !== null) {
            updateOption(taggingIndex, 'taggedUser', { id: user.id, name: user.name });
            setTaggingIndex(null);
            setSearchQuery('');
        }
    };

    const handleSubmit = async (status: 'PUBLISHED' | 'DRAFT') => {
        setError('');
        setLoading(true);

        try {
            // Validate only for published posts
            if (status === 'PUBLISHED') {
                if (!question.trim()) throw new Error('Question is required');
                if (options.length < 2) throw new Error('At least 2 options required');
                if (options.some(o => !o.text.trim())) throw new Error('All options must have text');
            }

            // Prepare payload
            const payload = {
                id: initialData?.id, // Include ID for updates
                question,
                visibility,
                status,
                options: options.map(o => ({
                    id: o.id.length > 10 ? o.id : undefined, // simple check if it's a real ID or random
                    text: o.text,
                    specialDetails: o.specialDetails || null,
                    uniqueDetails: o.uniqueDetails || null,
                    taggedUserId: o.taggedUser?.id || null,
                }))
            };

            const method = initialData?.id ? 'PUT' : 'POST';

            const res = await fetch('/api/posts/pullupdown', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create poll');
            }

            if (status === 'DRAFT') {
                // Maybe navigate to drafts page or show checklist?
                // For now, go home or clear form?
                // Let's redirect to home for now, or just alert.
                // Better: Redirect to explore drafts view if exists, or home.
                router.push('/');
                router.refresh();
            } else {
                router.push('/');
                router.refresh();
            }

        } catch (err: any) {
            setError(err.message || 'Something went wrong');
            setLoading(false); // Only stop loading on error, if success we navigate
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 relative">

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Create Pull Up Down</h3>
                    {/* Draft Button */}
                    <button
                        type="button"
                        onClick={() => handleSubmit('DRAFT')}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/70 transition-colors"
                    >
                        <Save className="w-4 h-4" />
                        Save Draft
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Question */}
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Question</label>
                        <input
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="What do you want to ask?"
                            className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/40"
                        />
                    </div>

                    {/* Options List */}
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-white/80">Options</label>

                        {options.map((option, index) => (
                            <div key={option.id} className="p-4 bg-black/20 rounded-xl border border-white/10">
                                {/* Option Header / Main Input */}
                                <div className="flex gap-3 mb-3">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={option.text}
                                            onChange={(e) => updateOption(index, 'text', e.target.value)}
                                            placeholder={`Option ${index + 1}`}
                                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-white/30 text-white"
                                        />
                                    </div>
                                    {options.length > 2 && (
                                        <button
                                            onClick={() => removeOption(index)}
                                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>

                                {/* Details & Tagging Row */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <input
                                        type="text"
                                        value={option.specialDetails}
                                        onChange={(e) => updateOption(index, 'specialDetails', e.target.value)}
                                        placeholder="Special Details (Optional)"
                                        className="text-sm w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/80"
                                    />
                                    <input
                                        type="text"
                                        value={option.uniqueDetails}
                                        onChange={(e) => updateOption(index, 'uniqueDetails', e.target.value)}
                                        placeholder="Unique Details (Optional)"
                                        className="text-sm w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/80"
                                    />

                                    {/* Tag User Button/Display */}
                                    <button
                                        type="button"
                                        onClick={() => setTaggingIndex(index)}
                                        className={`flex items-center justify-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${option.taggedUser
                                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                            }`}
                                    >
                                        <User className="w-4 h-4" />
                                        {option.taggedUser ? option.taggedUser.name : 'Tag User'}
                                    </button>
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={addOption}
                            className="flex items-center gap-2 px-4 py-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors text-sm font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            Add Option
                        </button>
                    </div>

                    {/* Visibility */}
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

                <div className="flex gap-3 mt-8">
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
                    >
                        Back
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSubmit('PUBLISHED')}
                        disabled={loading}
                        className="flex-1 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Posting...' : 'Post'}
                    </button>
                </div>
            </div>

            {/* Tagging Modal Overlay */}
            {taggingIndex !== null && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <h3 className="font-bold">Tag a User</h3>
                            <button onClick={() => { setTaggingIndex(null); setSearchQuery(''); }} className="p-2 hover:bg-white/10 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4">
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-3 w-5 h-5 text-white/40" />
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-white/30 text-white"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2 overflow-y-auto max-h-[300px]">
                                {searching ? (
                                    <div className="text-center py-8 text-white/40">Searching...</div>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map(user => (
                                        <button
                                            key={user.id}
                                            onClick={() => selectUser(user)}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors text-left"
                                        >
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10">
                                                {user.avatar && <img src={user.avatar} alt="" className="w-full h-full object-cover" />}
                                            </div>
                                            <div>
                                                <div className="font-bold">{user.name}</div>
                                                <div className="text-sm text-white/40">{user.handle}</div>
                                            </div>
                                        </button>
                                    ))
                                ) : searchQuery ? (
                                    <div className="text-center py-8 text-white/40">No users found</div>
                                ) : (
                                    <div className="text-center py-8 text-white/40">Type to search</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
