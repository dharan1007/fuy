'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface SuggestedUser {
  id: string;
  name: string;
  profile?: {
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
  };
  followersCount: number;
}

interface SuggestedProduct {
  id: string;
  name: string;
  image?: string;
  price: number;
}

interface SuggestedPlan {
  id: string;
  title: string;
  description?: string;
}

interface HomeSidebarSuggestionsProps {
  initialUsers?: SuggestedUser[];
  initialPlans?: SuggestedPlan[];
}

export default function HomeSidebarSuggestions({ initialUsers = [], initialPlans = [] }: HomeSidebarSuggestionsProps) {
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>(initialUsers);
  const [suggestedPlans, setSuggestedPlans] = useState<SuggestedPlan[]>(initialPlans);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialUsers.length > 0) setSuggestedUsers(initialUsers);
    if (initialPlans.length > 0) setSuggestedPlans(initialPlans);
  }, [initialUsers, initialPlans]);

  useEffect(() => {
    if (suggestedUsers.length === 0 && suggestedPlans.length === 0) {
      fetchSuggestions();
    }
  }, []);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const [usersRes, plansRes] = await Promise.all([
        fetch('/api/suggestions/users'),
        fetch('/api/suggestions/plans')
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setSuggestedUsers(data.users || []);
      }

      if (plansRes.ok) {
        const data = await plansRes.json();
        setSuggestedPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Suggested Users - Liquid Glass */}
      {suggestedUsers.length > 0 && (
        <div className="rounded-2xl p-4 bg-transparent backdrop-blur-md border border-white/20 hover:border-white/40 transition-all">
          <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-xs font-bold text-white">USERS</span>
          </h4>
          <div className="space-y-3">
            {suggestedUsers.map((user) => (
              <Link
                key={user.id}
                href={`/profile/${user.id}`}
                className="flex items-center gap-3 hover:opacity-75 transition-opacity"
              >
                <img
                  src={user.profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                  alt={user.name}
                  className="w-10 h-10 rounded-full border border-white/60"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-white truncate">
                    {user.profile?.displayName || user.name}
                  </div>
                  <div className="text-xs text-white/80">{user.followersCount} followers</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Creators - Liquid Glass */}
      <div className="rounded-2xl p-4 bg-transparent backdrop-blur-md border border-white/20 hover:border-white/40 transition-all">
        <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
          <span className="text-xs font-bold text-white">CREATORS</span>
        </h4>
        <div className="space-y-3">
          {suggestedUsers.slice(0, 3).map((user) => (
            <Link
              key={user.id}
              href={`/profile/${user.id}`}
              className="flex items-center gap-3 hover:opacity-75 transition-opacity"
            >
              <img
                src={user.profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                alt={user.name}
                className="w-10 h-10 rounded-full border border-white/60"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-white truncate">
                  {user.profile?.displayName || user.name}
                </div>
                <div className="text-xs text-white/80 truncate">{user.profile?.bio || 'Creator'}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>



      {/* Suggested Plans/Features - Liquid Glass */}
      {suggestedPlans.length > 0 && (
        <div className="rounded-2xl p-4 bg-transparent backdrop-blur-md border border-white/20 hover:border-white/40 transition-all">
          <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-xs font-bold text-white">PLANS</span>
          </h4>
          <div className="space-y-2">
            {suggestedPlans.slice(0, 3).map((plan) => (
              <div key={plan.id} className="text-sm text-white/80 hover:text-white transition-colors">
                <div className="flex items-start gap-2">
                  <span className="text-white/70">•</span>
                  <div>
                    <div className="font-medium text-xs text-white">{plan.title}</div>
                    {plan.description && <div className="text-xs text-white/80">{plan.description}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Link href="/hopin" className="text-blue-300 hover:text-blue-200 text-xs font-medium mt-3 block">
            Explore more plans →
          </Link>
        </div>
      )}
    </div>
  );
}
