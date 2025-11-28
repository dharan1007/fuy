'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';

type BTSFormProps = {
    onBack: () => void;
};

type Credit = { name: string; role: string; link?: string };
type Tool = { name: string; category: string; link?: string };
type Link = { title: string; url: string; description?: string };

export default function BTSForm({ onBack }: BTSFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [content, setContent] = useState('');
    const [visibility, setVisibility] = useState('PUBLIC');
    const [credits, setCredits] = useState<Credit[]>([{ name: '', role: '' }]);
    const [tools, setTools] = useState<Tool[]>([{ name: '', category: '' }]);
    const [links, setLinks] = useState<Link[]>([{ title: '', url: '' }]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/posts/bts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: content || 'Behind the scenes',
                    visibility,
                    credits: credits.filter(c => c.name),
                    tools: tools.filter(t => t.name),
                    links: links.filter(l => l.url),
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create BTS post');
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
                <h3 className="text-xl font-bold mb-4">Behind The Scenes</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Describe your process..."
                            rows={3}
                            className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/40 resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Credits</label>
                        {credits.map((credit, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    placeholder="Name"
                                    value={credit.name}
                                    onChange={(e) => {
                                        const newCredits = [...credits];
                                        newCredits[i].name = e.target.value;
                                        setCredits(newCredits);
                                    }}
                                    className="flex-1 px-3 py-2 bg-black/20 border border-white/20 rounded-lg text-sm text-white placeholder-white/40"
                                />
                                <input
                                    type="text"
                                    placeholder="Role"
                                    value={credit.role}
                                    onChange={(e) => {
                                        const newCredits = [...credits];
                                        newCredits[i].role = e.target.value;
                                        setCredits(newCredits);
                                    }}
                                    className="flex-1 px-3 py-2 bg-black/20 border border-white/20 rounded-lg text-sm text-white placeholder-white/40"
                                />
                                {i > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setCredits(credits.filter((_, idx) => idx !== i))}
                                        className="p-2 hover:bg-white/10 rounded"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => setCredits([...credits, { name: '', role: '' }])}
                            className="text-sm text-white/60 hover:text-white flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" /> Add Credit
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Tools Used</label>
                        {tools.map((tool, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    placeholder="Tool name"
                                    value={tool.name}
                                    onChange={(e) => {
                                        const newTools = [...tools];
                                        newTools[i].name = e.target.value;
                                        setTools(newTools);
                                    }}
                                    className="flex-1 px-3 py-2 bg-black/20 border border-white/20 rounded-lg text-sm text-white placeholder-white/40"
                                />
                                <input
                                    type="text"
                                    placeholder="Category"
                                    value={tool.category}
                                    onChange={(e) => {
                                        const newTools = [...tools];
                                        newTools[i].category = e.target.value;
                                        setTools(newTools);
                                    }}
                                    className="flex-1 px-3 py-2 bg-black/20 border border-white/20 rounded-lg text-sm text-white placeholder-white/40"
                                />
                                {i > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setTools(tools.filter((_, idx) => idx !== i))}
                                        className="p-2 hover:bg-white/10 rounded"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => setTools([...tools, { name: '', category: '' }])}
                            className="text-sm text-white/60 hover:text-white flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" /> Add Tool
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
                        {loading ? 'Creating...' : 'Create BTS'}
                    </button>
                </div>
            </div>
        </form>
    );
}
