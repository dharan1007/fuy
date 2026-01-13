import { useState, useCallback, useEffect } from 'react';

export interface FollowRequest {
  id: string;
  userId: string;
  friendId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  isGhosted: boolean;
  ghostedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    profile?: {
      displayName?: string;
      avatarUrl?: string;
      bio?: string;
    } | null;
  };
  friend?: {
    id: string;
    name: string;
    email: string;
    profile?: {
      displayName?: string;
      avatarUrl?: string;
      bio?: string;
    } | null;
  };
}

export interface FollowState {
  sentRequests: FollowRequest[];
  receivedRequests: FollowRequest[];
  following: FollowRequest[];
  ghostedRequests: FollowRequest[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook for managing follow requests and relationships
 */
export function useFollow() {
  const [state, setState] = useState<FollowState>({
    sentRequests: [],
    receivedRequests: [],
    following: [],
    ghostedRequests: [],
    loading: false,
    error: null,
  });

  // Fetch all follow requests
  const fetchRequests = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch('/api/users/follow-request');
      if (!res.ok) throw new Error('Failed to fetch follow requests');

      const data = await res.json();
      const requests = data.requests || [];

      // Separate requests
      const currentUserId = await getCurrentUserId();
      const sent = requests.filter((r: FollowRequest) => r.userId === currentUserId && r.status === 'PENDING');
      const received = requests.filter((r: FollowRequest) => r.friendId === currentUserId && r.status === 'PENDING');
      const accepted = requests.filter((r: FollowRequest) => r.status === 'ACCEPTED');

      setState((prev) => ({
        ...prev,
        sentRequests: sent,
        receivedRequests: received,
        following: accepted,
        loading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'An error occurred',
        loading: false,
      }));
    }
  }, []);

  // Fetch ghosted requests
  const fetchGhostedRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/users/ghosted');
      if (!res.ok) throw new Error('Failed to fetch ghosted requests');

      const data = await res.json();
      setState((prev) => ({
        ...prev,
        ghostedRequests: data.ghostedRequests || [],
      }));
    } catch (error) {
      console.error('Error fetching ghosted requests:', error);
    }
  }, []);

  // Send follow request
  const sendFollowRequest = useCallback(async (targetUserId: string) => {
    try {
      const res = await fetch('/api/users/follow-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: targetUserId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to send follow request');
      }

      // Refresh requests
      await fetchRequests();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      setState((prev) => ({ ...prev, error: message }));
      return { success: false, error: message };
    }
  }, [fetchRequests]);

  // Accept follow request
  const acceptFollowRequest = useCallback(async (requestId: string) => {
    try {
      const res = await fetch('/api/users/follow-request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId: requestId, action: 'ACCEPT' }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to accept follow request');
      }

      // Refresh requests
      await fetchRequests();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      setState((prev) => ({ ...prev, error: message }));
      return { success: false, error: message };
    }
  }, [fetchRequests]);

  // Reject follow request
  const rejectFollowRequest = useCallback(async (requestId: string) => {
    try {
      const res = await fetch('/api/users/follow-request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId: requestId, action: 'REJECT' }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to reject follow request');
      }

      // Refresh requests
      await fetchRequests();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      setState((prev) => ({ ...prev, error: message }));
      return { success: false, error: message };
    }
  }, [fetchRequests]);

  // Ghost follow request
  const ghostFollowRequest = useCallback(async (requestId: string) => {
    try {
      const res = await fetch('/api/users/follow-request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId: requestId, action: 'GHOST' }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to ghost follow request');
      }

      // Refresh requests
      await fetchRequests();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      setState((prev) => ({ ...prev, error: message }));
      return { success: false, error: message };
    }
  }, [fetchRequests]);

  // Un-ghost a request
  const unGhostRequest = useCallback(async (requestId: string) => {
    try {
      const res = await fetch('/api/users/ghosted', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId: requestId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to un-ghost request');
      }

      // Refresh requests
      await fetchRequests();
      await fetchGhostedRequests();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      setState((prev) => ({ ...prev, error: message }));
      return { success: false, error: message };
    }
  }, [fetchRequests, fetchGhostedRequests]);

  // Unfollow user
  const unfollow = useCallback(async (requestId: string) => {
    try {
      const res = await fetch('/api/users/follow-request', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId: requestId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to unfollow');
      }

      // Refresh requests
      await fetchRequests();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      setState((prev) => ({ ...prev, error: message }));
      return { success: false, error: message };
    }
  }, [fetchRequests]);

  // Load initial data
  useEffect(() => {
    fetchRequests();
    fetchGhostedRequests();
  }, [fetchRequests, fetchGhostedRequests]);

  return {
    ...state,
    fetchRequests,
    fetchGhostedRequests,
    sendFollowRequest,
    acceptFollowRequest,
    rejectFollowRequest,
    ghostFollowRequest,
    unGhostRequest,
    unfollow,
  };
}

// For backward compatibility, export the old name as an alias
export const useFriendships = useFollow;

// Helper to get current user ID
async function getCurrentUserId(): Promise<string> {
  try {
    const res = await fetch('/api/profile');
    const data = await res.json();
    return data.user?.id || '';
  } catch {
    return '';
  }
}
