import { useState, useCallback, useEffect } from 'react';

export interface FriendshipRequest {
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

export interface FriendshipState {
  sentRequests: FriendshipRequest[];
  receivedRequests: FriendshipRequest[];
  acceptedFriends: FriendshipRequest[];
  ghostedRequests: FriendshipRequest[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook for managing friendship requests and relationships
 */
export function useFriendships() {
  const [state, setState] = useState<FriendshipState>({
    sentRequests: [],
    receivedRequests: [],
    acceptedFriends: [],
    ghostedRequests: [],
    loading: false,
    error: null,
  });

  // Fetch all friendship requests
  const fetchRequests = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch('/api/friends/request');
      if (!res.ok) throw new Error('Failed to fetch friend requests');

      const data = await res.json();
      const requests = data.requests || [];

      // Separate requests
      const currentUserId = await getCurrentUserId();
      const sent = requests.filter((r: FriendshipRequest) => r.userId === currentUserId && r.status === 'PENDING');
      const received = requests.filter((r: FriendshipRequest) => r.friendId === currentUserId && r.status === 'PENDING');
      const accepted = requests.filter((r: FriendshipRequest) => r.status === 'ACCEPTED');

      setState((prev) => ({
        ...prev,
        sentRequests: sent,
        receivedRequests: received,
        acceptedFriends: accepted,
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
      const res = await fetch('/api/friends/ghosted');
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

  // Send friend request
  const sendFriendRequest = useCallback(async (friendId: string) => {
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to send friend request');
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

  // Accept friend request
  const acceptFriendRequest = useCallback(async (friendshipId: string) => {
    try {
      const res = await fetch('/api/friends/request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action: 'ACCEPT' }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to accept friend request');
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

  // Reject friend request
  const rejectFriendRequest = useCallback(async (friendshipId: string) => {
    try {
      const res = await fetch('/api/friends/request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action: 'REJECT' }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to reject friend request');
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

  // Ghost friend request (receive)
  const ghostFriendRequest = useCallback(async (friendshipId: string) => {
    try {
      const res = await fetch('/api/friends/request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action: 'GHOST' }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to ghost friend request');
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

  // Un-ghost a request (sender's action)
  const unGhostRequest = useCallback(async (friendshipId: string) => {
    try {
      const res = await fetch('/api/friends/ghosted', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId }),
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

  // Remove friend
  const removeFriend = useCallback(async (friendshipId: string) => {
    try {
      const res = await fetch('/api/friends/request', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to remove friend');
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
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    ghostFriendRequest,
    unGhostRequest,
    removeFriend,
  };
}

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
