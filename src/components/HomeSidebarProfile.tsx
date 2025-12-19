

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
  onFetchFollowing
}: HomeSidebarProfileProps) {
  const router = useRouter();
  const [userRanks, setUserRanks] = useState<Rank[]>([]);
  const [hopinPlans, setHopinPlans] = useState<HopinPlan[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month'>('week');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUserRanks();
    fetchHopinPlans();
    fetchTodos();
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
      // Placeholder for actual todos endpoint
      setTodos([]);
    } catch (error) {
      console.error('Error fetching todos:', error);
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
              className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-blue-400"
            />
            <h3 className="font-semibold text-lg text-white">{displayName}</h3>
            <p className="text-sm text-white/80 mt-1">{userProfile.profile?.bio || 'No bio yet'}</p>
            {userProfile.profile?.location && (
              <p className="text-xs text-white/70 mt-2">{userProfile.profile.location}</p>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/20">
            <div className="text-center">
              <div className="font-bold text-lg text-white">{userProfile.stats.posts}</div>
              <div className="text-xs text-white/70 font-medium">Posts</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-white">{userProfile.stats.friends}</div>
              <div className="text-xs text-white/70 font-medium">Friends</div>
            </div>
            <button
              onClick={onFetchFollowers}
              className="text-center hover:opacity-75 transition-opacity cursor-pointer"
            >
              <div className="font-bold text-lg text-white">{userProfile.stats.followers}</div>
              <div className="text-xs text-white/70 font-medium">Followers</div>
            </button>
            <button
              onClick={onFetchFollowing}
              className="text-center hover:opacity-75 transition-opacity cursor-pointer"
            >
              <div className="font-bold text-lg text-white">{userProfile.stats.following}</div>
              <div className="text-xs text-white/70 font-medium">Following</div>
            </button>
          </div>

          <Link
            href="/profile"
            className="mt-4 w-full block text-center py-2.5 bg-transparent border border-white/20 text-white rounded-lg font-medium text-sm hover:bg-white/10 transition-colors"
          >
            View Profile
          </Link>
        </div>



        {/* Hopin Plans Card - Liquid Glass */}
        {hopinPlans.length > 0 && (
          <div className="rounded-2xl p-4 bg-transparent backdrop-blur-md border border-white/20 hover:border-white/40 transition-all">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold text-white">PLANS</span>
              <h4 className="font-semibold text-white text-sm">Active Plans</h4>
              <Link href="/hopin" className="ml-auto text-blue-300 hover:text-blue-200 text-xs font-medium">
                All
              </Link>
            </div>
            <div className="space-y-2">
              {hopinPlans.slice(0, 3).map((plan, i) => (
                <div key={`${plan.id}-${i}`} className="text-xs text-white/80 truncate hover:text-white">
                  • {plan.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TODO List Card - Liquid Glass */}
        <div className="rounded-2xl p-4 bg-transparent backdrop-blur-md border border-white/20 hover:border-white/40 transition-all">
          <div className="flex items-center gap-2 mb-4 justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">TODO</span>
              <h4 className="font-semibold text-white text-sm">Tasks</h4>
            </div>
            <div className="flex gap-1 flex-wrap justify-end max-w-[50%]">
              <button
                onClick={() => setTimePeriod('day')}
                className={`px-1.5 py-0.5 text-[10px] rounded border ${timePeriod === 'day' ? 'bg-white/10 border-white text-white' : 'bg-transparent border-white/20 text-white/70 hover:bg-white/5'}`}
              >
                Day
              </button>
              <button
                onClick={() => setTimePeriod('week')}
                className={`px-1.5 py-0.5 text-[10px] rounded border ${timePeriod === 'week' ? 'bg-white/10 border-white text-white' : 'bg-transparent border-white/20 text-white/70 hover:bg-white/5'}`}
              >
                Week
              </button>
              <button
                onClick={() => setTimePeriod('month')}
                className={`px-1.5 py-0.5 text-[10px] rounded border ${timePeriod === 'month' ? 'bg-white/10 border-white text-white' : 'bg-transparent border-white/20 text-white/70 hover:bg-white/5'}`}
              >
                Month
              </button>
            </div>
          </div>
          {todos.length > 0 ? (
            <div className="space-y-2">
              {todos.slice(0, 4).map((todo, i) => (
                <div key={`${todo.id}-${i}`} className="text-xs text-white/80 truncate hover:text-white flex items-center gap-2">
                  <span className="text-white/60">•</span>
                  <span>{todo.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3">
              <p className="text-xs text-white/70 mb-3">No tasks yet</p>
              <button
                onClick={() => router.push('/journal')}
                className="w-full px-3 py-2 bg-transparent border border-white/20 text-white rounded text-xs font-medium hover:bg-white/10 transition-colors"
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
