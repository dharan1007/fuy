'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';

interface SuggestedUser {
  id: string;
  name: string;
  profile?: {
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
  };
  followersCount: number;
  mutualCount?: number;
  hasSimilarInterests?: boolean;
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
  const [creators, setCreators] = useState<SuggestedUser[]>([]);
  const [suggestedPlans, setSuggestedPlans] = useState<SuggestedPlan[]>(initialPlans);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialUsers.length > 0) setSuggestedUsers(initialUsers);
    if (initialPlans.length > 0) setSuggestedPlans(initialPlans);
  }, [initialUsers, initialPlans]);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const [usersRes, creatorsRes, plansRes] = await Promise.all([
        fetch('/api/suggestions/users'),
        fetch('/api/suggestions/users?mode=creators'),
        fetch('/api/suggestions/plans')
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setSuggestedUsers(data.users || []);
      }

      if (creatorsRes.ok) {
        const data = await creatorsRes.json();
        setCreators(data.users || []);
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
      {/* Suggested Users - Scrollable */}
      {suggestedUsers.length > 0 && (
        <div className="rounded-2xl p-6 bg-transparent backdrop-blur-md border border-white/20 hover:border-white/40 transition-all">
          <h4 className="font-semibold text-white mb-5 flex items-center gap-2">
            <span className="text-sm font-bold text-white">USERS</span>
            <span className="text-xs text-white/50">Similar interests & mutuals</span>
          </h4>
          <div className="space-y-4 max-h-[280px] overflow-y-auto custom-scrollbar pr-2">
            {suggestedUsers.map((user) => (
              <Link
                key={user.id}
                href={`/profile/${user.id}`}
                className="flex items-center gap-4 hover:opacity-75 transition-opacity"
              >
                <img
                  src={user.profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                  alt={user.name}
                  className="w-12 h-12 rounded-full border border-white/60"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base text-white truncate">
                    {user.profile?.displayName || user.name}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <span>{user.followersCount} followers</span>
                    {user.mutualCount && user.mutualCount > 0 && (
                      <span className="flex items-center gap-1 text-xs bg-white/10 px-2 py-0.5 rounded-full">
                        <Users size={10} />
                        {user.mutualCount} mutual
                      </span>
                    )}
                  </div>
                  {user.hasSimilarInterests && (
                    <div className="text-xs text-green-400 mt-0.5">Similar interests</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Creators - Public Only, Scrollable */}
      <div className="rounded-2xl p-6 bg-transparent backdrop-blur-md border border-white/20 hover:border-white/40 transition-all">
        <h4 className="font-semibold text-white mb-5 flex items-center gap-2">
          <span className="text-sm font-bold text-white">CREATORS</span>
          <span className="text-xs text-white/50">Public accounts</span>
        </h4>
        <div className="space-y-4 max-h-[240px] overflow-y-auto custom-scrollbar pr-2">
          {creators.length > 0 ? (
            creators.slice(0, 10).map((user) => (
              <Link
                key={user.id}
                href={`/profile/${user.id}`}
                className="flex items-center gap-4 hover:opacity-75 transition-opacity"
              >
                <img
                  src={user.profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                  alt={user.name}
                  className="w-12 h-12 rounded-full border border-white/60"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base text-white truncate">
                    {user.profile?.displayName || user.name}
                  </div>
                  <div className="text-sm text-white/80 truncate">{user.profile?.bio || 'Creator'}</div>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-sm text-white/50 text-center py-4">No public creators yet</div>
          )}
        </div>
      </div>

      {/* Suggested Plans/Features */}
      {suggestedPlans.length > 0 && (
        <div className="rounded-2xl p-6 bg-transparent backdrop-blur-md border border-white/20 hover:border-white/40 transition-all">
          <h4 className="font-semibold text-white mb-5 flex items-center gap-2">
            <span className="text-sm font-bold text-white">PLANS</span>
          </h4>
          <div className="space-y-3">
            {suggestedPlans.slice(0, 3).map((plan) => (
              <div key={plan.id} className="text-base text-white/90 hover:text-white transition-colors">
                <div className="flex items-start gap-2">
                  <span className="text-white/70">-</span>
                  <div>
                    <div className="font-bold text-sm text-white">{plan.title}</div>
                    {plan.description && <div className="text-sm text-white/80">{plan.description}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Link href="/hopin" className="text-white/60 hover:text-white text-sm font-medium mt-4 block">
            Explore more plans
          </Link>
        </div>
      )}
    </div>
  );
}
