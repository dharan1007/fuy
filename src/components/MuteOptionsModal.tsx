
"use client";

import React, { useState } from 'react';
import { X, PauseCircle, Check } from 'lucide-react';

interface MuteOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetUserId: string;
    targetUserName: string;
    onMuteComplete: () => void;
}

const POST_TYPES = [
    { id: "STORY", label: "Stories" },
    { id: "STANDARD", label: "Regular Posts" },
    { id: "LILL", label: "Lills (Short Videos)" },
    { id: "FILL", label: "Fills (Long Videos)" },
    { id: "AUD", label: "Audio Posts" },
    { id: "NOTE", label: "Notes" }
];

export function MuteOptionsModal({ isOpen, onClose, targetUserId, targetUserName, onMuteComplete }: MuteOptionsModalProps) {
    const [muteAll, setMuteAll] = useState(true);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const toggleType = (typeId: string) => {
        if (muteAll) setMuteAll(false);

        setSelectedTypes(prev => {
            if (prev.includes(typeId)) {
                const next = prev.filter(t => t !== typeId);
                if (next.length === 0) setMuteAll(true); // Revert to all if none selected? Or just warn.
                return next;
            }
            return [...prev, typeId];
        });
    };

    const handleMuteAllToggle = () => {
        setMuteAll(true);
        setSelectedTypes([]);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const typesToMute = muteAll ? ["ALL"] : selectedTypes;

            const res = await fetch('/api/interactions/mute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetUserId,
                    types: typesToMute
                })
            });

            if (res.ok) {
                onMuteComplete();
                onClose();
            } else {
                alert("Failed to pause user");
            }
        } catch (e) {
            console.error(e);
            alert("Error pausing user");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-[#18181b] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <PauseCircle size={18} className="text-white/70" />
                        Pause @{targetUserName}?
                    </h3>
                    <button onClick={onClose}><X size={20} className="text-white/50 hover:text-white" /></button>
                </div>

                <div className="p-4 space-y-4">
                    <p className="text-sm text-white/60">
                        You can pause everything from this user, or just specific types of content.
                    </p>

                    <div className="space-y-2">
                        <button
                            onClick={handleMuteAllToggle}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${muteAll ? 'bg-white/10 border-white/30' : 'bg-transparent border-white/10 hover:border-white/20'}`}
                        >
                            <span className="text-white font-medium text-sm">Pause Everything</span>
                            {muteAll && <Check size={16} className="text-blue-400" />}
                        </button>

                        <div className="pt-2">
                            <p className="text-xs text-white/40 uppercase font-bold mb-2 px-1">Or select specific content</p>
                            <div className="grid grid-cols-1 gap-2">
                                {POST_TYPES.map(type => (
                                    <button
                                        key={type.id}
                                        onClick={() => toggleType(type.id)}
                                        className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-all ${!muteAll && selectedTypes.includes(type.id)
                                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-200'
                                            : 'bg-transparent border-white/5 text-white/60 hover:bg-white/5'
                                            }`}
                                    >
                                        <span>{type.label}</span>
                                        {!muteAll && selectedTypes.includes(type.id) && <Check size={14} className="text-blue-400" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full py-3 mt-2 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? "Pausing..." : `Pause ${muteAll ? "Everything" : "Selected"}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
