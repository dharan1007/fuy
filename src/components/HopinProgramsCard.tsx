'use client';

import React, { useState, useEffect } from 'react';
import SwipeableStack from './SwipeableStack';
import styles from './HopinProgramsCard.module.css';
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
      <div className={styles.container}>
        <h3 className={styles.title}>Community Plans</h3>
        <div className={styles.loadingState}>Loading plans...</div>
      </div>
    );
  }

  if (error || plans.length === 0) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>Community Plans</h3>
        <div className={styles.emptyState}>
          {error ? `Error: ${error}` : 'No upcoming plans nearby.'}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/20">
        <h3 className="font-bold text-lg text-white">Community Plans</h3>
        <Link href="/hopin" className="text-xs text-neutral-400 hover:text-white flex items-center gap-1">
          View All <ArrowRight size={12} />
        </Link>
      </div>

      <SwipeableStack
        items={plans}
        containerHeight="280px"
        onCardClick={(plan) => {
          router.push('/hopin');
        }}
      >
        {(plan: HopinPlan) => (
          <div className={styles.programCard} style={{ cursor: 'pointer' }}>
            <div className={styles.programHeader}>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 text-2xl">
                🚀
              </div>
              <div className={styles.programMeta}>
                <h4 className={styles.programTitle}>{plan.title}</h4>
                <p className={styles.programDescription}>{plan.description}</p>
              </div>
            </div>

            <div className={styles.programDetails}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}><MapPin size={10} className="inline mr-1" />Location</span>
                <span className={styles.detailValue} style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{plan.location}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}><Calendar size={10} className="inline mr-1" />When</span>
                <span className={styles.detailValue} style={{ fontSize: '0.8rem' }}>
                  {new Date(plan.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-auto pt-2">
              <div className="flex -space-x-2">
                {plan.members?.slice(0, 3).map((m: any, i: number) => (
                  <div key={i} className="w-6 h-6 rounded-full border border-black bg-neutral-800 overflow-hidden">
                    {m.user.profile?.avatarUrl && <img src={m.user.profile.avatarUrl} className="w-full h-full object-cover" />}
                  </div>
                ))}
                {(plan._count?.members || 0) > 3 && (
                  <div className="w-6 h-6 rounded-full border border-black bg-neutral-800 flex items-center justify-center text-[8px] text-white">
                    +{(plan._count?.members || 0) - 3}
                  </div>
                )}
              </div>
              <button className={styles.joinButton}>View</button>
            </div>
          </div>
        )}
      </SwipeableStack>
    </div>
  );
}
