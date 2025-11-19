'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import SearchModal from '@/components/SearchModal';
import NotificationsModal from '@/components/NotificationsModal';
import UserListModal from '@/components/UserListModal';
import HomeSidebarProfile from '@/components/HomeSidebarProfile';
import HomeSidebarSuggestions from '@/components/HomeSidebarSuggestions';
import HopinProgramsCard from '@/components/HopinProgramsCard';
import RankingCard from '@/components/RankingCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import ParticlesBackground from '@/components/ParticlesBackground';

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

export default function Home() {
  const { data: session, status } = useSession();
  const [isMounted, setIsMounted] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
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
      ]).finally(() => {
        setLoading(false);
      });
    }
  }, [status]);

  // Show loading spinner while session is loading
  if (status === 'loading') {
    return <LoadingSpinner message="Authenticating your session..." />;
  }

  if (!isMounted) return null;

  // Show login prompt if user is not authenticated
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-black">
        <ParticlesBackground />
        <div className="text-center space-y-6 relative z-10">
          <div>
            <h1 className="text-4xl font-bold text-white mb-3">Welcome to FUY Media</h1>
            <p className="text-lg text-gray-300">Connect, share, and grow together</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="cursor-target px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="cursor-target px-8 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayName = userProfile?.profile?.displayName || userProfile?.name || 'User';
  const avatarUrl = userProfile?.profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`;

  return (
    <div className="min-h-screen text-white flex flex-col relative overflow-hidden">
      <ParticlesBackground />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/40 z-5 pointer-events-none" />
      {/* HEADER - Minimal Floating */}
      <header className="sticky top-0 z-50 px-4 sm:px-6 py-4 pointer-events-none relative">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          {/* Logo/Explore Module */}
          <div className="bg-white/50 backdrop-blur-md border border-white/40 rounded-lg sm:rounded-xl px-4 sm:px-6 py-2.5 sm:py-3 shadow-sm pointer-events-auto hover:bg-white/60 transition-all">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg sm:text-2xl">◌</span>
              <span className="hidden sm:inline text-sm font-semibold text-gray-800">Explore</span>
            </Link>
          </div>

          {/* Navigation Module - Desktop Only */}
          <div className="hidden sm:flex bg-white/50 backdrop-blur-md border border-white/40 rounded-xl px-6 py-3 shadow-sm pointer-events-auto hover:bg-white/60 transition-all items-center gap-6">
            {/* Canvas */}
            <Link href="/journal" className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors">
              ▭
            </Link>

            {/* Hopin */}
            <Link href="/hopin" className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors">
              ⊞
            </Link>

            {/* Shop */}
            <Link href="/shop" className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors">
              ◆
            </Link>

            {/* Dashboard */}
            <Link href="/dashboard" className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors">
              ⊕
            </Link>
          </div>

          {/* Navigation Menu - Mobile Only */}
          <div className="sm:hidden relative">
            <button
              onClick={() => setShowNavMenu(!showNavMenu)}
              className="bg-white/50 backdrop-blur-md border border-white/40 rounded-lg px-3 py-2 shadow-sm pointer-events-auto hover:bg-white/60 transition-all text-gray-800 font-semibold"
            >
              ≡
            </button>
            {showNavMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-black/10 rounded-lg shadow-lg p-2 space-y-1 pointer-events-auto">
                <Link href="/journal" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors">
                  ▭ Canvas
                </Link>
                <Link href="/hopin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors">
                  ⊞ Hopin
                </Link>
                <Link href="/shop" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors">
                  ◆ Shop
                </Link>
                <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors">
                  ⊕ Dashboard
                </Link>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-2 sm:px-3 lg:px-4 py-10 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Left Sidebar - User Profile + Suggestions */}
          <div className="md:col-span-1 flex flex-col gap-4">
            <HomeSidebarProfile
              userProfile={userProfile}
              avatarUrl={avatarUrl}
              displayName={displayName}
              onFetchFollowers={fetchFollowers}
              onFetchFollowing={fetchFollowing}
            />
            <HomeSidebarSuggestions />
          </div>

          {/* Center Feed */}
          <div className="md:col-span-2 space-y-6">
            {/* Create Post Card */}
            <div className="border border-white/30 rounded-lg overflow-hidden bg-white/80 backdrop-blur">
              {/* Tabs */}
              <div className="flex border-b border-black/10">
                <button
                  onClick={() => setCreatePostTab('text')}
                  className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${
                    createPostTab === 'text'
                      ? 'bg-black text-white'
                      : 'bg-transparent text-black hover:bg-black/5'
                  }`}
                >
                  Post
                </button>
                <button
                  onClick={() => setCreatePostTab('media')}
                  className={`flex-1 py-4 text-sm font-medium text-center transition-colors border-l border-black/10 ${
                    createPostTab === 'media'
                      ? 'bg-black text-white'
                      : 'bg-transparent text-black hover:bg-black/5'
                  }`}
                >
                  Image & Video
                </button>
                <button
                  onClick={() => setCreatePostTab('link')}
                  className={`flex-1 py-4 text-sm font-medium text-center transition-colors border-l border-black/10 ${
                    createPostTab === 'link'
                      ? 'bg-black text-white'
                      : 'bg-transparent text-black hover:bg-black/5'
                  }`}
                >
                  Link
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleCreatePost} className="p-6 space-y-4">
                {createPostTab === 'text' && (
                  <>
                    <input
                      type="text"
                      placeholder="Title (optional)"
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      maxLength={100}
                      className="w-full px-4 py-2 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 text-sm"
                    />
                    <textarea
                      placeholder="Share your thoughts..."
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      maxLength={2000}
                      rows={4}
                      className="w-full px-4 py-2 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 text-sm resize-none"
                    />
                    <div className="flex gap-4">
                      <select
                        value={postFeature}
                        onChange={(e) => setPostFeature(e.target.value)}
                        className="flex-1 px-4 py-2 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 text-sm"
                      >
                        <option disabled>Select feature</option>
                        {features.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                      <select
                        value={postVisibility}
                        onChange={(e) => setPostVisibility(e.target.value)}
                        className="flex-1 px-4 py-2 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 text-sm"
                      >
                        {visibilities.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {createPostTab === 'media' && (
                  <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-black/20 rounded-lg">
                    <svg className="w-12 h-12 text-black/30 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-black/60">Upload images or videos</p>
                  </div>
                )}

                {createPostTab === 'link' && (
                  <div className="space-y-4">
                    <input
                      type="url"
                      placeholder="Paste link..."
                      className="w-full px-4 py-2 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 text-sm"
                    />
                    <p className="text-xs text-black/50">Share interesting links with your network</p>
                  </div>
                )}

                {postError && (
                  <div className="p-3 bg-black/5 border border-black/10 rounded-lg text-sm text-black">
                    {postError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={postSubmitting || !postContent.trim()}
                  className="w-full py-2 bg-black text-white rounded-lg font-medium text-sm hover:bg-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {postSubmitting ? 'Posting...' : 'Post'}
                </button>
              </form>
            </div>

            {/* Posts Feed */}
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="text-center py-12 border border-white/30 rounded-lg bg-white/80 backdrop-blur">
                  <p className="text-gray-600">No posts yet. Be the first to share!</p>
                </div>
              ) : (
                posts.map((post) => (
                  <div key={post.id} className="border border-white/30 rounded-lg p-6 bg-white/80 backdrop-blur hover:border-white/40 transition-colors">
                    <div className="flex items-start gap-4 mb-4">
                      <img
                        src={post.user.profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${post.user.profile?.displayName || post.user.email}`}
                        alt={post.user.profile?.displayName || post.user.email}
                        className="w-10 h-10 rounded-full border border-black/20"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm">{post.user.profile?.displayName || post.user.email}</div>
                        <div className="text-xs text-black/50">{new Date(post.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>

                    <p className="text-sm text-black mb-4 leading-relaxed">{post.content}</p>

                    {post.media && post.media.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {post.media.map((m, i) => (
                          <img key={i} src={m.url} alt="post media" className="w-full h-32 object-cover rounded-lg bg-black/5" />
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-6 text-xs text-black/60 border-t border-black/10 pt-4">
                      <button className="flex items-center gap-2 hover:text-black transition-colors">
                        <svg className="w-4 h-4" fill={post.likedByMe ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span>{post.likes}</span>
                      </button>
                      <button className="flex items-center gap-2 hover:text-black transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>{post.comments}</span>
                      </button>
                      <button className="flex items-center gap-2 hover:text-black transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>{post.shares}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Sidebar - Features Cards */}
          <aside className="hidden md:block md:col-span-1 space-y-4">
            <HopinProgramsCard />
            <RankingCard />
          </aside>
        </div>
      </main>

      {/* Bottom Floating Curved Nav Bar */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
        <nav className="bg-white/50 backdrop-blur-md border border-white/40 rounded-full px-8 py-4 shadow-lg pointer-events-auto flex items-center gap-8 hover:bg-white/60 transition-all">
          {/* Create Post */}
          <button
            className="text-2xl text-gray-700 hover:text-blue-600 transition-colors hover:scale-110 transform duration-200"
            title="Create Post"
            onClick={() => {
              // Can be connected to a create post modal
            }}
          >
            +
          </button>

          {/* Search */}
          <button
            className="p-1.5 text-gray-700 hover:text-blue-600 transition-colors hover:scale-110 transform duration-200"
            title="Search"
            onClick={() => setIsSearchOpen(true)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Notifications */}
          <button
            className="relative p-1.5 text-gray-700 hover:text-blue-600 transition-colors hover:scale-110 transform duration-200"
            title="Notifications"
            onClick={() => setIsNotificationsOpen(true)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Messages */}
          <Link
            href="/chat"
            className="relative p-1.5 text-gray-700 hover:text-blue-600 transition-colors hover:scale-110 transform duration-200"
            title="Messages"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
              3
            </span>
          </Link>
        </nav>
      </div>

      {/* Footer */}
      <footer className="relative mt-16 border-t border-white/50 bg-gradient-to-b from-white/60 to-white/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div>
              <h3 className="font-bold text-lg mb-4 text-gray-900">FUY Media</h3>
              <p className="text-sm text-gray-700">Real-time messaging platform connecting people authentically.</p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-sm mb-4 text-gray-900">Product</h4>
              <ul className="space-y-2">
                <li><Link href="/journal" className="text-sm text-gray-700 hover:text-gray-900 transition-colors">Journal</Link></li>
                <li><Link href="/hopin" className="text-sm text-gray-700 hover:text-gray-900 transition-colors">Hopin</Link></li>
                <li><Link href="/shop" className="text-sm text-gray-700 hover:text-gray-900 transition-colors">Shop</Link></li>
                <li><Link href="/dashboard" className="text-sm text-gray-700 hover:text-gray-900 transition-colors">Dashboard</Link></li>
              </ul>
            </div>

            {/* Community */}
            <div>
              <h4 className="font-semibold text-sm mb-4 text-gray-900">Community</h4>
              <ul className="space-y-2">
                <li><Link href="/chat" className="text-sm text-gray-700 hover:text-gray-900 transition-colors">Messages</Link></li>
                <li><Link href="/profile" className="text-sm text-gray-700 hover:text-gray-900 transition-colors">Profile</Link></li>
                <li><Link href="/contact-us" className="text-sm text-gray-700 hover:text-gray-900 transition-colors">Contact Us</Link></li>
              </ul>
            </div>

            {/* Policies */}
            <div>
              <h4 className="font-semibold text-sm mb-4 text-gray-900">Policies & Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/privacy-policy" className="text-sm text-gray-700 hover:text-gray-900 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms-and-conditions" className="text-sm text-gray-700 hover:text-gray-900 transition-colors">Terms & Conditions</Link></li>
                <li><Link href="/cancellation-refund-policy" className="text-sm text-gray-700 hover:text-gray-900 transition-colors">Cancellation & Refund</Link></li>
                <li><Link href="/shipping-policy" className="text-sm text-gray-700 hover:text-gray-900 transition-colors">Shipping Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/50 mt-8 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-800">
              <p>&copy; 2025 FUY Media. All rights reserved.</p>
              <p>Email: <a href="mailto:fuymedia@gmail.com" className="hover:text-gray-900 transition-colors">fuymedia@gmail.com</a></p>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <NotificationsModal isOpen={isNotificationsOpen} onClose={() => {
        setIsNotificationsOpen(false);
        fetchUnreadCount();
        // Refresh profile to update follower/following counts
        fetchUserProfile();
      }} />
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
    </div>
  );
}
