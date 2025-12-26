"use client";

import { useState, useEffect } from "react";
import { Flame, ThumbsUp, ThumbsDown, AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type ReactionType = "W" | "L" | "CAP" | "FIRE" | null;

interface ReactionControlProps {
    postId: string;
    initialReaction: ReactionType;
    counts: { W: number; L: number; CAP: number; FIRE: number };
    onReact: (type: ReactionType) => void;
}

export default function ReactionControl({ postId, initialReaction, counts, onReact }: ReactionControlProps) {
    const [currentReaction, setCurrentReaction] = useState<ReactionType>(initialReaction);
    const [optimisticCounts, setOptimisticCounts] = useState(counts || { W: 0, L: 0, CAP: 0, FIRE: 0 });

    useEffect(() => {
        setCurrentReaction(initialReaction);
        setOptimisticCounts(counts || { W: 0, L: 0, CAP: 0, FIRE: 0 });
    }, [initialReaction, counts]);

    const handleReact = async (type: ReactionType) => {
        if (!type) return;

        // Optimistic update
        const isRemoving = currentReaction === type;
        const newReaction = isRemoving ? null : type;

        const newCounts = { ...optimisticCounts };
        if (currentReaction) {
            newCounts[currentReaction] = Math.max(0, newCounts[currentReaction] - 1);
        }
        if (!isRemoving) {
            newCounts[type] = (newCounts[type] || 0) + 1;
        }

        setCurrentReaction(newReaction);
        setOptimisticCounts(newCounts);

        try {
            await fetch("/api/posts/react", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postId, type }),
            });
            onReact(newReaction);
        } catch (error) {
            // Revert on error
            console.error("Failed to react", error);
            setCurrentReaction(currentReaction);
            setOptimisticCounts(counts);
        }
    };

    return (
        <div className="flex items-center gap-1">
            {/* W Reaction */}
            <button
                onClick={(e) => { e.stopPropagation(); handleReact("W"); }}
                className={cn(
                    "group flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 border border-transparent",
                    currentReaction === "W" ? "bg-white/10 border-white/20" : "hover:bg-white/5 hover:border-white/10"
                )}
            >
                <span className={cn("font-bold text-sm", currentReaction === "W" ? "text-green-400" : "text-white/40 group-hover:text-white/60")}>W</span>
                <span className={cn("text-xs font-medium", currentReaction === "W" ? "text-white" : "text-white/40 group-hover:text-white/60")}>
                    {optimisticCounts["W"] || 0}
                </span>
            </button>

            {/* L Reaction */}
            <button
                onClick={(e) => { e.stopPropagation(); handleReact("L"); }}
                className={cn(
                    "group flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 border border-transparent",
                    currentReaction === "L" ? "bg-white/10 border-white/20" : "hover:bg-white/5 hover:border-white/10"
                )}
            >
                <span className={cn("font-bold text-sm", currentReaction === "L" ? "text-red-500" : "text-white/40 group-hover:text-white/60")}>L</span>
                <span className={cn("text-xs font-medium", currentReaction === "L" ? "text-white" : "text-white/40 group-hover:text-white/60")}>
                    {optimisticCounts["L"] || 0}
                </span>
            </button>

            {/* CAP Reaction */}
            <button
                onClick={(e) => { e.stopPropagation(); handleReact("CAP"); }}
                className={cn(
                    "group flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 border border-transparent",
                    currentReaction === "CAP" ? "bg-white/10 border-white/20" : "hover:bg-white/5 hover:border-white/10"
                )}
            >
                <svg viewBox="0 0 24 24" fill="currentColor" className={cn("w-4 h-4", currentReaction === "CAP" ? "text-blue-400" : "text-white/40 group-hover:text-white/60")}>
                    <path d="M2,9 L22,9 L22,11 L19,11 C19,15.418 15.418,19 11,19 C6.582,19 3,15.418 3,11 L2,11 L2,9 Z M12,4 C14.209,4 16,5.791 16,8 L8,8 C8,5.791 9.791,4 12,4 Z" />
                </svg>
                <span className={cn("text-xs font-medium", currentReaction === "CAP" ? "text-white" : "text-white/40 group-hover:text-white/60")}>
                    {optimisticCounts["CAP"] || 0}
                </span>
            </button>
        </div>
    );
}

