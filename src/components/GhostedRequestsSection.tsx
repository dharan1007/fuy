'use client';

import React, { useState, useEffect } from 'react';
import styles from './GhostedRequestsSection.module.css';

interface GhostedRequest {
  id: string;
  friend: {
    id: string;
    name: string;
    email: string;
    profile: {
      avatarUrl: string;
      bio: string;
    } | null;
  };
  updatedAt: string;
}

export default function GhostedRequestsSection() {
  const [ghostedRequests, setGhostedRequests] = useState<GhostedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchGhostedRequests();
  }, []);

  const fetchGhostedRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/friends/ghosted');
      if (!response.ok) throw new Error('Failed to fetch ghosted requests');
      const data = await response.json();
      setGhostedRequests(data.ghostedRequests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Fetch ghosted requests error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromGhosted = async (friendshipId: string) => {
    try {
      const response = await fetch('/api/friends/ghosted', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId }),
      });

      if (response.ok) {
        setGhostedRequests(prev => prev.filter(r => r.id !== friendshipId));
      } else {
        console.error('Failed to remove from ghosted');
      }
    } catch (err) {
      console.error('Error removing from ghosted:', err);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.icon}>👻</span>
          <h3 className={styles.title}>Ghosted Requests ({ghostedRequests.length})</h3>
        </div>
        <button
          className={styles.toggleBtn}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? '▼' : '▶'}
        </button>
      </div>

      {expanded && (
        <div className={styles.content}>
          {error && <p className={styles.error}>{error}</p>}
          {ghostedRequests.length === 0 ? (
            <p className={styles.emptyMessage}>No ghosted requests</p>
          ) : (
            <div className={styles.requestsList}>
              {ghostedRequests.map((request) => (
                <div key={request.id} className={styles.requestItem}>
                  <img
                    src={request.friend.profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.friend.id}`}
                    alt={request.friend.name}
                    className={styles.avatar}
                  />
                  <div className={styles.info}>
                    <p className={styles.name}>{request.friend.name}</p>
                    <p className={styles.email}>{request.friend.email}</p>
                    <p className={styles.date}>
                      Ghosted on {new Date(request.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    className={styles.removeBtn}
                    onClick={() => handleRemoveFromGhosted(request.id)}
                    title="Remove from ghosted"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
