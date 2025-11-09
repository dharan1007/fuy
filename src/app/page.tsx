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
  type: 'subscription' | 'purchase' | 'tip' | 'post' | 'job' | 'follow';
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
        action: 'subscribed to your channel',
        amount: '$10.00',
        time: '3 min ago',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=vidaly',
        type: 'subscription',
      },
      {
        id: 2,
        user: 'Makaym Karafuli',
        action: 'purchased your video course',
        amount: '$90.00',
        time: '6 min ago',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=makaym',
        type: 'purchase',
      },
      {
        id: 3,
        user: 'Evgeny Aleksandrov',
        action: 'sent you a tip for your post',
        amount: '$30.00',
        time: '7 min ago',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=evgeny',
        type: 'tip',
      },
      {
        id: 4,
        user: 'Sarah Johnson',
        action: 'posted: "Great design work!"',
        time: '12 min ago',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
        type: 'post',
      },
      {
        id: 5,
        user: 'Roseline Kumbura',
        action: 'sent you a job offer',
        amount: '$2,500/mo',
        time: '15 min ago',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=roseline',
        type: 'job',
      },
      {
        id: 6,
        user: 'Michael Chen',
        action: 'started following you',
        time: '22 min ago',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=michael',
        type: 'follow',
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

  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = {
      subscription: '▸',
      purchase: '◆',
      tip: '◇',
      post: '☐',
      job: '◈',
      follow: '◎',
    };
    return icons[type] || '●';
  };

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      subscription: 'from-blue-400 to-blue-500',
      purchase: 'from-green-400 to-green-500',
      tip: 'from-yellow-400 to-yellow-500',
      post: 'from-purple-400 to-purple-500',
      job: 'from-orange-400 to-orange-500',
      follow: 'from-pink-400 to-pink-500',
    };
    return colors[type] || 'from-gray-400 to-gray-500';
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col relative overflow-hidden">
      {/* Wave Background */}
      <div className="absolute top-0 left-0 right-0 h-96 pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 1200 400" preserveAspectRatio="none">
          <defs>
            <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: '0.08' }} />
              <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: '0.04' }} />
            </linearGradient>
          </defs>
          <path
            d="M0,100 Q300,50 600,100 T1200,100 L1200,0 L0,0 Z"
            fill="url(#waveGradient)"
          />
          <path
            d="M0,150 Q300,120 600,150 T1200,150 L1200,50 Q600,100 0,50 Z"
            fill="url(#waveGradient)"
            opacity="0.5"
          />
          <path
            d="M0,200 Q300,170 600,200 T1200,200 L1200,100 Q600,150 0,100 Z"
            fill="url(#waveGradient)"
            opacity="0.3"
          />
        </svg>
      </div>
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200/50">
        <div className="max-w-full px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              FUY
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/canvas"
                className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-blue-50 transition-all group"
              >
                <span className="text-lg text-gray-700 group-hover:text-blue-600">▭</span>
                <span className="font-semibold text-gray-700 group-hover:text-blue-600">Canvas</span>
              </Link>
              <Link
                href="/hopin"
                className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-blue-50 transition-all group"
              >
                <span className="text-lg text-gray-700 group-hover:text-blue-600">⊞</span>
                <span className="font-semibold text-gray-700 group-hover:text-blue-600">Hopin</span>
              </Link>
              <Link
                href="/essenz"
                className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-blue-50 transition-all group"
              >
                <span className="text-lg text-gray-700 group-hover:text-blue-600">★</span>
                <span className="font-semibold text-gray-700 group-hover:text-blue-600">Essenz</span>
              </Link>
              <Link
                href="/shop"
                className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-blue-50 transition-all group"
              >
                <span className="text-lg text-gray-700 group-hover:text-blue-600">◆</span>
                <span className="font-semibold text-gray-700 group-hover:text-blue-600">Shop</span>
              </Link>
              <Link
                href="/profile"
                className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-blue-50 transition-all group"
              >
                <span className="text-lg text-gray-700 group-hover:text-blue-600">◎</span>
                <span className="font-semibold text-gray-700 group-hover:text-blue-600">Profile</span>
              </Link>
            </nav>

            {/* User Info */}
            <div className="flex items-center gap-3">
              {session?.user?.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-10 h-10 rounded-full border-2 border-blue-400"
                />
              )}
              <div className="hidden sm:flex flex-col">
                <div className="text-sm font-semibold text-gray-800">{session?.user?.name || 'Guest'}</div>
                <div className="text-xs text-green-600 font-medium">Online</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-12 gap-6 px-6 py-6 max-w-full flex-1 bg-white relative z-10">
        {/* LEFT SIDEBAR */}
        <aside className="col-span-3 rounded-2xl p-6 bg-white/50 backdrop-blur-sm border border-white/40 shadow-sm">
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
        <main className="col-span-6 rounded-2xl p-6 bg-white/50 backdrop-blur-sm border border-white/40 shadow-sm">
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
        <aside className="col-span-3 rounded-2xl p-6 bg-white/50 backdrop-blur-sm border border-white/40 shadow-sm">
          <h3 className="font-bold text-xl mb-6 text-gray-800 border-b border-gray-200/50 pb-4">Activity Feed</h3>

          <div className="space-y-4">
            {activities.map((activity) => {
              const bgColors: Record<string, string> = {
                subscription: 'bg-blue-50',
                purchase: 'bg-green-50',
                tip: 'bg-yellow-50',
                post: 'bg-purple-50',
                job: 'bg-orange-50',
                follow: 'bg-pink-50',
              };
              const borderColors: Record<string, string> = {
                subscription: 'border-blue-200',
                purchase: 'border-green-200',
                tip: 'border-yellow-200',
                post: 'border-purple-200',
                job: 'border-orange-200',
                follow: 'border-pink-200',
              };
              const textColors: Record<string, string> = {
                subscription: 'text-blue-700',
                purchase: 'text-green-700',
                tip: 'text-yellow-700',
                post: 'text-purple-700',
                job: 'text-orange-700',
                follow: 'text-pink-700',
              };

              return (
                <div key={activity.id} className={`${bgColors[activity.type]} ${borderColors[activity.type]} border rounded-xl p-4 hover:shadow-md transition-all`}>
                  <div className="flex gap-3">
                    <img src={activity.avatar} alt={activity.user} className="w-12 h-12 rounded-full flex-shrink-0 border border-gray-300 shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{activity.user}</p>
                      <p className={`text-xs ${textColors[activity.type]} font-medium`}>{getActivityIcon(activity.type)} {activity.action}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
                  {activity.amount && (
                    <div className="mt-3 flex items-center justify-between">
                      <p className={`text-sm font-bold ${textColors[activity.type]}`}>{activity.amount}</p>
                      <button className={`text-xs px-3 py-1 ${textColors[activity.type]} bg-white border ${borderColors[activity.type]} font-semibold rounded-lg hover:bg-gray-50 transition-colors`}>
                        {activity.type === 'job' ? 'Review' : 'Reply'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Community */}
          <div className="mt-8 p-4 bg-gradient-to-br from-blue-50 to-purple-50 border border-purple-200 rounded-2xl text-center">
            <p className="text-sm font-semibold text-gray-800 mb-3">Join Our Community</p>
            <button className="w-full py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white border border-blue-400 rounded-lg font-semibold text-sm hover:shadow-md transition-all">
              Join Discord
            </button>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200/50 bg-white/50 backdrop-blur-sm px-6 py-8 mt-8 relative z-10">
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
    </div>
  );
}
