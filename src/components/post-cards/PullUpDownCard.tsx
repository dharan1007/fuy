'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowUp, ArrowDown } from 'lucide-react';

type PullUpDownCardProps = {
    pullUpDown: {
        id: string;
        question: string;
        optionA: string;
        optionB: string;
        optionACount: number;
        optionBCount: number;
    };
    userVote?: string | null;
    onVote?: (vote: 'A' | 'B') => void;
};

export default function PullUpDownCard({ pullUpDown, userVote, onVote }: PullUpDownCardProps) {
    const { data: session } = useSession();
    const [voting, setVoting] = useState(false);
    const [localVote, setLocalVote] = useState(userVote);

    const totalVotes = pullUpDown.optionACount + pullUpDown.optionBCount;
    const percentA = totalVotes > 0 ? (pullUpDown.optionACount / totalVotes) * 100 : 50;
    const percentB = totalVotes > 0 ? (pullUpDown.optionBCount / totalVotes) * 100 : 50;

    const handleVote = async (vote: 'A' | 'B') => {
        if (!session || voting || localVote) return;

        setVoting(true);
        setLocalVote(vote);

        try {
            const res = await fetch('/api/posts/pullupdown', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pullUpDownId: pullUpDown.id,
                    vote,
                }),
            });

            if (!res.ok) {
                setLocalVote(null);
            } else if (onVote) {
                onVote(vote);
            }
        } catch (error) {
            setLocalVote(null);
        } finally {
            setVoting(false);
        }
    };

    return (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
            <h3 className="text-lg font-bold mb-4">{pullUpDown.question}</h3>

            <div className="space-y-3">
                <button
                    onClick={() => handleVote('A')}
                    disabled={!!localVote || voting}
                    className={`w-full p-4 rounded-xl border-2 transition-all ${localVote === 'A'
                            ? 'border-green-500 bg-green-500/20'
                            : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                        } disabled:cursor-not-allowed`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <ArrowUp className="w-5 h-5" />
                            <span className="font-medium">{pullUpDown.optionA}</span>
                        </div>
                        <span className="text-sm text-white/60">{Math.round(percentA)}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-500 transition-all duration-300"
                            style={{ width: `${percentA}%` }}
                        />
                    </div>
                </button>

                <button
                    onClick={() => handleVote('B')}
                    disabled={!!localVote || voting}
                    className={`w-full p-4 rounded-xl border-2 transition-all ${localVote === 'B'
                            ? 'border-red-500 bg-red-500/20'
                            : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                        } disabled:cursor-not-allowed`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <ArrowDown className="w-5 h-5" />
                            <span className="font-medium">{pullUpDown.optionB}</span>
                        </div>
                        <span className="text-sm text-white/60">{Math.round(percentB)}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-red-500 transition-all duration-300"
                            style={{ width: `${percentB}%` }}
                        />
                    </div>
                </button>
            </div>

            <p className="text-xs text-white/40 mt-3 text-center">
                {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
            </p>
        </div>
    );
}
