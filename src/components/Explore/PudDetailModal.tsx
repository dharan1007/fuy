'use client';

import React from 'react';
import { X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Voter = {
    userId: string;
    optionId: string;
    user: {
        id: string;
        profile: {
            displayName: string;
            avatarUrl: string | null;
        } | null;
    };
};

type Option = {
    id: string;
    text: string;
    voteCount: number;
    specialDetails?: string | null;
    uniqueDetails?: string | null;
};

type PudDetailModalProps = {
    pud: any;
    isOpen: boolean;
    onClose: () => void;
};

export default function PudDetailModal({ pud, isOpen, onClose }: PudDetailModalProps) {
    if (!pud) return null;

    // Normalizing data (handling difference between real API and dummy structure)
    const data = pud.pullUpDownData || pud;
    const options: Option[] = data.options || [];
    const votes: Voter[] = data.votes || [];

    const totalVotes = options.reduce((acc, opt) => acc + opt.voteCount, 0);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/20 rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">{data.question || data.content}</h2>
                                <div className="flex items-center gap-2 text-white/50 text-sm">
                                    <span className="bg-white/10 px-2 py-0.5 rounded-full">PUD</span>
                                    <span>•</span>
                                    <span>{totalVotes} Votes</span>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-white" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Options Breakdown */}
                            <div className="space-y-4">
                                {options.map((option) => {
                                    const percent = totalVotes > 0 ? (option.voteCount / totalVotes) * 100 : 0;

                                    // Get voters for this specific option
                                    // Note: API 'votes' array contains all votes if configured, or we filter from the main list
                                    // For Real Data: 'votes' array on the PUD object contains ALL votes with user info
                                    const optionVoters = votes.filter(v => v.optionId === option.id);

                                    // For Dummy/Mock data, generate fake avatars if none exist
                                    const displayVoters = optionVoters.length > 0 ? optionVoters : (
                                        pud.id.startsWith('dummy') && option.voteCount > 0
                                            ? Array(Math.min(5, option.voteCount)).fill(null).map((_, i) => ({
                                                userId: `dummy-${i}`,
                                                user: { profile: { displayName: 'Voter', avatarUrl: null } }
                                            }))
                                            : []
                                    );

                                    return (
                                        <div key={option.id} className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                            {/* Bar Header */}
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold text-lg text-white">{option.text}</span>
                                                <span className="font-mono text-white/60">{Math.round(percent)}%</span>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
                                                <div
                                                    className="h-full bg-white transition-all duration-500"
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>

                                            {/* Voters List */}
                                            {displayVoters.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/5">
                                                    {displayVoters.map((v: any, i: number) => (
                                                        <div
                                                            key={i}
                                                            className="w-8 h-8 rounded-full bg-neutral-800 border border-white/20 overflow-hidden flex items-center justify-center group relative cursor-help"
                                                            title={v.user?.profile?.displayName || 'User'}
                                                        >
                                                            {v.user?.profile?.avatarUrl ? (
                                                                <img src={v.user.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <User className="w-4 h-4 text-white/40" />
                                                            )}
                                                        </div>
                                                    ))}
                                                    {option.voteCount > displayVoters.length && (
                                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                                                            +{option.voteCount - displayVoters.length}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
