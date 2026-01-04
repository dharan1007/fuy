
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MoreVertical, Trash2, Flag, CornerDownRight } from 'lucide-react';
import Link from 'next/link';
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

interface Comment {
    id: string;
    content: string;
    createdAt: string;
    parentId?: string | null;
    user: {
        id: string;
        profile?: {
            displayName?: string;
            avatarUrl?: string;
        };
        email?: string;
    };
    reactions: any[]; // Raw reactions
    replies?: Comment[];

    // Frontend Helpers
    reactionCounts: { W: number; L: number; CAP: number; FIRE: number };
    userReaction?: string | null;
}

interface CommentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    postId: string;
    postOwnerId?: string; // Passed to allow post owner to delete comments
    onCommentAdded?: () => void;
}

export default function CommentsModal({ isOpen, onClose, postId, postOwnerId, onCommentAdded }: CommentsModalProps) {
    const { data: session } = useSession();
    const currentUserId = (session?.user as any)?.id;

    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [replyingTo, setReplyingTo] = useState<{ id: string, username: string } | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initial Fetch
    useEffect(() => {
        if (isOpen && postId) {
            fetchComments();
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setReplyingTo(null);
            setNewComment("");
        }
    }, [isOpen, postId]);

    const fetchComments = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/posts/${postId}/comments`);
            if (res.ok) {
                const data = await res.json();
                setComments(data);
            }
        } catch (error) {
            console.error("Failed to fetch comments", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || submitting) return;

        setSubmitting(true);
        try {
            const res = await fetch(`/api/posts/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: newComment,
                    parentId: replyingTo?.id
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to post comment");
            }

            const savedComment = await res.json();

            // Re-fetch to get correct structure/order or manually update state
            // For simplicity and correctness with nested replies, we re-fetch
            await fetchComments();

            setNewComment("");
            setReplyingTo(null);
            if (onCommentAdded) onCommentAdded();

        } catch (error) {
            console.error(error);
            alert("Failed to post comment. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (commentId: string) => {
        if (!confirm("Delete this comment?")) return;
        try {
            const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
            if (res.ok) {
                setComments(prev => removeCommentFromTree(prev, commentId));
                if (onCommentAdded) onCommentAdded();
            } else {
                alert("Failed to delete comment");
            }
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    const handleReact = async (commentId: string, type: string) => {
        // Optimistic Update could be complex with nested state. 
        // We'll implement a simple one or just fetch after.
        // Let's do fetch after for reliability first, as structure is deep.
        try {
            await fetch(`/api/comments/${commentId}/react`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type })
            });
            // In a real app we'd optimistic update. For now, we refresh to see new counts.
            // Or we could update local state deep copy.
            updateCommentReaction(commentId, type, currentUserId!);
        } catch (error) {
            console.error("Reaction failed", error);
        }
    };

    // Deep update helper
    const updateCommentReaction = (targetId: string, type: string, userId: string) => {
        setComments(prev => {
            const updateNode = (nodes: Comment[]): Comment[] => {
                return nodes.map(node => {
                    if (node.id === targetId) {
                        // Toggle logic approximation
                        const isSame = node.userReaction === type;
                        const newReaction = isSame ? null : type;
                        const newCounts = { ...node.reactionCounts };

                        if (node.userReaction) {
                            newCounts[node.userReaction as keyof typeof newCounts]--;
                        }
                        if (!isSame) {
                            newCounts[type as keyof typeof newCounts]++;
                        }

                        return { ...node, userReaction: newReaction, reactionCounts: newCounts };
                    }
                    if (node.replies) {
                        return { ...node, replies: updateNode(node.replies) };
                    }
                    return node;
                });
            };
            return updateNode(prev);
        });
    };

    const removeCommentFromTree = (nodes: Comment[], id: string): Comment[] => {
        return nodes.filter(node => {
            if (node.id === id) return false;
            if (node.replies) {
                node.replies = removeCommentFromTree(node.replies, id);
            }
            return true;
        });
    };

    const CommentItem = ({ comment, isReply = false }: { comment: Comment, isReply?: boolean }) => {
        const canDelete = currentUserId === comment.user.id || currentUserId === postOwnerId;

        return (
            <div className={cn("flex gap-3", isReply && "ml-10 mt-3")}>
                <Link href={`/profile/${comment.user.id}`} className="shrink-0 mt-1">
                    <img
                        src={comment.user.profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.user.email}`}
                        alt={comment.user.profile?.displayName || "User"}
                        className="w-8 h-8 rounded-full border border-white/10 object-cover"
                    />
                </Link>
                <div className="flex flex-col flex-1 gap-1">
                    {/* Bubble */}
                    <div className="bg-white/5 rounded-2xl px-4 py-2 self-start max-w-[90%]">
                        <div className="flex items-baseline gap-2">
                            <Link href={`/profile/${comment.user.id}`} className="text-sm font-semibold text-white hover:underline">
                                {comment.user.profile?.displayName || "User"}
                            </Link>
                            <span className="text-xs text-white/40">
                                {formatTimeAgo(new Date(comment.createdAt))}
                            </span>
                        </div>
                        <p className="text-sm text-white/90 break-words leading-relaxed whitespace-pre-wrap">
                            {comment.content}
                        </p>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center gap-4 px-2">
                        {/* Reply Button */}
                        <button
                            onClick={() => {
                                setReplyingTo({ id: comment.id, username: comment.user.profile?.displayName || "User" });
                                inputRef.current?.focus();
                            }}
                            className="text-xs font-bold text-white/50 hover:text-white transition-colors"
                        >
                            Reply
                        </button>

                        {/* Delete (if authorized) */}
                        {canDelete && (
                            <button
                                onClick={() => handleDelete(comment.id)}
                                className="text-xs font-bold text-red-500/50 hover:text-red-400 transition-colors"
                            >
                                Delete
                            </button>
                        )}

                        {/* Report (if NOT authorized to delete, i.e. not owner/author) */}
                        {!canDelete && (
                            <button className="text-xs font-bold text-white/30 hover:text-white/60 transition-colors">
                                Report
                            </button>
                        )}

                        {/* Reaction Buttons (Mini) */}
                        <div className="flex items-center gap-1 ml-2">
                            {["W", "L", "CAP", "FIRE"].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => handleReact(comment.id, type)}
                                    className={cn(
                                        "px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors",
                                        comment.userReaction === type
                                            ? "bg-white/10 border-white/20 text-white"
                                            : "border-transparent text-white/30 hover:bg-white/5 hover:text-white/50"
                                    )}
                                >
                                    {type}
                                    {comment.reactionCounts[type as keyof typeof comment.reactionCounts] > 0 &&
                                        <span className="ml-1 opacity-70">{comment.reactionCounts[type as keyof typeof comment.reactionCounts]}</span>
                                    }
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Nested Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                        <div className="flex flex-col">
                            {comment.replies.map(reply => (
                                <CommentItem key={reply.id} comment={reply} isReply={true} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-lg h-[80vh] sm:h-[600px] bg-[#18181b] border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                    <h3 className="text-white font-bold text-center flex-1">Comments</h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white absolute right-4"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-white/40">
                            <p>No comments yet.</p>
                            <p className="text-sm">Start the conversation.</p>
                        </div>
                    ) : (
                        comments.map((comment) => (
                            <CommentItem key={comment.id} comment={comment} />
                        ))
                    )}
                </div>

                {/* Input Area */}
                <div className="p-3 border-t border-white/10 bg-[#18181b] shrink-0">
                    {replyingTo && (
                        <div className="flex items-center justify-between bg-white/5 px-3 py-1.5 rounded-t-lg text-xs text-white/60">
                            <span>Replying to <span className="text-white font-bold">{replyingTo.username}</span></span>
                            <button onClick={() => setReplyingTo(null)}><X size={14} /></button>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="flex gap-2 items-end mt-1">
                        <input
                            ref={inputRef}
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={!newComment.trim() || submitting}
                            className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 rounded-full text-white transition-colors"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

function formatTimeAgo(date: Date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 604800)}w`;
}
