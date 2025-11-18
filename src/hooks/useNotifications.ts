'use client';

import { useState, useCallback, useEffect } from 'react';

export interface NotificationSender {
  id: string;
  name: string;
  profile?: {
    displayName?: string;
    avatarUrl?: string;
  } | null;
}

export interface NotificationPost {
  id: string;
  content: string;
  user: NotificationSender;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'FRIEND_REQUEST' | 'FRIEND_ACCEPT' | 'POST_LIKE' | 'POST_COMMENT' | 'POST_SHARE';
  message: string;
  postId?: string | null;
  read: boolean;
  createdAt: string;
  updatedAt: string;
  sender?: NotificationSender;
  post?: NotificationPost;
  friendshipId?: string;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for managing notifications
 */
export function useNotifications() {
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
  });

  // Fetch all notifications
  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const url = `/api/notifications${unreadOnly ? '?unreadOnly=true' : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch notifications');

      const data = await res.json();
      const notifications = data.notifications || [];

      const unreadCount = notifications.filter((n: Notification) => !n.read).length;

      setState((prev) => ({
        ...prev,
        notifications,
        unreadCount,
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

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });

      if (!res.ok) throw new Error('Failed to mark notification as read');

      // Optimistically update UI
      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }));

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      setState((prev) => ({ ...prev, error: message }));
      return { success: false, error: message };
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });

      if (!res.ok) throw new Error('Failed to mark all notifications as read');

      // Optimistically update UI
      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      setState((prev) => ({ ...prev, error: message }));
      return { success: false, error: message };
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete notification');

      // Optimistically update UI
      setState((prev) => {
        const notification = prev.notifications.find((n) => n.id === notificationId);
        const wasUnread = notification && !notification.read;

        return {
          ...prev,
          notifications: prev.notifications.filter((n) => n.id !== notificationId),
          unreadCount: wasUnread ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount,
        };
      });

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      setState((prev) => ({ ...prev, error: message }));
      return { success: false, error: message };
    }
  }, []);

  // Load initial notifications
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    ...state,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
