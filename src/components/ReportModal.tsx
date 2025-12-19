"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    postId: string;
}

export default function ReportModal({ isOpen, onClose, postId }: ReportModalProps) {
    const [reason, setReason] = useState("");
    const [details, setDetails] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason) {
            setError("Please select a reason");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const response = await fetch("/api/posts/report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postId, reason, details }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || "Failed to report post");
            }

            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setReason("");
                setDetails("");
            }, 2000);
        } catch (err: any) {
            if (err.message.includes("already reported")) {
                setSuccess(true); // Treat as success for UX
                setTimeout(onClose, 2000);
            } else {
                setError(err.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <h2 className="text-lg font-semibold text-white">Report Post</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg
                                    className="w-8 h-8"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Thanks for reporting</h3>
                            <p className="text-zinc-400">
                                We'll review this post and take appropriate action.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">
                                    Why are you reporting this post?
                                </label>
                                <div className="grid gap-2">
                                    {[
                                        "Spam or misleading",
                                        "Harassment or bullying",
                                        "Hate speech or symbols",
                                        "Violence or illegal acts",
                                        "Nudity or sexual content",
                                        "Self-harm or suicide",
                                        "Other",
                                    ].map((r) => (
                                        <label
                                            key={r}
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${reason === r
                                                    ? "bg-zinc-800 border-zinc-600 ring-1 ring-zinc-500"
                                                    : "bg-zinc-950/50 border-zinc-800 hover:bg-zinc-800"
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="reason"
                                                value={r}
                                                checked={reason === r}
                                                onChange={(e) => setReason(e.target.value)}
                                                className="w-4 h-4 text-blue-500 bg-zinc-900 border-zinc-700 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-zinc-200">{r}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">
                                    Additional Details (Optional)
                                </label>
                                <textarea
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value)}
                                    placeholder="Provide more context..."
                                    className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700 resize-none"
                                />
                            </div>

                            {error && (
                                <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg flex gap-2">
                                    <span>⚠️</span>
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-2.5 px-4 bg-white text-black hover:bg-zinc-200 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? "Submitting..." : "Submit Report"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
