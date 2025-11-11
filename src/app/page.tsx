'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Waves from '@/components/Waves';
import HopinProgramsCard from '@/components/HopinProgramsCard';
import RankingCard from '@/components/RankingCard';
import SearchModal from '@/components/SearchModal';
import NotificationsModal from '@/components/NotificationsModal';

interface Post {
  id: number;
  author: string;
  avatar: string;
  content: string;
  image?: string;
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
  liked?: boolean;
  size: 'small' | 'medium' | 'large';
}

export default function Home() {
  const { data: session } = useSession();
  const [isMounted, setIsMounted] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postLikes, setPostLikes] = useState<Record<number, number>>({});
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const users = [
    { id: 1, name: 'Amanda', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=amanda' },
    { id: 2, name: 'John', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john' },
    { id: 3, name: 'Andrew', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=andrew' },
    { id: 4, name: 'Roseline', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=roseline' },
    { id: 5, name: 'Mudeth', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mudeth' },
    { id: 6, name: 'Julet', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=julet' },
    { id: 7, name: 'Bob', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob' },
  ];

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

  useEffect(() => {
    setIsMounted(true);
    fetchUnreadCount();

    // Initialize posts with different sizes
    const mockPosts: Post[] = [
      {
        id: 1,
        author: '@Mud-senshi',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
        content: 'In some cases you may see a third-party client name, which indicates the Tweet came from a non-Twitter-client application.',
        timestamp: '1 hour ago',
        likes: 145,
        comments: 23,
        shares: 12,
        size: 'medium',
        liked: false,
      },
      {
        id: 2,
        author: 'Design Team',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
        content: 'Beautiful interface design showcase',
        image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=500&h=400',
        timestamp: '2 hours ago',
        likes: 892,
        comments: 156,
        shares: 89,
        size: 'large',
        liked: false,
      },
      {
        id: 3,
        author: 'Creative Mind',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
        content: 'New project launch',
        timestamp: '3 hours ago',
        likes: 234,
        comments: 34,
        shares: 22,
        size: 'small',
        liked: false,
      },
      {
        id: 4,
        author: 'Innovation Hub',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=4',
        content: 'Tech trends for 2024',
        image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=400',
        timestamp: '4 hours ago',
        likes: 456,
        comments: 78,
        shares: 45,
        size: 'large',
        liked: false,
      },
      {
        id: 5,
        author: 'Code Master',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=5',
        content: 'Building amazing experiences',
        timestamp: '5 hours ago',
        likes: 123,
        comments: 18,
        shares: 9,
        size: 'medium',
        liked: false,
      },
      {
        id: 6,
        author: 'Art Gallery',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=6',
        content: 'Incredible artwork collection',
        image: 'https://images.unsplash.com/photo-1579783902614-e3fb5141b0cb?w=500&h=400',
        timestamp: '6 hours ago',
        likes: 567,
        comments: 95,
        shares: 54,
        size: 'medium',
        liked: false,
      },
    ];

    setPosts(mockPosts);

    // Initialize likes
    const initialLikes: Record<number, number> = {};
    mockPosts.forEach(post => {
      initialLikes[post.id] = post.likes;
    });
    setPostLikes(initialLikes);
  }, []);

  const handleLike = (postId: number) => {
    setLikedPosts(prev => {
      const newLiked = new Set(prev);
      if (newLiked.has(postId)) {
        newLiked.delete(postId);
        setPostLikes(p => ({ ...p, [postId]: (p[postId] || 0) - 1 }));
      } else {
        newLiked.add(postId);
        setPostLikes(p => ({ ...p, [postId]: (p[postId] || 0) + 1 }));
      }
      return newLiked;
    });
  };


  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col relative overflow-hidden">
      {/* Wave Background - Full Screen with Interactive Waves */}
      <Waves
        lineColor="rgba(59, 130, 246, 0.15)"
        backgroundColor="transparent"
        waveSpeedX={0.0125}
        waveSpeedY={0.005}
        waveAmpX={32}
        waveAmpY={16}
        xGap={10}
        yGap={32}
        friction={0.925}
        tension={0.005}
        maxCursorMove={100}
        className="-z-10"
      />
      {/* HEADER - Minimal Floating */}
      <header className="sticky top-0 z-40 px-6 py-4 pointer-events-none">
        <div className="flex items-center justify-between gap-4">
          {/* Logo/Explore Module */}
          <div className="bg-white/40 backdrop-blur-md border border-white/40 rounded-2xl px-6 py-3 shadow-sm pointer-events-auto hover:bg-white/50 transition-all">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">◌</span>
              <span className="text-sm font-semibold text-gray-700">Explore</span>
            </Link>
          </div>

          {/* Navigation Module */}
          <div className="bg-white/40 backdrop-blur-md border border-white/40 rounded-2xl px-6 py-3 shadow-sm pointer-events-auto hover:bg-white/50 transition-all flex items-center gap-6">
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

          {/* User Profile Module */}
          <div className="bg-white/40 backdrop-blur-md border border-white/40 rounded-2xl px-4 py-2 shadow-sm pointer-events-auto hover:bg-white/50 transition-all">
            <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              {session?.user?.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-8 h-8 rounded-full border-2 border-blue-400"
                />
              )}
              <div className="hidden sm:flex flex-col">
                <div className="text-xs font-semibold text-gray-800">{session?.user?.name || 'Guest'}</div>
                <div className="text-xs text-green-600 font-medium">Online</div>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-12 gap-6 px-6 py-6 max-w-full flex-1 bg-white/5 relative z-10">
        {/* LEFT SIDEBAR */}
        <aside className="col-span-3 rounded-2xl p-6 bg-white/30 backdrop-blur-sm border border-white/40 shadow-sm">
          {/* User Profile Card */}
          <div className="mb-8">
            <div className="relative w-full h-32 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl mb-4" />
            <div className="text-center -mt-16 relative z-10">
              <img
                src={session?.user?.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                alt="Profile"
                className="w-20 h-20 rounded-full border-4 border-white mx-auto mb-2 shadow-lg"
              />
              <h3 className="font-bold text-xl text-gray-800">Evgon Ledo</h3>
              <p className="text-sm text-gray-500">@evgledo</p>
              <div className="flex justify-around mt-4 text-sm">
                <div>
                  <div className="font-bold text-blue-600 text-lg">1984</div>
                  <div className="text-xs text-gray-500">Followers</div>
                </div>
                <div>
                  <div className="font-bold text-gray-700 text-lg">1002</div>
                  <div className="text-xs text-gray-500">Following</div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-6">Hello, I'm UXUI designer. Open to the new projects 💡</p>

          <Link href="/profile" className="text-sm text-blue-600 font-semibold mb-8 block hover:text-blue-700 transition-colors">
            → My Profile
          </Link>

          {/* Skills Section */}
          <div className="mb-8">
            <h4 className="font-bold mb-4 text-sm text-gray-800">Skills</h4>
            <div className="flex flex-wrap gap-2">
              {['UI Design', 'Copywriting', 'Mobile', 'Research', 'User Interview', 'JS', 'Logo'].map((skill) => (
                <span key={skill} className="text-xs bg-blue-50 border border-blue-200 px-3 py-1 rounded-full text-blue-700 hover:bg-blue-100 transition-colors">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Communities Section */}
          <div>
            <h4 className="font-bold mb-4 text-sm text-gray-800">Communities</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 border border-blue-100/50 rounded-xl hover:bg-blue-50 transition-colors bg-blue-50/30">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">UX designers community</p>
                  <p className="text-xs text-gray-500">87 posts inside 👨</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 border border-purple-100/50 rounded-xl hover:bg-purple-50 transition-colors bg-purple-50/30">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Frontend developers</p>
                  <p className="text-xs text-gray-500">12 your friends are in</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER FEED */}
        <main className="col-span-6 rounded-2xl p-6 bg-white/30 backdrop-blur-sm border border-white/40 shadow-sm">
          {/* Users Scroll Bar */}
          <div className="mb-8 pb-6 border-b border-gray-200/50">
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {users.map((user) => (
                <div key={user.id} className="flex flex-col items-center flex-shrink-0 cursor-pointer group">
                  <div className="w-16 h-16 rounded-full border-2 border-gray-300 p-0.5 group-hover:border-blue-400 transition-colors">
                    <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full" />
                  </div>
                  <p className="text-xs mt-2 font-medium text-center text-gray-600">{user.name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Create Post */}
          <div className="mb-8 p-5 bg-gray-50/80 rounded-2xl border border-gray-200/50 backdrop-blur-sm">
            <div className="flex gap-3 mb-4">
              <img
                src={session?.user?.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=you'}
                alt="You"
                className="w-10 h-10 rounded-full border border-gray-200"
              />
              <input
                type="text"
                placeholder="Tell your thoughts about it..."
                className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div className="flex gap-4 text-sm">
              <button className="flex items-center gap-1 text-gray-600 hover:text-blue-600 border border-gray-200 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors font-medium">
                <span>⌬</span> Photo
              </button>
              <button className="flex items-center gap-1 text-gray-600 hover:text-blue-600 border border-gray-200 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors font-medium">
                <span>▶</span> Video
              </button>
              <button className="flex items-center gap-1 text-gray-600 hover:text-blue-600 border border-gray-200 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors font-medium">
                <span>⊕</span> Poll
              </button>
              <button className="flex items-center gap-1 text-gray-600 hover:text-blue-600 border border-gray-200 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors font-medium">
                <span>⏱</span> Schedule
              </button>
            </div>
          </div>

          {/* Posts Grid - Different Sizes */}
          <div className="grid grid-cols-12 gap-4">
            {posts.map((post) => {
              const colSpan = 'col-span-12';
              const rowSpan = post.size === 'large' ? 'min-h-96' : post.size === 'medium' ? 'min-h-72' : 'min-h-64';

              return (
                <div key={post.id} className={`${colSpan} ${rowSpan} bg-white/50 backdrop-blur-sm rounded-2xl overflow-hidden hover:bg-white/70 transition-all border border-white/40 shadow-sm hover:shadow-md flex flex-col`}>
                  {post.image && (
                    <div className="w-full h-48 bg-gray-200 overflow-hidden">
                      <img src={post.image} alt={post.author} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="p-5 flex-1 flex flex-col">
                    {/* Post Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <img src={post.avatar} alt={post.author} className="w-10 h-10 rounded-full border border-gray-300" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800">{post.author}</p>
                        <p className="text-xs text-gray-500">{post.timestamp}</p>
                      </div>
                    </div>

                    {/* Post Content */}
                    <p className="text-sm text-gray-700 mb-4 flex-1 line-clamp-3">{post.content}</p>

                    {/* Post Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200/50 text-xs">
                      <button
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center gap-1 transition-colors px-2 py-1 rounded-lg border ${
                          likedPosts.has(post.id)
                            ? 'text-red-600 font-semibold border-red-300 bg-red-50'
                            : 'text-gray-500 border-gray-200 hover:border-red-300 hover:text-red-600 hover:bg-red-50'
                        }`}
                      >
                        <span className="text-lg">♥</span>
                        <span>{postLikes[post.id] || 0}</span>
                      </button>
                      <button className="flex items-center gap-1 text-gray-500 hover:text-blue-600 border border-gray-200 px-2 py-1 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
                        <span>◊</span>
                        <span>{post.comments}</span>
                      </button>
                      <button className="flex items-center gap-1 text-gray-500 hover:text-green-600 border border-gray-200 px-2 py-1 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors">
                        <span>↻</span>
                        <span>{post.shares}</span>
                      </button>
                      <button className="flex items-center gap-1 text-gray-500 hover:text-purple-600 border border-gray-200 px-2 py-1 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors">
                        <span>↗</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="col-span-3 rounded-2xl p-6 bg-white/30 backdrop-blur-sm border border-white/40 shadow-sm overflow-y-auto max-h-[calc(100vh-200px)]">
          <HopinProgramsCard />
          <RankingCard />
        </aside>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200/50 bg-white/20 backdrop-blur-sm px-6 py-8 mt-8 relative z-10">
        <div className="max-w-full mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
            {/* Company Links */}
            <div>
              <h4 className="font-bold text-sm mb-4 text-gray-800">Company</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/contact-us" className="text-gray-600 hover:text-blue-600 text-sm transition-colors">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/" className="text-gray-600 hover:text-blue-600 text-sm transition-colors">
                    About
                  </Link>
                </li>
              </ul>
            </div>

            {/* Policies Links */}
            <div>
              <h4 className="font-bold text-sm mb-4 text-gray-800">Policies</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/privacy-policy" className="text-gray-600 hover:text-blue-600 text-sm transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms-and-conditions" className="text-gray-600 hover:text-blue-600 text-sm transition-colors">
                    Terms & Conditions
                  </Link>
                </li>
              </ul>
            </div>

            {/* Shipping & Returns */}
            <div>
              <h4 className="font-bold text-sm mb-4 text-gray-800">Support</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/shipping-policy" className="text-gray-600 hover:text-blue-600 text-sm transition-colors">
                    Shipping Policy
                  </Link>
                </li>
                <li>
                  <Link href="/cancellation-refund-policy" className="text-gray-600 hover:text-blue-600 text-sm transition-colors">
                    Returns & Refunds
                  </Link>
                </li>
              </ul>
            </div>

            {/* Social & Community */}
            <div>
              <h4 className="font-bold text-sm mb-4 text-gray-800">Follow Us</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-600 hover:text-blue-600 text-sm transition-colors">
                    Twitter
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-blue-600 text-sm transition-colors">
                    Instagram
                  </a>
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h4 className="font-bold text-sm mb-4 text-gray-800">Newsletter</h4>
              <p className="text-gray-600 text-sm mb-2">Subscribe for updates</p>
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-3 py-2 border border-gray-200 bg-white text-gray-800 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200/50 pt-6 mt-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-600 text-sm">&copy; 2024 FUY. All rights reserved.</p>
              <div className="flex gap-6 mt-4 md:mt-0">
                <Link href="/privacy-policy" className="text-gray-600 hover:text-blue-600 text-xs transition-colors">
                  Privacy
                </Link>
                <Link href="/terms-and-conditions" className="text-gray-600 hover:text-blue-600 text-xs transition-colors">
                  Terms
                </Link>
                <Link href="/contact-us" className="text-gray-600 hover:text-blue-600 text-xs transition-colors">
                  Support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Bottom Floating Curved Nav Bar */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
        <nav className="bg-white/40 backdrop-blur-md border border-white/40 rounded-full px-8 py-4 shadow-lg pointer-events-auto flex items-center gap-8 hover:bg-white/50 transition-all">
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

          {/* Essenz Dashboard */}
          <Link
            href="/essenz"
            className="p-1.5 text-gray-700 hover:text-blue-600 transition-colors hover:scale-110 transform duration-200"
            title="Essenz Dashboard"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </Link>
        </nav>
      </div>

      {/* Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Notifications Modal */}
      <NotificationsModal isOpen={isNotificationsOpen} onClose={() => {
        setIsNotificationsOpen(false);
        fetchUnreadCount(); // Refresh count when modal closes
      }} />
    </div>
  );
}
