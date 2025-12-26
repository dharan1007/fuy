
"use client";

import React, { useState } from 'react';
import { X, AlertTriangle, ChevronRight, CheckCircle } from 'lucide-react';

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    postId: string;
}

const REPORT_REASONS = [
    "Spam or misleading",
    "Harassment or bullying",
    "Hate speech or symbols",
    "Violence or dangerous organizations",
    "Nudity or sexual activity",
    "Scam or fraud",
    "Intellectual property violation",
    "I just don't like it"
];

export default function ReportModal({ isOpen, onClose, postId }: ReportModalProps) {
    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [details, setDetails] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!selectedReason) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/posts/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    postId,
                    reason: selectedReason,
                    details
                }),
            });

            if (res.ok) {
                setIsSuccess(true);
                setTimeout(() => {
                    onClose();
                    setIsSuccess(false);
                    setSelectedReason(null);
                    setDetails("");
                }, 2000);
            } else {
                alert("Failed to compile report. Please try again.");
            }
        } catch (error) {
            console.error("Report error:", error);
            alert("An error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#121212] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-white font-bold flex items-center gap-2">
                        <AlertTriangle className="text-red-500" size={20} />
                        Report Content
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/70 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* content */}
                <div className="p-6">
                    {isSuccess ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center">
                                <CheckCircle size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Report Received</h3>
                                <p className="text-white/60 mt-2 text-sm">
                                    Thanks for looking out for the community. We'll review your report shortly.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {!selectedReason ? (
                                <div className="space-y-2">
                                    <p className="text-sm text-white/60 mb-4">Why are you reporting this post?</p>
                                    {REPORT_REASONS.map((reason) => (
                                        <button
                                            key={reason}
                                            onClick={() => setSelectedReason(reason)}
                                            className="w-full flex items-center justify-between p-4 text-left bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-xl transition-all group"
                                        >
                                            <span className="text-white/90 font-medium text-sm">{reason}</span>
                                            <ChevronRight size={16} className="text-white/30 group-hover:text-white transition-colors" />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <button
                                        onClick={() => setSelectedReason(null)}
                                        className="text-xs text-white/50 hover:text-white flex items-center gap-1"
                                    >
                                        ← Back to reasons
                                    </button>

                                    <div>
                                        <h3 className="text-white font-bold text-lg mb-1">{selectedReason}</h3>
                                        <p className="text-xs text-white/50">Does this report need more context?</p>
                                    </div>

                                    <textarea
                                        value={details}
                                        onChange={(e) => setDetails(e.target.value)}
                                        placeholder="Optional: Provide more details to help us understand..."
                                        className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-white/30 resize-none"
                                    />

                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isSubmitting ? "Submitting..." : "Submit Report"}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
