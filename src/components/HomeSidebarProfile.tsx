'use client';

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

export default function HomeSidebarProfile({
  userProfile,
  avatarUrl,
  displayName,
  onFetchFollowers,
  onFetchFollowing
}: {
  userProfile: UserProfile | null;
  avatarUrl: string;
  displayName: string;
  onFetchFollowers: () => void;
  onFetchFollowing: () => void;
}) {
  const router = useRouter();
  const [userRanks, setUserRanks] = useState<Rank[]>([]);
  const [hopinPlans, setHopinPlans] = useState<HopinPlan[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUserRanks();
    fetchHopinPlans();
  }, []);

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

  if (!userProfile) return null;

  return (
    <aside className="md:col-span-1">
      <div className="sticky top-20 space-y-6">
        {/* Main Profile Card - Liquid Glass */}
        <div className="rounded-2xl p-6 bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-xl border border-white/50 shadow-lg hover:shadow-xl transition-all">
          <div className="text-center mb-6">
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-blue-400"
            />
            <h3 className="font-semibold text-lg text-gray-900">{displayName}</h3>
            <p className="text-sm text-gray-600 mt-1">{userProfile.profile?.bio || 'No bio yet'}</p>
            {userProfile.profile?.location && (
              <p className="text-xs text-gray-500 mt-2">{userProfile.profile.location}</p>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/40">
            <div className="text-center">
              <div className="font-bold text-lg text-gray-900">{userProfile.stats.posts}</div>
              <div className="text-xs text-gray-600 font-medium">Posts</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-gray-900">{userProfile.stats.friends}</div>
              <div className="text-xs text-gray-600 font-medium">Friends</div>
            </div>
            <button
              onClick={onFetchFollowers}
              className="text-center hover:opacity-75 transition-opacity cursor-pointer"
            >
              <div className="font-bold text-lg text-gray-900">{userProfile.stats.followers}</div>
              <div className="text-xs text-gray-600 font-medium">Followers</div>
            </button>
            <button
              onClick={onFetchFollowing}
              className="text-center hover:opacity-75 transition-opacity cursor-pointer"
            >
              <div className="font-bold text-lg text-gray-900">{userProfile.stats.following}</div>
              <div className="text-xs text-gray-600 font-medium">Following</div>
            </button>
          </div>

          <Link href="/profile" className="mt-4 w-full block text-center py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors">
            View Profile
          </Link>
        </div>

        {/* Rankings Card - Liquid Glass */}
        {userRanks.length > 0 && (
          <div className="rounded-2xl p-4 bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-xl border border-white/50 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🏆</span>
              <h4 className="font-semibold text-gray-900">Your Rankings</h4>
              <Link href="/rankings" className="ml-auto text-blue-600 hover:text-blue-700 text-xs font-medium">
                View All
              </Link>
            </div>
            <div className="space-y-2">
              {userRanks.slice(0, 3).map((rank) => (
                <div key={rank.categoryId} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">Rank {rank.rank}</span>
                  <span className="font-semibold text-blue-600">#{rank.rank}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hopin Plans Card - Liquid Glass */}
        {hopinPlans.length > 0 && (
          <div className="rounded-2xl p-4 bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-xl border border-white/50 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">📋</span>
              <h4 className="font-semibold text-gray-900">Active Plans</h4>
              <Link href="/hopin" className="ml-auto text-blue-600 hover:text-blue-700 text-xs font-medium">
                View All
              </Link>
            </div>
            <div className="space-y-2">
              {hopinPlans.slice(0, 3).map((plan) => (
                <div key={plan.id} className="text-xs text-gray-700 truncate hover:text-gray-900">
                  ✓ {plan.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Canvas/Journal Card - Liquid Glass */}
        <div className="rounded-2xl p-4 bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-xl border border-white/50 shadow-lg">
          <Link href="/journal" className="flex items-center gap-3 hover:opacity-75 transition-opacity">
            <span className="text-2xl">▭</span>
            <div>
              <div className="font-semibold text-gray-900 text-sm">Canvas</div>
              <div className="text-xs text-gray-600">View your journal</div>
            </div>
          </Link>
        </div>
      </div>
    </aside>
  );
}
