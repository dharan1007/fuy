'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SwipeableStack from './SwipeableStack';
import styles from './RankingCard.module.css';

interface UserActivity {
  messaging: number;
  journalling: number;
  hopin: number;
  shopping: number;
  posting: number;
  browsing: number;
  bonding: number;
  breathing: number;
}

interface UserRanking {
  userId: string;
  userName: string;
  overallRank: number;
  overallScore: number;
  categoryRanks: {
    [category: string]: number;
  };
  categoryScores: {
    [category: string]: number;
  };
  friendRank: number;
  globalRank: number;
  lastUpdated: string;
  activities: UserActivity;
  daysStreak: number;
}

type RankingType = 'global' | 'friends' | 'category';

const CATEGORIES = [
  'messaging',
  'journalling',
  'hopin',
  'shopping',
  'posting',
  'bonding',
];

export default function RankingCard() {
  const router = useRouter();
  const [rankings, setRankings] = useState<UserRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankingType, setRankingType] = useState<RankingType>('global');
  const [selectedCategory, setSelectedCategory] = useState('messaging');

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append('type', rankingType);
        if (rankingType === 'category') {
          params.append('category', selectedCategory);
        }

        const response = await fetch(`/api/rankings/user?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch rankings');
        }
        const data = await response.json();
        setRankings(data.rankings || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching rankings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [rankingType, selectedCategory]);

  const handleRankingClick = (ranking: UserRanking) => {
    const params = new URLSearchParams();
    params.append('type', rankingType);
    if (rankingType === 'category') {
      params.append('category', selectedCategory);
    }
    params.append('userId', ranking.userId);
    router.push(`/rankings?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>Rankings</h3>
        <div className={styles.loadingState}>Loading rankings...</div>
      </div>
    );
  }

  if (error || rankings.length === 0) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>Rankings</h3>
        <div className={styles.emptyState}>
          {error ? `Error: ${error}` : 'No rankings available'}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Rankings</h3>
        <div className={styles.filterButtons}>
          <button
            className={`${styles.filterBtn} ${rankingType === 'global' ? styles.active : ''}`}
            onClick={() => setRankingType('global')}
          >
            Global
          </button>
          <button
            className={`${styles.filterBtn} ${rankingType === 'friends' ? styles.active : ''}`}
            onClick={() => setRankingType('friends')}
          >
            Friends
          </button>
          <button
            className={`${styles.filterBtn} ${rankingType === 'category' ? styles.active : ''}`}
            onClick={() => setRankingType('category')}
          >
            Category
          </button>
        </div>
      </div>

      {rankingType === 'category' && (
        <div className={styles.categorySelector}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={styles.categorySelect}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
      )}

      <SwipeableStack
        items={rankings}
        containerHeight="320px"
        onCardClick={handleRankingClick}
      >
        {(ranking: UserRanking) => (
          <div className={styles.rankingCard} onClick={() => handleRankingClick(ranking)}>
            <div className={styles.rankingHeader}>
              <div className={styles.rankBadge}>
                #{ranking.overallRank}
              </div>
              <div className={styles.userInfo}>
                <h4 className={styles.userName}>{ranking.userName}</h4>
                <p className={styles.streak}>🔥 {ranking.daysStreak} day streak</p>
              </div>
            </div>

            <div className={styles.scoreSection}>
              <div className={styles.scoreItem}>
                <span className={styles.scoreLabel}>Score</span>
                <span className={styles.scoreValue}>{ranking.overallScore}</span>
              </div>
              <div className={styles.scoreProgressBar}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${Math.min((ranking.overallScore / 1000) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className={styles.activities}>
              <div className={styles.activityItem}>
                <span className={styles.activityIcon}>💬</span>
                <span className={styles.activityValue}>
                  {ranking.activities.messaging}
                </span>
              </div>
              <div className={styles.activityItem}>
                <span className={styles.activityIcon}>📝</span>
                <span className={styles.activityValue}>
                  {ranking.activities.journalling}
                </span>
              </div>
              <div className={styles.activityItem}>
                <span className={styles.activityIcon}>🎯</span>
                <span className={styles.activityValue}>
                  {ranking.activities.hopin}
                </span>
              </div>
              <div className={styles.activityItem}>
                <span className={styles.activityIcon}>🛍️</span>
                <span className={styles.activityValue}>
                  {ranking.activities.shopping}
                </span>
              </div>
            </div>

            <button className={styles.viewButton}>
              View Details →
            </button>
          </div>
        )}
      </SwipeableStack>
    </div>
  );
}
