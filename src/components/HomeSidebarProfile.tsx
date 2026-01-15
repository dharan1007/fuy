

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Copy, MapPin } from 'lucide-react';

interface UserProfile {
  name: string | null;
  profileCode?: string | null;
  profile: {
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    location: string | null;
    conversationStarter?: string | null;
    dob?: string | null;
    city?: string | null;
    height?: string | null;
    weight?: string | null;
  } | null;
  stats: {
    friends: number;
    posts: number;
    followers: number;
    following: number;
  };
}

interface Rank {
  categoryId: string;
  rank: number;
  score: number;
}


interface HopinPlan {
  id: string;
  title: string;
  status: string;
}

interface TodoItem {
  id: string;
  title: string;
  status: string;
  dueDate?: string;
}

interface HomeSidebarProfileProps {
  userProfile: UserProfile | null;
  avatarUrl: string;
  displayName: string;
  userId?: string;
  onFetchFollowers: () => void;
  onFetchFollowing: () => void;
  initialRanks?: Rank[];
  initialPlans?: HopinPlan[];
  initialTodos?: TodoItem[];
}

/* eslint-disable @next/next/no-img-element */
export default function HomeSidebarProfile({
  userProfile,
  avatarUrl,
  displayName,
  userId,
  onFetchFollowers,
  onFetchFollowing,
  initialRanks = [],
  initialPlans = [],
  initialTodos = []
}: HomeSidebarProfileProps) {
  const router = useRouter();
  const [userRanks, setUserRanks] = useState<Rank[]>(initialRanks);
  const [hopinPlans, setHopinPlans] = useState<HopinPlan[]>(initialPlans);
  const [todos, setTodos] = useState<TodoItem[]>(initialTodos);
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    if (initialRanks.length > 0) setUserRanks(initialRanks);
    if (initialPlans.length > 0) setHopinPlans(initialPlans);
    if (initialTodos.length > 0) setTodos(initialTodos);
  }, [initialRanks, initialPlans, initialTodos]);

  const handleToggleTodo = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
      setTodos(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));

      await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
    } catch (error) {
      console.error('Error toggling todo:', error);
    }
  };

  const copyCode = () => {
    if (userProfile?.profileCode) {
      navigator.clipboard.writeText(userProfile.profileCode);
      // Ideally show toast here
    }
  };

  if (!userProfile) return null;

  const age = userProfile.profile?.dob ? new Date().getFullYear() - new Date(userProfile.profile.dob).getFullYear() : null;

  return (
    <aside className="md:col-span-1">
      <div className="sticky top-20 space-y-6">
        {/* Main "Identity" Card - Mobile Style */}
        <div className="rounded-3xl bg-black overflow-hidden border border-white/10 relative">
          {/* Background Gradient/Image if accessible, else generic dark */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-black z-0 pointer-events-none" />

          {/* Profile Code Pill */}
          {userProfile.profileCode && (
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={copyCode}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full border border-white/10 transition-colors backdrop-blur-md group"
              >
                <span className="text-white font-black tracking-widest text-xs">#{userProfile.profileCode}</span>
                <Copy size={12} className="text-white/50 group-hover:text-white" />
              </button>
            </div>
          )}

          <div className="p-6 pt-12 relative z-10 flex flex-col items-center">
            {/* Avatar */}
            <div className="w-28 h-28 rounded-full border-4 border-white/10 overflow-hidden mb-5 relative group cursor-pointer" onClick={() => router.push('/profile')}>
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
              />
            </div>

            {/* Name & Title */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 w-full text-center mb-4">
              <h3 className="text-white text-xl font-black tracking-tight">{displayName}</h3>
              <p className="text-white/50 text-xs font-bold mt-1">@{userProfile.name?.toLowerCase().replace(/\s+/g, '') || 'user'}</p>
            </div>

            {/* Info Badges (Age, City) */}
            <div className="flex flex-wrap justify-center gap-2 w-full mb-4">
              {age && (
                <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 items-center flex-1 min-w-[30%]">
                  <div className="text-white/40 text-[9px] font-black tracking-widest text-center mb-0.5">AGE</div>
                  <div className="text-white text-sm font-black text-center">{age}</div>
                </div>
              )}
              {(userProfile.profile?.city || userProfile.profile?.location) && (
                <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 items-center flex-1 min-w-[30%]">
                  <div className="text-white/40 text-[9px] font-black tracking-widest text-center mb-0.5">LOC</div>
                  <div className="text-white text-sm font-black text-center truncate px-1">
                    {userProfile.profile?.city || userProfile.profile?.location}
                  </div>
                </div>
              )}
            </div>

            {/* Conversation Starter */}
            {userProfile.profile?.conversationStarter && (
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 w-full mb-6">
                <div className="text-white/40 text-[9px] font-black tracking-widest mb-2 text-center">CONVERSATION STARTER</div>
                <p className="text-white text-sm font-bold italic text-center leading-relaxed">"{userProfile.profile.conversationStarter}"</p>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 w-full border-t border-white/10 pt-6">
              <div className="text-center group cursor-pointer hover:bg-white/5 rounded-lg p-1 transition-colors">
                <div className="font-bold text-lg text-white">{userProfile.stats.posts}</div>
                <div className="text-[10px] text-white/50 font-black tracking-widest">POSTS</div>
              </div>
              <button onClick={onFetchFollowers} className="text-center group cursor-pointer hover:bg-white/5 rounded-lg p-1 transition-colors">
                <div className="font-bold text-lg text-white">{userProfile.stats.followers}</div>
                <div className="text-[10px] text-white/50 font-black tracking-widest">FOLLOWERS</div>
              </button>
              <button onClick={onFetchFollowing} className="text-center group cursor-pointer hover:bg-white/5 rounded-lg p-1 transition-colors">
                <div className="font-bold text-lg text-white">{userProfile.stats.following}</div>
                <div className="text-[10px] text-white/50 font-black tracking-widest">FOLLOWING</div>
              </button>
            </div>

            <Link
              href="/profile"
              className="mt-6 w-full text-center py-3 bg-white text-black rounded-xl font-black text-xs tracking-widest hover:bg-gray-200 transition-colors"
            >
              VIEW FULL PROFILE
            </Link>
          </div>
        </div>

        {/* Hopin Plans Card - Glass */}
        {hopinPlans.length > 0 && (
          <div className="rounded-3xl p-6 bg-black/40 backdrop-blur-md border border-white/10 hover:border-white/20 transition-all">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-black tracking-widest text-white/50">PLANS</span>
              <div className="flex-1 h-px bg-white/10 mx-2" />
              <Link href="/hopin" className="text-blue-400 hover:text-blue-300 text-xs font-bold">
                VIEW ALL
              </Link>
            </div>
            <div className="space-y-3">
              {hopinPlans.slice(0, 3).map((plan, i) => (
                <div key={`${plan.id}-${i}`} className="flex items-center gap-3 group">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-blue-400 transition-colors" />
                  <div className="text-sm text-white/80 truncate font-medium group-hover:text-white transition-colors">
                    {plan.title}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TO-DO List Card - Glass */}
        <div className="rounded-3xl p-6 bg-black/40 backdrop-blur-md border border-white/10 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-5">
            <span className="text-[10px] font-black tracking-widest text-white/50">TASKS</span>
            <button
              onClick={() => router.push('/journal')}
              className="flex items-center gap-1.5 text-xs font-bold text-white/50 hover:text-white transition-colors"
            >
              <Pencil size={12} />
              EDIT
            </button>
          </div>

          {todos.length > 0 ? (
            <div className="space-y-4">
              {todos.slice(0, 5).map((todo, i) => (
                <div
                  key={`${todo.id}-${i}`}
                  className="flex items-center gap-3 group cursor-pointer"
                  onClick={() => handleToggleTodo(todo.id, todo.status)}
                >
                  <div className={`w-4 h-4 flex-shrink-0 rounded-full border-2 border-white/30 flex items-center justify-center transition-colors ${todo.status === 'COMPLETED' ? 'bg-green-500 border-green-500' : 'group-hover:border-white/60'}`}>
                    {todo.status === 'COMPLETED' && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                  </div>
                  <span className={`text-sm font-medium truncate transition-all ${todo.status === 'COMPLETED' ? 'text-white/30 line-through' : 'text-white/90 group-hover:text-white'}`}>
                    {todo.title}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed border-white/10 rounded-xl">
              <p className="text-xs text-white/50 font-medium mb-3">No pending tasks</p>
              <button
                onClick={() => router.push('/journal')}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-white transition-colors"
              >
                + CREATE
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}


