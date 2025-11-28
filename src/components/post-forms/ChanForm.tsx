'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Upload } from 'lucide-react';

type ChanFormProps = {
    onBack: () => void;
};

type Episode = { title: string; url: string; thumbnail?: string };

export default function ChanForm({ onBack }: ChanFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [channelName, setChannelName] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState('PUBLIC');
    const [episodes, setEpisodes] = useState<Episode[]>([{ title: '', url: '' }]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!channelName) throw new Error('Channel name is required');

            const validEpisodes = episodes.filter(ep => ep.title && ep.url);
            if (validEpisodes.length === 0) {
                throw new Error('At least one episode is required');
            }

            const res = await fetch('/api/posts/chans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelName,
                    description,
                    content: description,
                    visibility,
                    episodes: validEpisodes,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create channel');
            }

            router.push('/');
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-4">Create Channel</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Channel Name</label>
                        <input
                            type="text"
                            value={channelName}
                            onChange={(e) => setChannelName(e.target.value)}
                            placeholder="My Channel"
                            className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/40"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe your channel..."
                            rows={3}
                            className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/40 resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Episodes</label>
                        {episodes.map((episode, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    placeholder="Episode title"
                                    value={episode.title}
                                    onChange={(e) => {
                                        const newEpisodes = [...episodes];
                                        newEpisodes[i].title = e.target.value;
                                        setEpisodes(newEpisodes);
                                    }}
                                    className="flex-1 px-3 py-2 bg-black/20 border border-white/20 rounded-lg text-sm text-white placeholder-white/40"
                                />
                                <input
                                    type="url"
                                    placeholder="Video URL"
                                    value={episode.url}
                                    onChange={(e) => {
                                        const newEpisodes = [...episodes];
                                        newEpisodes[i].url = e.target.value;
                                        setEpisodes(newEpisodes);
                                    }}
                                    className="flex-1 px-3 py-2 bg-black/20 border border-white/20 rounded-lg text-sm text-white placeholder-white/40"
                                />
                                {i > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setEpisodes(episodes.filter((_, idx) => idx !== i))}
                                        className="p-2 hover:bg-white/10 rounded"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => setEpisodes([...episodes, { title: '', url: '' }])}
                            className="text-sm text-white/60 hover:text-white flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" /> Add Episode
                        </button>
                    </div>

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

                <div className="flex gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
                    >
                        Back
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Creating...' : 'Create Channel'}
                    </button>
                </div>
            </div>
        </form>
    );
}
