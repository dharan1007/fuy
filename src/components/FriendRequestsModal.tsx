'use client';

import React, { useState, useEffect } from 'react';
import { useFriendships } from '@/hooks/useFriendships';
import styles from './FriendRequestsModal.module.css';

interface FriendRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'received' | 'sent';

export default function FriendRequestsModal({ isOpen, onClose }: FriendRequestsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('received');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const {
    sentRequests,
    receivedRequests,
    loading,
    error,
    acceptFriendRequest,
    rejectFriendRequest,
    ghostFriendRequest,
    unGhostRequest,
  } = useFriendships();

  const handleAccept = async (friendshipId: string) => {
    setActionLoading(prev => ({ ...prev, [friendshipId]: true }));
    try {
      const result = await acceptFriendRequest(friendshipId);
      if (!result.success) {
        console.error('Accept failed:', result.error);
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [friendshipId]: false }));
    }
  };

  const handleReject = async (friendshipId: string) => {
    setActionLoading(prev => ({ ...prev, [friendshipId]: true }));
    try {
      const result = await rejectFriendRequest(friendshipId);
      if (!result.success) {
        console.error('Reject failed:', result.error);
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [friendshipId]: false }));
    }
  };

  const handleGhost = async (friendshipId: string) => {
    setActionLoading(prev => ({ ...prev, [friendshipId]: true }));
    try {
      const result = await ghostFriendRequest(friendshipId);
      if (!result.success) {
        console.error('Ghost failed:', result.error);
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [friendshipId]: false }));
    }
  };

  const handleUnGhost = async (friendshipId: string) => {
    setActionLoading(prev => ({ ...prev, [friendshipId]: true }));
    try {
      const result = await unGhostRequest(friendshipId);
      if (!result.success) {
        console.error('Un-ghost failed:', result.error);
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [friendshipId]: false }));
    }
  };

  const displayRequests = activeTab === 'received' ? receivedRequests : sentRequests;

  if (!isOpen) return null;

  const renderRequestCard = (request: any) => {
    const userToDisplay = activeTab === 'received' ? request.user : request.friend;
    const isGhosted = request.isGhosted;

    return (
      <div key={request.id} className={styles.requestCard}>
        <img
          src={userToDisplay?.profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userToDisplay?.id}`}
          alt={userToDisplay?.name}
          className={styles.avatar}
        />
        <div className={styles.userInfo}>
          <h4 className={styles.userName}>{userToDisplay?.name}</h4>
          <p className={styles.userEmail}>{userToDisplay?.email}</p>
          <p className={styles.userBio}>{userToDisplay?.profile?.bio || 'No bio'}</p>
          {isGhosted && <p className={styles.ghostedStatus}>👻 Ghosted</p>}
        </div>
        <div className={styles.actions}>
          {activeTab === 'received' ? (
            <>
              {!isGhosted && (
                <>
                  <button
                    className={styles.acceptBtn}
                    onClick={() => handleAccept(request.id)}
                    disabled={actionLoading[request.id]}
                  >
                    {actionLoading[request.id] ? '...' : 'Accept'}
                  </button>
                  <button
                    className={styles.rejectBtn}
                    onClick={() => handleReject(request.id)}
                    disabled={actionLoading[request.id]}
                  >
                    {actionLoading[request.id] ? '...' : 'Reject'}
                  </button>
                </>
              )}
              <button
                className={styles.ghostBtn}
                onClick={() => handleGhost(request.id)}
                disabled={actionLoading[request.id]}
                title={isGhosted ? 'Already ghosted' : 'Ghost this request'}
              >
                {isGhosted ? '👻' : '🔇'}
              </button>
            </>
          ) : (
            <>
              {isGhosted ? (
                <button
                  className={styles.unghostBtn}
                  onClick={() => handleUnGhost(request.id)}
                  disabled={actionLoading[request.id]}
                >
                  {actionLoading[request.id] ? '...' : 'Un-ghost'}
                </button>
              ) : (
                <span className={styles.pendingBadge}>Pending</span>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Friend Requests</h2>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tabButton} ${activeTab === 'received' ? styles.active : ''}`}
            onClick={() => setActiveTab('received')}
          >
            Received ({receivedRequests.length})
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'sent' ? styles.active : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            Sent ({sentRequests.length})
          </button>
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
          ) : displayRequests.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No {activeTab} friend requests</p>
            </div>
          ) : (
            <div className={styles.requestsList}>
              {displayRequests.map(renderRequestCard)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
