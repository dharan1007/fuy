

import React, { useState } from 'react';
import { Sprout, X, Plus, Hash } from 'lucide-react';

interface BloomSettingsSectionProps {
    slashes: string[];
    onUpdate: (newSlashes: string[]) => Promise<void>;
    loading: boolean;
}

export default function BloomSettingsSection({ slashes = [], onUpdate, loading }: BloomSettingsSectionProps) {
    const [newSlash, setNewSlash] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSlash.trim()) return;

        // Normalize: ensure it starts with / or # based on user habits, or strictly /
        // User asked for "slashes", so maybe strictly srtart with /?
        // Let's just treat them as strings. Users can type "tech" and we store "tech".
        // Or we prefix with /.

        // Let's strip special chars to be clean? Or let user do whatever.
        // User requested "slashes(/'s) of the topic".

        let tag = newSlash.trim();
        if (slashes.includes(tag)) {
            setNewSlash('');
            return;
        }

        const updated = [...slashes, tag];
        setIsAdding(true);
        await onUpdate(updated);
        setNewSlash('');
        setIsAdding(false);
    };

    const handleRemove = async (tagToRemove: string) => {
        const updated = slashes.filter(t => t !== tagToRemove);
        await onUpdate(updated);
    };

    return (
        <section className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider border-b border-white/10 pb-2 flex items-center gap-2">
                <Sprout className="w-5 h-5 text-green-400" />
                Bloom Settings
            </h2>
            <p className="text-sm text-gray-400 mb-4">
                Add "slashes" (topics) to filter your Bloom feed. You will only see generic content (Lills, Fills, Auds) that matches these tags.
            </p>

            <form onSubmit={handleAdd} className="flex gap-2 mb-4">
                <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">/</span>
                    <input
                        type="text"
                        value={newSlash}
                        onChange={(e) => setNewSlash(e.target.value)}
                        placeholder="topic (e.g. music, tech)"
                        className="w-full pl-6 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50 transition-colors"
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading || isAdding || !newSlash.trim()}
                    className="bg-white/10 hover:bg-green-500/20 text-white p-2 rounded-lg transition-colors disabled:opacity-50"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </form>

            <div className="flex flex-wrap gap-2">
                {slashes.length === 0 && (
                    <p className="text-xs text-gray-500 italic">No slashes added yet. Your Bloom feed will be empty.</p>
                )}
                {slashes.map((slash, idx) => (
                    <div key={idx} className="flex items-center gap-1 bg-green-500/10 border border-green-500/30 px-3 py-1.5 rounded-full text-sm text-green-300">
                        <span>/{slash}</span>
                        <button
                            onClick={() => handleRemove(slash)}
                            disabled={loading}
                            className="ml-1 hover:text-white transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
}
