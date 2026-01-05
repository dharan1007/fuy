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
    orientation?: "horizontal" | "vertical";
    className?: string; // Add className support
}

export default function ReactionControl({ postId, initialReaction, counts, onReact, orientation = "horizontal", className }: ReactionControlProps) {
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
        <div className={cn("flex gap-1.5", orientation === "vertical" ? "flex-col items-stretch" : "flex-row items-center", className)}>
            {/* W Reaction */}
            <button
                onClick={(e) => { e.stopPropagation(); handleReact("W"); }}
                className={cn(
                    "group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 border backdrop-blur-sm",
                    currentReaction === "W"
                        ? "bg-green-500/10 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
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
                    "group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 border backdrop-blur-sm",
                    currentReaction === "L"
                        ? "bg-red-500/10 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
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
                    "group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 border backdrop-blur-sm",
                    currentReaction === "CAP"
                        ? "bg-blue-500/10 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                )}
            >
                <div className="flex flex-col items-center leading-none">
                    <span className={cn("text-[10px] font-black tracking-tighter", currentReaction === "CAP" ? "text-blue-400" : "text-white/40 group-hover:text-white/60")}>
                        CAP
                    </span>
                </div>
                <span className={cn("text-xs font-medium", currentReaction === "CAP" ? "text-white" : "text-white/40 group-hover:text-white/60")}>
                    {optimisticCounts["CAP"] || 0}
                </span>
            </button>

            {/* FIRE Reaction - Added */}
            <button
                onClick={(e) => { e.stopPropagation(); handleReact("FIRE"); }}
                className={cn(
                    "group flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 border backdrop-blur-sm",
                    currentReaction === "FIRE"
                        ? "bg-orange-500/10 border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.2)]"
                        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                )}
            >
                <Flame className={cn("w-4 h-4", currentReaction === "FIRE" ? "text-orange-500 fill-orange-500" : "text-white/40 group-hover:text-white/60")} />
                <span className={cn("text-xs font-medium", currentReaction === "FIRE" ? "text-white" : "text-white/40 group-hover:text-white/60")}>
                    {optimisticCounts["FIRE"] || 0}
                </span>
            </button>
        </div>
    );
}

