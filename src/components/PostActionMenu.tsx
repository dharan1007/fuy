
"use client";

import React, { useState } from 'react';
import { MoreVertical, Flag, EyeOff, VolumeX, Trash2 } from 'lucide-react';
import ReportModal from '@/components/ReportModal';
import MuteOptionsModal from '@/components/MuteOptionsModal';

import { useFeedItem } from '@/context/FeedItemContext';

interface PostActionMenuProps {
    post: any;
    currentUserId?: string;
    onPostHidden?: () => void;
    onRefresh?: () => void;
}

export default function PostActionMenu({ post, currentUserId, onPostHidden: propOnHide, onRefresh: propOnRefresh }: PostActionMenuProps) {
    const context = useFeedItem();
    const onRefresh = propOnRefresh || context?.onRefresh;
    const onPostHidden = propOnHide || context?.onPostHidden;
    const [reportOpen, setReportOpen] = useState(false);
    const [muteOpen, setMuteOpen] = useState(false);
    const [isHidden, setIsHidden] = useState(false);

    // If viewing own post, maybe show "Delete"? 
    // For now, focusing on Report/Hide/Mute as per request.
    const isOwnPost = currentUserId === post.userId;

    const handleHide = async () => {
        // Optimistic hide
        setIsHidden(true);
        if (onPostHidden) onPostHidden(post.id);

        try {
            const res = await fetch('/api/interactions/hide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId: post.id })
            });
            if (!res.ok) throw new Error("Failed to hide");
        } catch (e) {
            console.error(e);
            // Revert if failed (though mostly we just refresh)
            setIsHidden(false);
            alert("Failed to hide post.");
        }
    };

    const handleMuteComplete = () => {
        // Refresh feed to remove muted user's content
        if (onRefresh) onRefresh();
    };

    const menuItems = [
        ...(isOwnPost ? [
            {
                label: "Delete Post",
                icon: <Trash2 size={16} />,
                onClick: async () => {
                    if (confirm("Are you sure you want to delete this post?")) {
                        // Call delete API
                        try {
                            const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
                            if (res.ok) {
                                if (onPostHidden) onPostHidden(post.id); // Reuse hide logic to remove from view
                                if (onRefresh) onRefresh();
                            }
                        } catch (e) { console.error(e); }
                    }
                },
                danger: true
            }
        ] : [
            {
                label: "Hide Post",
                icon: <EyeOff size={16} />,
                onClick: handleHide,
                danger: false
            },
            {
                label: `Mute @${post.user?.profile?.displayName || post.user?.name}`,
                icon: <VolumeX size={16} />,
                onClick: () => setMuteOpen(true),
                danger: false
            },
            {
                label: "Report Content",
                icon: <Flag size={16} />,
                onClick: () => setReportOpen(true),
                danger: true
            }
        ])
    ];

    // Check for click outside
    const menuRef = React.useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = React.useState(false);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (isHidden) return null;

    return (
        <>
            <div className="relative" ref={menuRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="text-white/40 hover:text-white p-1 rounded-full transition-colors"
                >
                    <MoreVertical size={16} />
                </button>

                {isOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-[#18181b] border border-white/10 rounded-xl overflow-hidden shadow-xl z-50">
                        {menuItems.map((item, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    item.onClick();
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors hover:bg-white/5 ${item.danger ? 'text-red-400 hover:text-red-300' : 'text-white/80 hover:text-white'}`}
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            <ReportModal
                isOpen={reportOpen}
                onClose={() => setReportOpen(false)}
                postId={post.id}
            />

            <MuteOptionsModal
                isOpen={muteOpen}
                onClose={() => setMuteOpen(false)}
                targetUserId={post.userId}
                targetUserName={post.user?.profile?.displayName || post.user?.name || "User"}
                onMuteComplete={handleMuteComplete}
            />
        </>
    );
}

