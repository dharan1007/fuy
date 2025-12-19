'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Palette, Rocket, ShoppingBag, LayoutDashboard, Menu } from 'lucide-react';
import SearchModal from '@/components/SearchModal';

import UserListModal from '@/components/UserListModal';
import HomeSidebarProfile from '@/components/HomeSidebarProfile';
import HomeSidebarSuggestions from '@/components/HomeSidebarSuggestions';
import HopinProgramsCard from '@/components/HopinProgramsCard';
import ProductsSidebarCard from '@/components/ProductsSidebarCard';

import LoadingSpinner from '@/components/LoadingSpinner';
import ScrollStarfield from '@/components/ScrollStarfield';
import LandingPage from '@/components/LandingPage/LandingPage';

// Post type card components
import ChapterCard from '@/components/post-cards/ChapterCard';
import XrayCard from '@/components/post-cards/XrayCard';

import LillCard from '@/components/post-cards/LillCard';
import FillCard from '@/components/post-cards/FillCard';
import AudCard from '@/components/post-cards/AudCard';
import ChanCard from '@/components/post-cards/ChanCard';
import PullUpDownCard from '@/components/post-cards/PullUpDownCard';
import ReportModal from '@/components/ReportModal';
import ReactionControl from '@/components/ReactionControl';
import ReactionBubbleList from '@/components/ReactionBubbleList';
import { MoreVertical, Flag } from 'lucide-react';

interface UserProfile {
    name: string | null;
    profile: {
        displayName: string | null;
        avatarUrl: string | null;
        bio: string | null;
        location: string | null;
    } | null;
    stats: {
        friends: number;
        posts: number;
        followers: number;
        following: number;
    };
}

interface PostData {
    id: string;
    content: string;
    user: {
        id: string;
        email: string;
        profile?: {
            displayName: string | null;
            avatarUrl: string | null;
        };
    };
    media?: Array<{ type: string; url: string }>;
    createdAt: string;
    likes: number;
    likedByMe: boolean;
    comments: number;
    shares: number;
}

type CreatePostTab = 'text' | 'media' | 'link';

