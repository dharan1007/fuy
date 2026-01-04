

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';

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
  userId?: string; // Added userId prop
  onFetchFollowers: () => void;
  onFetchFollowing: () => void;
  initialRanks?: Rank[];
  initialPlans?: HopinPlan[];
  initialTodos?: TodoItem[];
}

/* eslint-disable @next/next/no-img-element */
// Note: onFetchFollowers and onFetchFollowing are safe because both this component
// and its parent (HomeClient) are client components. Next.js warning 71007 is a false positive.
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialRanks.length > 0) setUserRanks(initialRanks);
    if (initialPlans.length > 0) setHopinPlans(initialPlans);
    if (initialTodos.length > 0) setTodos(initialTodos);
  }, [initialRanks, initialPlans, initialTodos]);

  useEffect(() => {
    // Only fetch if we don't have initial data or if timePeriod changes
    if (userRanks.length === 0) fetchUserRanks();
    if (hopinPlans.length === 0) fetchHopinPlans();
    if (todos.length === 0) fetchTodos();
  }, [timePeriod]);


  const fetchUserRanks = async () => {
    try {
      const res = await fetch('/api/rankings/user');
      if (res.ok) {
        const data = await res.json();
        setUserRanks(data.ranks || []);
      }
    } catch (error) {
      console.error('Error fetching ranks:', error);
    }
  };

  const fetchHopinPlans = async () => {
    try {
      const res = await fetch('/api/hopin/my-plans');
      if (res.ok) {
        const data = await res.json();
        setHopinPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Error fetching hopin plans:', error);
    }
  };

  const fetchTodos = async () => {
    try {
      const res = await fetch('/api/todos');
      if (res.ok) {
        const data = await res.json();
        setTodos(data.todos || []);
      }
    } catch (error) {
      console.error('Error fetching todos:', error);
    }
  };

  const handleToggleTodo = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
      // Optimistic update
      setTodos(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));

      await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
    } catch (error) {
      console.error('Error toggling todo:', error);
      // Revert on error
      fetchTodos();
    }
  };

  if (!userProfile) return null;

  return (
    <aside className="md:col-span-1">
      <div className="sticky top-20 space-y-6">
        {/* Main Profile Card - Liquid Glass */}
        <div className="rounded-2xl p-6 bg-transparent backdrop-blur-md border border-white/20 hover:border-white/40 transition-all">
          <div className="text-center mb-6">
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-20 h-20 rounded-full mx-auto mb-4"
            />
            <h3 className="font-bold text-2xl text-white">{displayName}</h3>
            <p className="text-base text-white/80 mt-2">{userProfile.profile?.bio || 'No bio yet'}</p>
            {userProfile.profile?.location && (
              <p className="text-sm text-white/70 mt-2">{userProfile.profile.location}</p>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/20">
            <div className="text-center">
              <div className="font-bold text-xl text-white">{userProfile.stats.posts}</div>
              <div className="text-sm text-white/70 font-medium pt-1">Posts</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-xl text-white">{userProfile.stats.friends}</div>
              <div className="text-sm text-white/70 font-medium pt-1">Friends</div>
            </div>
            <button
              onClick={onFetchFollowers}
              className="text-center hover:opacity-75 transition-opacity cursor-pointer"
            >
              <div className="font-bold text-xl text-white">{userProfile.stats.followers}</div>
              <div className="text-sm text-white/70 font-medium pt-1">Followers</div>
            </button>
            <button
              onClick={onFetchFollowing}
              className="text-center hover:opacity-75 transition-opacity cursor-pointer"
            >
              <div className="font-bold text-xl text-white">{userProfile.stats.following}</div>
              <div className="text-sm text-white/70 font-medium pt-1">Following</div>
            </button>
          </div>

          <Link
            href="/profile"
            className="mt-6 w-full block text-center py-3 bg-transparent border border-white/20 text-white rounded-lg font-bold text-base hover:bg-white/10 transition-colors"
          >
            View Profile
          </Link>
        </div>



        {/* Hopin Plans Card - Liquid Glass */}
        {hopinPlans.length > 0 && (
          <div className="rounded-2xl p-6 bg-transparent backdrop-blur-md border border-white/20 hover:border-white/40 transition-all">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-bold text-white">PLANS</span>
              <h4 className="font-bold text-white text-lg">Active Plans</h4>
              <Link href="/hopin" className="ml-auto text-blue-300 hover:text-blue-200 text-sm font-medium">
                All
              </Link>
            </div>
            <div className="space-y-3">
              {hopinPlans.slice(0, 3).map((plan, i) => (
                <div key={`${plan.id}-${i}`} className="text-base text-white/80 truncate hover:text-white font-medium">
                  • {plan.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TODO List Card - Liquid Glass */}
        <div className="rounded-2xl p-6 bg-transparent backdrop-blur-md border border-white/20 hover:border-white/40 transition-all">
          <div className="flex items-center gap-2 mb-5 justify-between">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-white text-xl">Tasks</h4>
            </div>
            <button
              onClick={() => router.push('/journal')}
              className="text-xs font-bold text-white/50 hover:text-white transition-colors flex items-center gap-1 group"
            >
              <Pencil size={14} className="group-hover:scale-110 transition-transform" />
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
                  <div className={`w-5 h-5 flex-shrink-0 rounded-full border-2 border-white/60 flex items-center justify-center ${todo.status === 'COMPLETED' ? 'bg-green-500 border-green-500' : ''}`}>
                    {todo.status === 'COMPLETED' && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                  </div>
                  <span className={`text-lg font-medium truncate transition-all ${todo.status === 'COMPLETED' ? 'text-white/40 line-through' : 'text-white/90 group-hover:text-white'}`}>
                    {todo.title}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-base text-white/70 mb-4">No tasks yet</p>
              <button
                onClick={() => router.push('/journal')}
                className="w-full px-4 py-3 bg-transparent border border-white/20 text-white rounded-lg text-sm font-bold hover:bg-white/10 transition-colors"
              >
                Create New
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
