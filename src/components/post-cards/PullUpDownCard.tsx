'use client';

import React, { useState } from 'react';
import { Check, User } from 'lucide-react';

type Option = {
    id: string;
    text: string;
    voteCount: number;
    specialDetails?: string | null;
    uniqueDetails?: string | null;
    taggedUser?: {
        id: string;
        profile?: {
            displayName: string;
        };
    } | null;
};

type PullUpDownCardProps = {
    pullUpDown: {
        id: string;
        question: string;
        options: Option[];
    };
    userVote?: string | null; // This will now be optionId
    onVote?: (optionId: string) => void;
    isAuthenticated?: boolean;
};

export default function PullUpDownCard({ pullUpDown, userVote, onVote, isAuthenticated = false }: PullUpDownCardProps) {
    const [voting, setVoting] = useState(false);
    const [localVote, setLocalVote] = useState(userVote);

    // Normalize Data (Handle both Flat Dummy Data and Nested Real API Data)
    const data = (pullUpDown as any).pullUpDownData || pullUpDown;
    const isDummy = pullUpDown.id.startsWith('dummy-');

    // Calculate total votes
    const [options, setOptions] = useState<Option[]>(data.options || []);
    const totalVotes = options.reduce((acc, opt) => acc + opt.voteCount, 0);

    const handleVote = async (optionId: string) => {
        if (!isAuthenticated) return; // Should likely prompt login?
        if (voting || localVote) return;

        setVoting(true);
        setLocalVote(optionId);

        // Optimistic Update
        setOptions(prev => prev.map(opt =>
            opt.id === optionId ? { ...opt, voteCount: opt.voteCount + 1 } : opt
        ));

        // MOCK / DUMMY HANDLER
        if (isDummy) {
            // Simulate network delay
            setTimeout(() => {
                setVoting(false);
                if (onVote) onVote(optionId);
            }, 500);
            return;
        }

        try {
            const res = await fetch('/api/posts/pullupdown', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pullUpDownId: data.id, // Use inner ID for real data
                    optionId,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                console.error('Vote failed:', res.status, errData);
                // Revert optimistic update
                setLocalVote(null);
                setOptions(prev => prev.map(opt =>
                    opt.id === optionId ? { ...opt, voteCount: opt.voteCount - 1 } : opt
                ));
            } else if (onVote) {
                onVote(optionId);
            }
        } catch (error) {
            console.error('Vote error exception:', error);
            // Revert optimistic update
            setLocalVote(null);
            setOptions(prev => prev.map(opt =>
                opt.id === optionId ? { ...opt, voteCount: opt.voteCount - 1 } : opt
            ));
        } finally {
            setVoting(false);
        }
    };

    return (
        <div
            onClick={() => onVote && onVote('OPEN_MODAL')} // Hacky signal to parent or handle click separately? Better: use a separate prop or check target.
            className="cursor-pointer bg-black/40 backdrop-blur-md border border-white rounded-3xl p-5 w-full hover:bg-black/60 transition-colors"
        >
            {/* User Header */}
            <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-full bg-neutral-800 overflow-hidden border border-white/20">
                    {(pullUpDown as any).user?.profile?.avatarUrl ? (
                        <img src={(pullUpDown as any).user.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <User className="w-6 h-6 text-white/50" />
                        </div>
                    )}
                </div>
                <div>
                    <h4 className="font-bold text-white text-base">{(pullUpDown as any).user?.profile?.displayName || 'Anonymous'}</h4>
                    <p className="text-white/50 text-sm">Posted a PUD</p>
                </div>
            </div>

            <h3 className="text-2xl font-bold mb-6 text-white leading-tight">{data.question || data.content}</h3>

            <div className="space-y-4">
                {options.map((option) => {
                    const percent = totalVotes > 0 ? (option.voteCount / totalVotes) * 100 : 0;
                    const isSelected = localVote === option.id;

                    return (
                        <button
                            key={option.id}
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent opening modal when voting
                                handleVote(option.id);
                            }}
                            disabled={!!localVote || voting}
                            className={`w-full group relative overflow-hidden rounded-xl border transition-all duration-300 text-left h-14 flex items-center ${isSelected
                                ? 'border-white bg-white text-black'
                                : 'border-white text-white hover:bg-white/10'
                                }`}
                        >
                            {/* Progress Bar Background */}
                            <div
                                className={`absolute top-0 left-0 h-full transition-all duration-500 ${isSelected ? 'bg-neutral-200' : 'bg-white/10'
                                    }`}
                                style={{ width: `${percent}%`, opacity: isSelected ? 0 : 0.2 }}
                            />

                            <div className="relative z-10 w-full px-5 flex justify-between items-center">
                                <span className={`font-medium text-lg ${isSelected ? 'text-black' : 'text-white'}`}>{option.text}</span>

                                {isSelected && <Check className="w-6 h-6" />}
                                {!isSelected && <span className="text-base opacity-60">{Math.round(percent)}%</span>}
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="mt-5 flex items-center justify-between text-sm text-white/50">
                <span>{totalVotes} votes</span>
                {isDummy && <span className="text-white/60">Demo</span>}
            </div>
        </div>
    );
}
