'use client';

import { useState, useCallback } from 'react';

export interface CollaborationInvite {
  id: string;
  sessionId: string;
  fromUserId: string;
  toUserId: string;
  featureType: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  conversationId: string;
  createdAt: string;
  respondedAt?: string;
}

/**
 * Hook for sending and responding to canvas collaboration invites
 * Used primarily in the messaging interface
 */
export function useCanvasCollaboration() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Send a canvas collaboration invite through messaging
   */
  const sendCollaborationInvite = useCallback(
    async (
      conversationId: string,
      recipientId: string,
      featureType = 'CANVAS'
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/collaboration/canvas-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            recipientId,
            featureType,
            title: `${featureType} Session`,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to send collaboration invite');
        }

        const data = await res.json();
        setIsLoading(false);
        return { success: true, session: data.session, invite: data.invite };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(message);
        setIsLoading(false);
        return { success: false, error: message };
      }
    },
    []
  );

  /**
   * Accept a collaboration invite
   */
  const acceptInvite = useCallback(async (inviteId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/collaboration/canvas-invite', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteId,
          action: 'ACCEPT',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to accept invite');
      }

      const data = await res.json();
      setIsLoading(false);
      return { success: true, invite: data.invite };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
      setIsLoading(false);
      return { success: false, error: message };
    }
  }, []);

  /**
   * Reject a collaboration invite
   */
  const rejectInvite = useCallback(async (inviteId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/collaboration/canvas-invite', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteId,
          action: 'REJECT',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to reject invite');
      }

      const data = await res.json();
      setIsLoading(false);
      return { success: true, invite: data.invite };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
      setIsLoading(false);
      return { success: false, error: message };
    }
  }, []);

  return {
    sendCollaborationInvite,
    acceptInvite,
    rejectInvite,
    isLoading,
    error,
  };
}
