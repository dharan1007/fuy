'use client';

import React, { useState, useEffect } from 'react';
import SwipeableStack from './SwipeableStack';
import styles from './HopinProgramsCard.module.css';

interface HopinProgram {
  id: string;
  title: string;
  description: string;
  category: string;
  participants: number;
  friendsInterested: string[];
  image: string;
  startTime: string;
  duration: number;
}

export default function HopinProgramsCard() {
  const [programs, setPrograms] = useState<HopinProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/hopin/programs');
        if (!response.ok) {
          throw new Error('Failed to fetch programs');
        }
        const data = await response.json();
        setPrograms(data.programs || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching programs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrograms();
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>Hopin Programs</h3>
        <div className={styles.loadingState}>Loading programs...</div>
      </div>
    );
  }

  if (error || programs.length === 0) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>Hopin Programs</h3>
        <div className={styles.emptyState}>
          {error ? `Error: ${error}` : 'No programs available'}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Hopin Programs</h3>
      <SwipeableStack
        items={programs}
        containerHeight="280px"
        onCardClick={(program) => {
          // Handle program click - can navigate to program detail page
          console.log('Program clicked:', program);
        }}
      >
        {(program: HopinProgram) => (
          <div className={styles.programCard}>
            <div className={styles.programHeader}>
              <span className={styles.programImage}>{program.image}</span>
              <div className={styles.programMeta}>
                <h4 className={styles.programTitle}>{program.title}</h4>
                <p className={styles.programDescription}>{program.description}</p>
              </div>
            </div>

            <div className={styles.programDetails}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Participants</span>
                <span className={styles.detailValue}>{program.participants}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Duration</span>
                <span className={styles.detailValue}>{program.duration}m</span>
              </div>
            </div>

            {program.friendsInterested.length > 0 && (
              <div className={styles.friendsInterested}>
                <span className={styles.friendsLabel}>Friends interested:</span>
                <div className={styles.friendsTags}>
                  {program.friendsInterested.map((friend) => (
                    <span key={friend} className={styles.friendTag}>
                      {friend}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button className={styles.joinButton}>Join Program</button>
          </div>
        )}
      </SwipeableStack>
    </div>
  );
}
