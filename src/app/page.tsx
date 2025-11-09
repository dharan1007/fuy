'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

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

interface Activity {
  id: number;
  user: string;
  action: string;
  amount?: string;
  time: string;
  avatar: string;
}

export default function Home() {
  const { data: session } = useSession();
  const [isMounted, setIsMounted] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [postLikes, setPostLikes] = useState<Record<number, number>>({});
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());

  const users = [
    { id: 1, name: 'Amanda', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=amanda' },
    { id: 2, name: 'John', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john' },
    { id: 3, name: 'Andrew', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=andrew' },
    { id: 4, name: 'Roseline', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=roseline' },
    { id: 5, name: 'Mudeth', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mudeth' },
    { id: 6, name: 'Julet', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=julet' },
    { id: 7, name: 'Bob', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob' },
  ];

  useEffect(() => {
    setIsMounted(true);

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

    const mockActivities: Activity[] = [
      {
        id: 1,
        user: 'Vidaly Alkenasky',
        action: 'subscribed on you',
        amount: '$10.00',
        time: '3 min ago',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=vidaly',
      },
      {
        id: 2,
        user: 'Makaym Karafuli',
        action: 'bought your video',
        amount: '$90.00',
        time: '6 min ago',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=makaym',
      },
      {
        id: 3,
        user: 'Evgeny Aleksandrov',
        action: 'sent you a tip',
        amount: '$30.00',
        time: '7 min ago',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=evgeny',
      },
      {
        id: 4,
        user: 'Roseline Kumbura',
        action: 'sent you job request',
        amount: '$20.00',
        time: '11 min ago',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=roseline',
      },
    ];

    setPosts(mockPosts);
    setActivities(mockActivities);

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
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* HEADER */}
      <header className="border-b-2 border-red-600 bg-black sticky top-0 z-40">
        <div className="max-w-full px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="text-3xl font-bold bg-gradient-to-r from-red-600 to-white bg-clip-text text-transparent">
              FUY
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link
                href="/canvas"
                className="flex items-center gap-2 px-4 py-2 border-2 border-white rounded-lg hover:border-red-600 hover:bg-red-600/10 transition-all group"
              >
                <span className="text-2xl">🎨</span>
                <span className="font-semibold text-white">Canvas</span>
              </Link>
              <Link
                href="/hopin"
                className="flex items-center gap-2 px-4 py-2 border-2 border-white rounded-lg hover:border-red-600 hover:bg-red-600/10 transition-all"
              >
                <span className="text-2xl">📋</span>
                <span className="font-semibold text-white">Hopin</span>
              </Link>
              <Link
                href="/essenz"
                className="flex items-center gap-2 px-4 py-2 border-2 border-white rounded-lg hover:border-red-600 hover:bg-red-600/10 transition-all"
              >
                <span className="text-2xl">🎯</span>
                <span className="font-semibold text-white">Essenz</span>
              </Link>
              <Link
                href="/shop"
                className="flex items-center gap-2 px-4 py-2 border-2 border-white rounded-lg hover:border-red-600 hover:bg-red-600/10 transition-all"
              >
                <span className="text-2xl">🛍️</span>
                <span className="font-semibold text-white">Shop</span>
              </Link>
              <Link
                href="/profile"
                className="flex items-center gap-2 px-4 py-2 border-2 border-white rounded-lg hover:border-red-600 hover:bg-red-600/10 transition-all"
              >
                <span className="text-2xl">👤</span>
                <span className="font-semibold text-white">Profile</span>
              </Link>
            </nav>

            {/* User Info */}
            <div className="flex items-center gap-3">
              {session?.user?.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-10 h-10 rounded-full border-2 border-red-600"
                />
              )}
              <div className="hidden sm:flex flex-col">
                <div className="text-sm font-semibold">{session?.user?.name || 'Guest'}</div>
                <div className="text-xs text-gray-400">Online</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-12 gap-6 px-6 py-6 max-w-full flex-1 bg-gray-950">
        {/* LEFT SIDEBAR */}
        <aside className="col-span-3 border-2 border-red-600 rounded-lg p-6 bg-gray-900">
          {/* User Profile Card */}
          <div className="mb-8">
            <div className="relative w-full h-32 bg-gradient-to-r from-red-600 to-red-500 rounded-lg mb-4" />
            <div className="text-center -mt-16 relative z-10">
              <img
                src={session?.user?.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                alt="Profile"
                className="w-20 h-20 rounded-full border-4 border-red-600 mx-auto mb-2"
              />
              <h3 className="font-bold text-xl text-white">Evgon Ledo</h3>
              <p className="text-sm text-gray-400">@evgledo</p>
              <div className="flex justify-around mt-4 text-sm">
                <div>
                  <div className="font-bold text-red-600 text-lg">1984</div>
                  <div className="text-xs text-gray-400">Followers</div>
                </div>
                <div>
                  <div className="font-bold text-white text-lg">1002</div>
                  <div className="text-xs text-gray-400">Following</div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-300 mb-6">Hello, I'm UXUI designer. Open to the new projects 💡</p>

          <Link href="/profile" className="text-sm text-red-600 font-semibold mb-8 block hover:text-red-400 transition-colors">
            → My Profile
          </Link>

          {/* Skills Section */}
          <div className="mb-8">
            <h4 className="font-bold mb-4 text-sm text-white">Skills</h4>
            <div className="flex flex-wrap gap-2">
              {['UI Design', 'Copywriting', 'Mobile', 'Research', 'User Interview', 'JS', 'Logo'].map((skill) => (
                <span key={skill} className="text-xs bg-red-600/20 border border-red-600 px-3 py-1 rounded-full text-red-400 hover:bg-red-600/40 transition-colors">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Communities Section */}
          <div>
            <h4 className="font-bold mb-4 text-sm text-white">Communities</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 border border-red-600/50 rounded-lg hover:bg-red-600/10 transition-colors">
                <div className="w-8 h-8 rounded-full bg-red-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">UX designers community</p>
                  <p className="text-xs text-gray-400">87 posts inside 👨</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 border border-red-600/50 rounded-lg hover:bg-red-600/10 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gray-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">Frontend developers</p>
                  <p className="text-xs text-gray-400">12 your friends are in</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER FEED */}
        <main className="col-span-6 border-l-2 border-r-2 border-red-600 rounded-lg p-6 bg-gray-900">
          {/* Users Scroll Bar */}
          <div className="mb-8 pb-6 border-b-2 border-red-600/50">
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {users.map((user) => (
                <div key={user.id} className="flex flex-col items-center flex-shrink-0 cursor-pointer group">
                  <div className="w-16 h-16 rounded-full border-3 border-red-600 p-0.5 group-hover:border-white transition-colors">
                    <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full" />
                  </div>
                  <p className="text-xs mt-2 font-medium text-center text-gray-300">{user.name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Create Post */}
          <div className="mb-8 p-5 bg-gray-800 rounded-lg border-2 border-red-600/50">
            <div className="flex gap-3 mb-4">
              <img
                src={session?.user?.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=you'}
                alt="You"
                className="w-10 h-10 rounded-full border border-red-600"
              />
              <input
                type="text"
                placeholder="Tell your thoughts about it..."
                className="flex-1 bg-gray-700 border-2 border-red-600/50 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-600"
              />
            </div>
            <div className="flex gap-4 text-sm">
              <button className="flex items-center gap-1 text-gray-300 hover:text-green-400 border border-green-600/50 px-3 py-1 rounded hover:bg-green-600/20 transition-colors">
                <span>📷</span> Photo
              </button>
              <button className="flex items-center gap-1 text-gray-300 hover:text-blue-400 border border-blue-600/50 px-3 py-1 rounded hover:bg-blue-600/20 transition-colors">
                <span>🎥</span> Video
              </button>
              <button className="flex items-center gap-1 text-gray-300 hover:text-purple-400 border border-purple-600/50 px-3 py-1 rounded hover:bg-purple-600/20 transition-colors">
                <span>📋</span> Poll
              </button>
              <button className="flex items-center gap-1 text-gray-300 hover:text-red-400 border border-red-600/50 px-3 py-1 rounded hover:bg-red-600/20 transition-colors">
                <span>📅</span> Schedule
              </button>
            </div>
          </div>

          {/* Posts Grid - Different Sizes */}
          <div className="grid grid-cols-12 gap-4">
            {posts.map((post) => {
              const colSpan = post.size === 'large' ? 'col-span-12' : post.size === 'medium' ? 'col-span-6' : 'col-span-6';
              const rowSpan = post.size === 'large' ? 'h-auto' : post.size === 'medium' ? 'h-80' : 'h-64';

              return (
                <div key={post.id} className={`${colSpan} ${rowSpan} bg-gray-800 border-2 border-red-600/50 rounded-lg overflow-hidden hover:border-red-600 transition-all hover:shadow-lg hover:shadow-red-600/20`}>
                  {post.image && (
                    <div className="w-full h-48 bg-gray-700 overflow-hidden">
                      <img src={post.image} alt={post.author} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="p-5">
                    {/* Post Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <img src={post.avatar} alt={post.author} className="w-10 h-10 rounded-full border border-red-600" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-white">{post.author}</p>
                        <p className="text-xs text-gray-400">{post.timestamp}</p>
                      </div>
                    </div>

                    {/* Post Content */}
                    <p className="text-sm text-gray-300 mb-4 line-clamp-2">{post.content}</p>

                    {/* Post Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-red-600/30 text-xs">
                      <button
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center gap-1 transition-colors px-2 py-1 rounded border ${
                          likedPosts.has(post.id)
                            ? 'text-red-400 font-semibold border-red-600 bg-red-600/20'
                            : 'text-gray-400 border-red-600/50 hover:border-red-600 hover:text-red-400'
                        }`}
                      >
                        <span className="text-lg">❤️</span>
                        <span>{postLikes[post.id] || 0}</span>
                      </button>
                      <button className="flex items-center gap-1 text-gray-400 hover:text-blue-400 border border-blue-600/50 px-2 py-1 rounded hover:border-blue-600 transition-colors">
                        <span>💬</span>
                        <span>{post.comments}</span>
                      </button>
                      <button className="flex items-center gap-1 text-gray-400 hover:text-green-400 border border-green-600/50 px-2 py-1 rounded hover:border-green-600 transition-colors">
                        <span>🔄</span>
                        <span>{post.shares}</span>
                      </button>
                      <button className="flex items-center gap-1 text-gray-400 hover:text-purple-400 border border-purple-600/50 px-2 py-1 rounded hover:border-purple-600 transition-colors">
                        <span>📤</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="col-span-3 border-2 border-red-600 rounded-lg p-6 bg-gray-900">
          <h3 className="font-bold text-xl mb-6 text-white border-b border-red-600 pb-4">Recent activity</h3>

          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex gap-3 pb-4 border-b border-red-600/30 last:border-b-0">
                <img src={activity.avatar} alt={activity.user} className="w-12 h-12 rounded-full flex-shrink-0 border border-red-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{activity.user}</p>
                  <p className="text-xs text-gray-400">{activity.action}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  {activity.amount && (
                    <>
                      <p className="text-sm font-bold text-green-400">{activity.amount}</p>
                      <button className="text-xs mt-1 px-2 py-1 bg-yellow-600 text-white font-semibold rounded border border-yellow-600 hover:bg-yellow-700 transition-colors">
                        Thanks
                      </button>
                    </>
                  )}
                  {!activity.amount && (
                    <button className="text-xs px-2 py-1 bg-red-600 text-white font-semibold rounded border border-red-600 hover:bg-red-700 transition-colors">
                      Join
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Discord */}
          <div className="mt-8 p-4 bg-purple-900/30 border-2 border-purple-600 rounded-lg text-white text-center">
            <p className="text-sm font-semibold mb-3">Join Our Discord</p>
            <button className="w-full py-2 bg-purple-600 border border-purple-400 rounded font-semibold text-sm hover:bg-purple-700 hover:border-purple-300 transition-all">
              Join Community
            </button>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="border-t-2 border-red-600 bg-gray-900 px-6 py-8 mt-8">
        <div className="max-w-full mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
            {/* Company Links */}
            <div>
              <h4 className="font-bold text-sm mb-4 text-white">Company</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/contact-us" className="text-gray-400 hover:text-red-400 text-sm transition-colors">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/" className="text-gray-400 hover:text-red-400 text-sm transition-colors">
                    About
                  </Link>
                </li>
              </ul>
            </div>

            {/* Policies Links */}
            <div>
              <h4 className="font-bold text-sm mb-4 text-white">Policies</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/privacy-policy" className="text-gray-400 hover:text-red-400 text-sm transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms-and-conditions" className="text-gray-400 hover:text-red-400 text-sm transition-colors">
                    Terms & Conditions
                  </Link>
                </li>
              </ul>
            </div>

            {/* Shipping & Returns */}
            <div>
              <h4 className="font-bold text-sm mb-4 text-white">Support</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/shipping-policy" className="text-gray-400 hover:text-red-400 text-sm transition-colors">
                    Shipping Policy
                  </Link>
                </li>
                <li>
                  <Link href="/cancellation-refund-policy" className="text-gray-400 hover:text-red-400 text-sm transition-colors">
                    Returns & Refunds
                  </Link>
                </li>
              </ul>
            </div>

            {/* Social & Community */}
            <div>
              <h4 className="font-bold text-sm mb-4 text-white">Follow Us</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-400 hover:text-red-400 text-sm transition-colors">
                    Twitter
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-red-400 text-sm transition-colors">
                    Instagram
                  </a>
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h4 className="font-bold text-sm mb-4 text-white">Newsletter</h4>
              <p className="text-gray-400 text-sm mb-2">Subscribe for updates</p>
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-3 py-2 border-2 border-red-600/50 bg-gray-800 text-white rounded text-sm placeholder-gray-500 focus:outline-none focus:border-red-600"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-red-600/50 pt-6 mt-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm">&copy; 2024 FUY. All rights reserved.</p>
              <div className="flex gap-6 mt-4 md:mt-0">
                <Link href="/privacy-policy" className="text-gray-400 hover:text-red-400 text-xs transition-colors">
                  Privacy
                </Link>
                <Link href="/terms-and-conditions" className="text-gray-400 hover:text-red-400 text-xs transition-colors">
                  Terms
                </Link>
                <Link href="/contact-us" className="text-gray-400 hover:text-red-400 text-xs transition-colors">
                  Support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