export default function HomeClient({ isAdmin = false }: { isAdmin?: boolean }) {
    const { data: session, status } = useSession();
    const [isMounted, setIsMounted] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [posts, setPosts] = useState<PostData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadMessageCount, setUnreadMessageCount] = useState(0); // New state for messages
    const [showNavMenu, setShowNavMenu] = useState(false);

    // Create post state
    const [createPostTab, setCreatePostTab] = useState<CreatePostTab>('text');
    const [postTitle, setPostTitle] = useState('');
    const [postContent, setPostContent] = useState('');
    const [postFeature, setPostFeature] = useState('OTHER');
    const [postVisibility, setPostVisibility] = useState('PUBLIC');
    const [postError, setPostError] = useState('');
    const [postSubmitting, setPostSubmitting] = useState(false);

    // Followers/Following modal state
    const [showFollowersModal, setShowFollowersModal] = useState(false);
    const [showFollowingModal, setShowFollowingModal] = useState(false);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportPostId, setReportPostId] = useState<string | null>(null);
    const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
    const [followersList, setFollowersList] = useState<any[]>([]);
    const [followingList, setFollowingList] = useState<any[]>([]);
    const [loadingFollowers, setLoadingFollowers] = useState(false);
    const [loadingFollowing, setLoadingFollowing] = useState(false);
    const [followersError, setFollowersError] = useState<string | null>(null);
    const [followingError, setFollowingError] = useState<string | null>(null);

    const features = ['JOURNAL', 'JOY', 'AWE', 'BONDS', 'SERENDIPITY', 'CHECKIN', 'PROGRESS', 'OTHER'];
    const visibilities = ['PUBLIC', 'FRIENDS', 'PRIVATE'];

    // Fetch user profile
    const fetchUserProfile = async () => {
        try {
            const response = await fetch('/api/profile');
            if (response.ok) {
                const data = await response.json();
                setUserProfile(data);
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
        }
    };

    // Fetch posts
    const fetchPosts = async () => {
        try {
            const response = await fetch('/api/posts?scope=public');
            if (response.ok) {
                const data = await response.json();
                setPosts(data);
            }
        } catch (err) {
            console.error('Error fetching posts:', err);
        }
    };

    // Fetch unread notifications
    const fetchUnreadCount = async () => {
        try {
            const response = await fetch('/api/notifications?unreadOnly=true');
            if (response.ok) {
                const data = await response.json();
                setUnreadCount(data.notifications?.length || 0);
            }
        } catch (err) {
            console.error('Error fetching unread count:', err);
        }
    };

    // Fetch unread messages
    const fetchUnreadMessages = async () => {
        try {
            const response = await fetch('/api/chat/unread');
            if (response.ok) {
                const data = await response.json();
                setUnreadMessageCount(data.count || 0);
            }
        } catch (err) {
            console.error('Error fetching unread messages:', err);
        }
    };

    // Fetch followers
    const fetchFollowers = async () => {
        setLoadingFollowers(true);
        setFollowersError(null);
        try {
            const response = await fetch('/api/followers');
            const data = await response.json();

            if (response.ok) {
                setFollowersList(data.followers || []);
                setFollowersError(null);
            } else {
                setFollowersList([]);
                setFollowersError(data.error || 'Failed to load followers');
            }
            setShowFollowersModal(true);
        } catch (err) {
            console.error('Error fetching followers:', err);
            setFollowersList([]);
            setFollowersError('Failed to load followers');
            setShowFollowersModal(true);
        } finally {
            setLoadingFollowers(false);
        }
    };

    // Fetch following
    const fetchFollowing = async () => {
        setLoadingFollowing(true);
        setFollowingError(null);
        try {
            const response = await fetch('/api/following');
            const data = await response.json();

            if (response.ok) {
                setFollowingList(data.following || []);
                setFollowingError(null);
            } else {
                setFollowingList([]);
                setFollowingError(data.error || 'Failed to load following');
            }
            setShowFollowingModal(true);
        } catch (err) {
            console.error('Error fetching following:', err);
            setFollowingList([]);
            setFollowingError('Failed to load following');
            setShowFollowingModal(true);
        } finally {
            setLoadingFollowing(false);
        }
    };

    // Handle remove friend
    const handleRemoveFriend = async (friendshipId: string) => {
        try {
            const response = await fetch('/api/friends/remove', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ friendshipId }),
            });

            if (response.ok) {
                // Update the lists by removing the friend
                setFollowersList((prev) =>
                    prev.filter((f) => f.friendshipId !== friendshipId)
                );
                setFollowingList((prev) =>
                    prev.filter((f) => f.friendshipId !== friendshipId)
                );
                // Refresh user profile to update counts
                await fetchUserProfile();
            }
        } catch (err) {
            console.error('Error removing friend:', err);
        }
    };

    // Create post handler
    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        setPostError('');
        setPostSubmitting(true);

        try {
            if (!postContent.trim()) {
                setPostError('Post content cannot be empty');
                setPostSubmitting(false);
                return;
            }

            const res = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: postTitle,
                    content: postContent,
                    feature: postFeature,
                    visibility: postVisibility,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setPostError(data.details || data.error || 'Failed to create post');
                setPostSubmitting(false);
                return;
            }

            // Reset form
            setPostTitle('');
            setPostContent('');
            setPostFeature('OTHER');
            setPostVisibility('PUBLIC');
            setCreatePostTab('text');

            // Refresh posts
            await fetchPosts();
        } catch (err) {
            setPostError('Something went wrong. Please try again.');
            console.error(err);
        } finally {
            setPostSubmitting(false);
        }
    };

    useEffect(() => {
        setIsMounted(true);
        // Only load data if session is authenticated
        if (status === 'authenticated') {
            setLoading(true);
            // Fetch all data in parallel instead of sequentially
            Promise.all([
                fetchUserProfile(),
                fetchPosts(),
                fetchUnreadCount(),
                fetchUnreadMessages(),
            ]).finally(() => {
                setLoading(false);
            });
        }

        // Force body background to black for this page only for the starfield
        const originalBg = document.body.style.background;
        document.body.style.background = '#000000';

        return () => {
            document.body.style.background = originalBg;
        };
    }, [status]);

    // Show loading spinner while session is loading
    if (status === 'loading') {
        return <LoadingSpinner message="Authenticating your session..." />;
    }

    if (!isMounted) return null;

    // Show login prompt if user is not authenticated
    if (status === 'unauthenticated') {
        return <LandingPage />;
    }

    const displayName = userProfile?.profile?.displayName || userProfile?.name || 'User';
    const avatarUrl = userProfile?.profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`;

    return (
        <div className="min-h-screen text-white flex flex-col relative overflow-hidden">
            <ScrollStarfield />
            {/* Removed overlay to show starfield background */}
            {/* HEADER - Minimal Floating */}
            <header className="sticky top-0 z-50 px-4 sm:px-6 py-4 pointer-events-none relative">
                <div className="flex items-center justify-between gap-3 sm:gap-4">
                    {/* Logo/Explore Module */}
                    <div className="bg-transparent backdrop-blur-md border border-white/40 rounded-lg sm:rounded-xl px-4 sm:px-6 py-2.5 sm:py-3 shadow-sm pointer-events-auto hover:bg-white/10 transition-all">
                        <Link href="/" className="flex items-center gap-2">
                            <span className="text-lg sm:text-2xl font-bold">
                                <span className="text-white">f</span>
                                <span className="text-red-500">u</span>
                                <span className="text-white">y</span>
                            </span>
                        </Link>
                    </div>

                    {/* Navigation Module - Desktop Only */}
                    <div className="hidden sm:flex bg-transparent backdrop-blur-md border border-white/40 rounded-xl px-6 py-3 shadow-sm pointer-events-auto hover:bg-white/10 transition-all items-center gap-6">
                        {/* Canvas */}
                        <Link href="/journal" className="text-sm font-semibold text-white hover:text-white/80 transition-colors">
                            <Palette className="w-5 h-5" />
                        </Link>

                        {/* Hopin */}
                        <Link href="/hopin" className="text-sm font-semibold text-white hover:text-white/80 transition-colors">
                            <Rocket className="w-5 h-5" />
                        </Link>

                        {/* Shop */}
                        <Link href="/shop" className="text-sm font-semibold text-white hover:text-white/80 transition-colors">
                            <ShoppingBag className="w-5 h-5" />
                        </Link>

                        {/* Dashboard */}
                        {/* Dashboard */}
                        <Link href="/dashboard" className="text-sm font-semibold text-white hover:text-white/80 transition-colors">
                            <LayoutDashboard className="w-5 h-5" />
                        </Link>

                        {/* Admin Moderation - Only for Admins */}
                        {isAdmin && (
                            <Link href="/admin/moderation" className="text-sm font-semibold text-red-400 hover:text-red-300 transition-colors flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span>Mod</span>
                            </Link>
                        )}


                    </div>

                    {/* Navigation Menu - Mobile Only */}
                    <div className="sm:hidden relative">
                        <button
                            onClick={() => setShowNavMenu(!showNavMenu)}
                            className="bg-transparent backdrop-blur-md border border-white/40 rounded-lg px-3 py-2 shadow-sm pointer-events-auto hover:bg-white/10 transition-all text-white font-semibold"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        {showNavMenu && (
                            <div className="absolute right-0 mt-2 w-40 bg-black/80 backdrop-blur-md border border-white/20 rounded-lg shadow-lg p-2 space-y-1 pointer-events-auto">
                                <Link href="/journal" className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-white/10 rounded transition-colors">
                                    <Palette className="w-4 h-4" /> Canvas
                                </Link>
                                <Link href="/hopin" className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-white/10 rounded transition-colors">
                                    <Rocket className="w-4 h-4" /> Hopin
                                </Link>
                                <Link href="/shop" className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-white/10 rounded transition-colors">
                                    <ShoppingBag className="w-4 h-4" /> Shop
                                </Link>
                                <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-white/10 rounded transition-colors">
                                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                                </Link>
                                {isAdmin && (
                                    <Link href="/admin/moderation" className="flex items-center gap-2 px-4 py-2 text-sm text-red-300 hover:bg-white/10 rounded transition-colors">
                                        <div className="w-4 h-4 flex items-center justify-center">
                                            <span className="w-2 h-2 rounded-full bg-red-500" />
                                        </div>
                                        Moderation
                                    </Link>
                                )}

                            </div>
                        )}
                    </div>

                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full px-0 py-10 relative z-20">
                <div className="grid grid-cols-1 md:grid-cols-[240px_1fr_280px] gap-0 h-full">
                    {/* Left Sidebar - Extreme Left */}
                    <div className="px-3 sm:px-4 lg:px-6 flex flex-col gap-4">
                        <HomeSidebarProfile
                            userProfile={userProfile}
                            avatarUrl={avatarUrl}
                            displayName={displayName}
                            userId={session?.user?.id}
                            onFetchFollowers={fetchFollowers}
                            onFetchFollowing={fetchFollowing}
                        />
                        <HomeSidebarSuggestions />
                    </div>

                    {/* Center Feed */}
                    <div className="space-y-6 px-3 sm:px-4 lg:px-8">


                        {/* Posts Feed */}
                        <div className="space-y-4">
                            {posts.length === 0 ? (
                                <div className="text-center py-12 border border-white/20 rounded-lg bg-transparent backdrop-blur-md">
                                    <p className="text-white/70">No posts yet. Be the first to share!</p>
                                </div>
                            ) : (
                                posts.map((post: any) => (
                                    <div key={post.id} className="border border-white/20 rounded-lg p-6 bg-transparent backdrop-blur-md hover:border-white/40 transition-colors">
                                        <div className="flex items-start gap-4 mb-4">
                                            <Link href={`/profile/${post.user.id}`} className="shrink-0">
                                                <img
                                                    src={post.user.profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${post.user.profile?.displayName || post.user.email}`}
                                                    alt={post.user.profile?.displayName || post.user.email}
                                                    className="w-10 h-10 rounded-full border border-white/20 hover:opacity-80 transition-opacity"
                                                />
                                            </Link>
                                            <div className="flex-1 min-w-0">
                                                <Link href={`/profile/${post.user.id}`} className="hover:underline decoration-white/50">
                                                    <div className="font-bold text-sm text-white">{post.user.profile?.displayName || post.user.email}</div>
                                                </Link>
                                                <div className="text-xs text-white/50">{new Date(post.createdAt).toLocaleDateString()}</div>
                                            </div>
                                            {/* Post Options Menu */}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id)}
                                                    className="p-1 text-white/40 hover:text-white transition-colors rounded-full hover:bg-white/10"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>
                                                {activeMenuPostId === post.id && (
                                                    <div className="absolute right-0 mt-2 w-32 bg-black/90 border border-white/20 rounded-lg shadow-xl overflow-hidden z-10 backdrop-blur-md">
                                                        <button
                                                            onClick={() => {
                                                                setReportPostId(post.id);
                                                                setReportModalOpen(true);
                                                                setActiveMenuPostId(null);
                                                            }}
                                                            className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/10 flex items-center gap-2 transition-colors"
                                                        >
                                                            <Flag size={14} />
                                                            Report
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Render type-specific card or standard content */}
                                        {post.postType === 'CHAPTER' && post.chapterData ? (
                                            <ChapterCard chapter={post.chapterData} />
                                        ) : post.postType === 'XRAY' && post.xrayData ? (
                                            <XrayCard xray={post.xrayData} />

                                        ) : post.postType === 'LILL' && post.lillData ? (
                                            <LillCard lill={post.lillData} />
                                        ) : post.postType === 'FILL' && post.fillData ? (
                                            <FillCard fill={post.fillData} />
                                        ) : post.postType === 'AUD' && post.audData ? (
                                            <AudCard aud={post.audData} />
                                        ) : post.postType === 'CHAN' && post.chanData ? (
                                            <ChanCard chan={post.chanData} />
                                        ) : post.postType === 'PULLUPDOWN' && post.pullUpDownData ? (
                                            <PullUpDownCard pullUpDown={post.pullUpDownData} userVote={post.userVote} isAuthenticated={!!session} />
                                        ) : (
                                            <>
                                                <p className="text-sm text-white/80 mb-4 leading-relaxed">{post.content}</p>
                                                {post.media && post.media.length > 0 && (
                                                    <div className="grid grid-cols-2 gap-2 mb-4">
                                                        {post.media.map((m: any, i: number) => (
                                                            <img key={i} src={m.url} alt="post media" className="w-full h-32 object-cover rounded-lg bg-white/5" />
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        <div className="mt-4">
                                            {/* Reaction Bubbles */}
                                            <div className="mb-3">
                                                <ReactionBubbleList
                                                    postId={post.id}
                                                    bubbles={post.topBubbles || []}
                                                    totalBubbles={post.totalBubbles || 0}
                                                    onAddBubble={(newBubble) => {
                                                        // Refresh posts to show new bubble (simple approach)
                                                        fetchPosts();
                                                    }}
                                                />
                                            </div>

                                            {/* Action Bar */}
                                            <div className="flex items-center gap-6 text-xs text-white/60 border-t border-white/10 pt-4">
                                                <ReactionControl
                                                    postId={post.id}
                                                    initialReaction={post.userReaction}
                                                    counts={post.reactionCounts || { W: 0, L: 0, CAP: 0, FIRE: 0 }}
                                                    onReact={(type) => {
                                                        // Optional: Global refresh or analytics
                                                    }}
                                                />

                                                <button className="flex items-center gap-2 hover:text-white/80 transition-colors">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                    </svg>
                                                    <span>{post.comments?.length || post.comments || 0}</span>
                                                </button>

                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Sidebar - Features Cards */}
                    <aside className="p-4 bg-transparent backdrop-blur-md border border-white/20 rounded-2xl hover:border-white/40 space-y-4">
                        <HopinProgramsCard />
                        <ProductsSidebarCard />
                    </aside>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative mt-16 border-t border-white/10 bg-transparent">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {/* Brand */}
                        <div>
                            <h3 className="font-bold text-lg mb-4 text-white">FUY Media</h3>
                            <p className="text-sm text-gray-300">Real-time messaging platform connecting people authentically.</p>
                        </div>
                        {/* Quick Links */}
                        <div>
                            <h4 className="font-semibold text-sm mb-4 text-white">Product</h4>
                            <ul className="space-y-2">
                                <li><Link href="/journal" className="text-sm text-gray-300 hover:text-white transition-colors">Journal</Link></li>
                                <li><Link href="/hopin" className="text-sm text-gray-300 hover:text-white transition-colors">Hopin</Link></li>
                                <li><Link href="/shop" className="text-sm text-gray-300 hover:text-white transition-colors">Shop</Link></li>
                                <li><Link href="/dashboard" className="text-sm text-gray-300 hover:text-white transition-colors">Dashboard</Link></li>
                            </ul>
                        </div>
                        {/* Community */}
                        <div>
                            <h4 className="font-semibold text-sm mb-4 text-white">Community</h4>
                            <ul className="space-y-2">
                                <li><Link href="/chat" className="text-sm text-gray-300 hover:text-white transition-colors">Messages</Link></li>
                                <li><Link href="/profile" className="text-sm text-gray-300 hover:text-white transition-colors">Profile</Link></li>
                                <li><Link href="/contact-us" className="text-sm text-gray-300 hover:text-white transition-colors">Contact Us</Link></li>
                            </ul>
                        </div>
                        {/* Policies */}
                        <div>
                            <h4 className="font-semibold text-sm mb-4 text-white">Policies & Legal</h4>
                            <ul className="space-y-2">
                                <li><Link href="/privacy-policy" className="text-sm text-gray-300 hover:text-white transition-colors">Privacy Policy</Link></li>
                                <li><Link href="/terms-and-conditions" className="text-sm text-gray-300 hover:text-white transition-colors">Terms & Conditions</Link></li>
                                <li><Link href="/cancellation-refund-policy" className="text-sm text-gray-300 hover:text-white transition-colors">Cancellation & Refund</Link></li>
                                <li><Link href="/shipping-policy" className="text-sm text-gray-300 hover:text-white transition-colors">Shipping Policy</Link></li>
                            </ul>
                        </div>
                    </div>
                    {/* Divider */}
                    <div className="border-t border-white/10 mt-8 pt-8">
                        <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-400">
                            <p>&copy; 2025 FUY Media. All rights reserved.</p>
                            <p>Email: <a href="mailto:fuymedia@gmail.com" className="hover:text-white transition-colors">fuymedia@gmail.com</a></p>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Bottom Floating Curved Nav Bar */}
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
                <nav className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full px-8 py-4 shadow-lg pointer-events-auto flex items-center gap-8 hover:bg-white/15 transition-all">
                    {/* Create Post */}
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
                        className="p-1.5 text-white/80 hover:text-white transition-colors hover:scale-110 transform duration-200"
                        title="Explore"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
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
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        {unreadCount > 0 && (
                            <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </Link>

                    {/* Messages */}
                    <Link
                        href="/chat"
                        className="relative p-1.5 text-white/80 hover:text-white transition-colors hover:scale-110 transform duration-200"
                        title="Messages"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {unreadMessageCount > 0 && (
                            <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                                {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                            </span>
                        )}
                    </Link>
                    <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

                    <UserListModal
                        isOpen={showFollowersModal}
                        title="Followers"
                        users={followersList}
                        onClose={() => setShowFollowersModal(false)}
                        onRemoveFriend={handleRemoveFriend}
                        isLoading={loadingFollowers}
                        error={followersError}
                    />
                    <UserListModal
                        isOpen={showFollowingModal}
                        title="Following"
                        users={followingList}
                        onClose={() => setShowFollowingModal(false)}
                        onRemoveFriend={handleRemoveFriend}
                        isLoading={loadingFollowing}
                        error={followingError}
                    />
                </nav>
            </div>
            {reportPostId && (
                <ReportModal
                    isOpen={reportModalOpen}
                    onClose={() => {
                        setReportModalOpen(false);
                        setReportPostId(null);
                    }}
                    postId={reportPostId}
                />
            )}
        </div>
    );
}
