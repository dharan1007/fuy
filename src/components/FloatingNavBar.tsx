"use client";

import Link from "next/link";
import { Globe } from "lucide-react";

interface FloatingNavBarProps {
    unreadCount?: number;
    unreadMessageCount?: number;
    onClearUnread?: () => void;
}

export default function FloatingNavBar({
    unreadCount = 0,
    unreadMessageCount = 0,
    onClearUnread,
}: FloatingNavBarProps) {
    return (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
            <nav className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full px-8 py-4 shadow-lg pointer-events-auto flex items-center gap-8 hover:bg-white/15 transition-all">
                {/* Create Post */}
                <Link
                    href="/create-post"
                    className="text-2xl text-white/80 hover:text-white transition-colors hover:scale-110 transform duration-200"
                    title="Create Post"
                >
                    +
                </Link>

                {/* Explore */}
                <Link
                    href="/explore"
                    className="text-white/80 hover:text-white transition-colors hover:scale-110 transform duration-200"
                    title="Explore"
                >
                    <Globe className="w-5 h-5" />
                </Link>

                {/* Dots Feed */}
                <Link
                    href="/dots"
                    className="p-1.5 text-white/80 hover:text-white transition-colors hover:scale-110 transform duration-200"
                    title="Dots"
                >
                    <div className="w-5 h-5 flex items-center justify-center">
                        <span className="w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                    </div>
                </Link>

                {/* Notifications */}
                <Link
                    href="/notifications"
                    className="relative p-1.5 text-white/80 hover:text-white transition-colors hover:scale-110 transform duration-200"
                    title="Notifications"
                    onClick={onClearUnread}
                >
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        />
                    </svg>
                    {/* Combined Badge: Notifications + Unread Messages */}
                    {unreadCount + unreadMessageCount > 0 && (
                        <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                            {unreadCount + unreadMessageCount > 9
                                ? "9+"
                                : unreadCount + unreadMessageCount}
                        </span>
                    )}
                </Link>

                {/* Messages */}
                <Link
                    href="/chat"
                    className="relative p-1.5 text-white/80 hover:text-white transition-colors hover:scale-110 transform duration-200"
                    title="Messages"
                >
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                    </svg>
                    {unreadMessageCount > 0 && (
                        <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                            {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                        </span>
                    )}
                </Link>
            </nav>
        </div>
    );
}
