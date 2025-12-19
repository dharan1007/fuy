'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileEdit, Trash2, X } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

interface DraftsListProps {
    onClose: () => void;
    onSelectDraft: (draft: any) => void;
}

export default function DraftsList({ onClose, onSelectDraft }: DraftsListProps) {
    const [drafts, setDrafts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const router = useRouter();

    useEffect(() => {
        const fetchDrafts = async () => {
            try {
                const res = await fetch('/api/posts/drafts');
                if (res.ok) {
                    const data = await res.json();
                    setDrafts(data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchDrafts();
    }, []);

    const deleteDraft = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this draft?')) return;

        try {
            await fetch(`/api/posts/${id}`, { method: 'DELETE' });
            setDrafts(drafts.filter(d => d.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex justify-end">
            <div className="w-full max-w-md bg-[#111] h-full p-6 overflow-y-auto border-l border-white/10">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        Your Drafts
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <LoadingSpinner />
                    </div>
                ) : drafts.length === 0 ? (
                    <div className="text-center text-white/40 py-12">
                        <FileEdit className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No drafts found</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {drafts.map((draft) => (
                            <button
                                key={draft.id}
                                onClick={() => onSelectDraft(draft)}
                                className="w-full text-left p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group relative"
                            >
                                <div className="pr-8">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${draft.postType === 'PULLUPDOWN' ? 'bg-teal-500/20 text-teal-300' : 'bg-gray-500/20 text-gray-300'
                                            }`}>
                                            {draft.postType}
                                        </span>
                                        <span className="text-xs text-white/40">
                                            {new Date(draft.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h3 className="font-bold truncate text-lg">
                                        {draft.content || draft.pullUpDownData?.question || 'Untitled'}
                                    </h3>
                                    {draft.pullUpDownData && (
                                        <p className="text-sm text-white/60 mt-1">
                                            {draft.pullUpDownData.options?.length || 0} options
                                        </p>
                                    )}
                                </div>

                                <div
                                    onClick={(e) => deleteDraft(draft.id, e)}
                                    className="absolute top-4 right-4 p-2 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
