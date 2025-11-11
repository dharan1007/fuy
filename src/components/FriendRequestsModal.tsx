'use client';

import React, { useState, useEffect } from 'react';
import styles from './FriendRequestsModal.module.css';

interface FriendRequest {
  id: string;
  userId: string;
  friendId: string;
  status: string;
  isGhosted: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    profile: {
      avatarUrl: string;
      bio: string;
    } | null;
  };
}

interface FriendRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FriendRequestsModal({ isOpen, onClose }: FriendRequestsModalProps) {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/friends/request');
      if (!response.ok) throw new Error('Failed to fetch requests');
      const data = await response.json();
      setRequests(data.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Fetch requests error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (friendshipId: string, action: 'ACCEPT' | 'REJECT' | 'GHOST') => {
    setActionLoading(prev => ({ ...prev, [friendshipId]: true }));
    try {
      const response = await fetch('/api/friends/request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action }),
      });

      if (response.ok) {
        setRequests(prev => prev.filter(r => r.id !== friendshipId));
      } else {
        const data = await response.json();
        setError(data.error || 'Action failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Action error:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [friendshipId]: false }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Friend Requests</h2>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>Loading requests...</p>
            </div>
          ) : error ? (
            <div className={styles.errorState}>
              <p>Error: {error}</p>
            </div>
          ) : requests.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No friend requests</p>
            </div>
          ) : (
            <div className={styles.requestsList}>
              {requests.map((request) => (
                <div key={request.id} className={styles.requestCard}>
                  <img
                    src={request.user.profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.user.id}`}
                    alt={request.user.name}
                    className={styles.avatar}
                  />
                  <div className={styles.userInfo}>
                    <h4 className={styles.userName}>{request.user.name}</h4>
                    <p className={styles.userEmail}>{request.user.email}</p>
                    <p className={styles.userBio}>{request.user.profile?.bio || 'No bio'}</p>
                  </div>
                  <div className={styles.actions}>
                    <button
                      className={styles.acceptBtn}
                      onClick={() => handleAction(request.id, 'ACCEPT')}
                      disabled={actionLoading[request.id]}
                    >
                      {actionLoading[request.id] ? '...' : 'Accept'}
                    </button>
                    <button
                      className={styles.rejectBtn}
                      onClick={() => handleAction(request.id, 'REJECT')}
                      disabled={actionLoading[request.id]}
                    >
                      {actionLoading[request.id] ? '...' : 'Reject'}
                    </button>
                    <button
                      className={styles.ghostBtn}
                      onClick={() => handleAction(request.id, 'GHOST')}
                      disabled={actionLoading[request.id]}
                      title="Ghost this request"
                    >
                      👻
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
