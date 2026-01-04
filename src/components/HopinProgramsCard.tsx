'use client';

import React, { useState, useEffect } from 'react';
import SwipeableStack from './SwipeableStack';
import { MapPin, Calendar, User, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface HopinPlan {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  maxSize: number;
  creatorId: string;
  members: Array<{
    user: {
      profile: {
        avatarUrl: string | null;
      };
    };
  }>;
  _count?: {
    members: number;
  };
}

export default function HopinProgramsCard() {
  const [plans, setPlans] = useState<HopinPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/hopin/plans?mode=public');
        if (!response.ok) {
          throw new Error('Failed to fetch plans');
        }
        const data = await response.json();
        setPlans(data || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching plans:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  if (loading) {
    return (
      <div className="w-full mb-8">
        <h3 className="font-bold text-2xl text-white mb-4 pb-3 border-b border-white/20">Community Plans</h3>
        <div className="text-white/50 text-sm text-center py-10">Loading plans...</div>
      </div>
    );
  }

  if (error || plans.length === 0) {
    return (
      <div className="w-full mb-8">
        <h3 className="font-bold text-2xl text-white mb-4 pb-3 border-b border-white/20">Community Plans</h3>
        <div className="text-white/50 text-sm text-center py-10">
          {error ? `Error: ${error}` : 'No upcoming plans nearby.'}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mb-8">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/20">
        <h3 className="font-bold text-2xl text-white">Community Plans</h3>
        <Link href="/hopin" className="text-sm text-neutral-400 hover:text-white flex items-center gap-1">
          View All <ArrowRight size={14} />
        </Link>
      </div>

      <SwipeableStack
        items={plans}
        containerHeight="320px"
        onCardClick={(plan) => {
          router.push('/hopin');
        }}
      >
        {(plan: HopinPlan) => (
          <div className="flex flex-col h-full bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden shadow-xl p-5" style={{ cursor: 'pointer' }}>
            <div className="flex gap-4 mb-4">
              <div className="w-14 h-14 shrink-0 rounded-xl bg-gradient-to-br from-red-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 text-3xl">
                🚀
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-lg text-white mb-1 truncate">{plan.title}</h4>
                <p className="text-sm text-white/70 line-clamp-2 leading-relaxed">{plan.description}</p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center text-sm text-white/80">
                <MapPin size={16} className="text-white/60 mr-2 shrink-0" />
                <span className="truncate">{plan.location}</span>
              </div>
              <div className="flex items-center text-sm text-white/80">
                <Calendar size={16} className="text-white/60 mr-2 shrink-0" />
                <span>
                  {new Date(plan.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-auto border-t border-white/10 pt-3">
              <div className="flex -space-x-3">
                {plan.members?.slice(0, 3).map((m: any, i: number) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-neutral-800 overflow-hidden">
                    {m.user.profile?.avatarUrl && <img src={m.user.profile.avatarUrl} className="w-full h-full object-cover" />}
                  </div>
                ))}
                {(plan._count?.members || 0) > 3 && (
                  <div className="w-8 h-8 rounded-full border-2 border-black bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-white">
                    +{(plan._count?.members || 0) - 3}
                  </div>
                )}
              </div>
              <button className="px-4 py-2 bg-white text-black text-sm font-bold rounded-xl hover:bg-neutral-200 transition-colors">
                View
              </button>
            </div>
          </div>
        )}
      </SwipeableStack>
    </div>
  );
}
