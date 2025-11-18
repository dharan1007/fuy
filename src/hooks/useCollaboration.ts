'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase, type RealtimeChannel } from '@/lib/supabase-client';

export interface CollaborationUpdate {
  id: string;
  sessionId: string;
  userId: string;
  operation: 'ADD_BLOCK' | 'UPDATE_BLOCK' | 'REMOVE_BLOCK' | 'DRAW' | 'SAVE';
  blockId?: string;
  data: any;
  timestamp: string;
  synced: boolean;
  user?: {
    id: string;
    name?: string;
    profile?: {
      displayName?: string;
      avatarUrl?: string;
    };
  };
}

export interface CanvasData {
  blocks: Record<string, any>;
  drawing?: any;
}

export interface CollaborationSession {
  sessionId: string;
  canvasData: CanvasData | null;
  autoSaveEnabled: boolean;
  lastSavedAt: string | null;
  lastModifiedBy: string | null;
  syncVersion: number;
  updates: CollaborationUpdate[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for managing real-time collaboration on canvas and other features
 */
export function useCollaboration(sessionId: string | null) {
  const [session, setSession] = useState<CollaborationSession>({
    sessionId: sessionId || '',
    canvasData: null,
    autoSaveEnabled: true,
    lastSavedAt: null,
    lastModifiedBy: null,
    syncVersion: 0,
    updates: [],
    isLoading: false,
    error: null,
  });

  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncVersionRef = useRef<number>(0);

  /**
   * Fetch canvas data for a session
   */
  const fetchCanvasData = useCallback(async () => {
    if (!sessionId) return;

    setSession((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const res = await fetch(`/api/collaboration/canvas?sessionId=${sessionId}`);
      if (!res.ok) throw new Error('Failed to fetch canvas data');

      const data = await res.json();
      setSession((prev) => ({
        ...prev,
        canvasData: data.canvasData,
        autoSaveEnabled: data.autoSaveEnabled,
        lastSavedAt: data.lastSavedAt,
        lastModifiedBy: data.lastModifiedBy,
        syncVersion: data.syncVersion,
        isLoading: false,
      }));

      lastSyncVersionRef.current = data.syncVersion;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch canvas data';
      setSession((prev) => ({
        ...prev,
        error: message,
        isLoading: false,
      }));
    }
  }, [sessionId]);

  /**
   * Save canvas data
   */
  const saveCanvasData = useCallback(
    async (canvasData: CanvasData, autoSaveEnabled?: boolean) => {
      if (!sessionId) return;

      try {
        const res = await fetch('/api/collaboration/canvas', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            canvasData,
            autoSaveEnabled,
          }),
        });

        if (!res.ok) throw new Error('Failed to save canvas data');

        const result = await res.json();
        setSession((prev) => ({
          ...prev,
          canvasData,
          lastSavedAt: result.lastSavedAt,
          syncVersion: result.syncVersion,
          ...(autoSaveEnabled !== undefined && {
            autoSaveEnabled,
          }),
        }));

        return { success: true };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to save canvas data';
        setSession((prev) => ({ ...prev, error: message }));
        return { success: false, error: message };
      }
    },
    [sessionId]
  );

  /**
   * Create a collaboration update (track operations)
   */
  const createUpdate = useCallback(
    async (
      operation: 'ADD_BLOCK' | 'UPDATE_BLOCK' | 'REMOVE_BLOCK' | 'DRAW' | 'SAVE',
      data: any,
      blockId?: string
    ) => {
      if (!sessionId) return;

      try {
        const res = await fetch('/api/collaboration/updates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            operation,
            blockId,
            data,
          }),
        });

        if (!res.ok) throw new Error('Failed to create collaboration update');

        const result = await res.json();
        return { success: true, update: result.update };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to create update';
        setSession((prev) => ({ ...prev, error: message }));
        return { success: false, error: message };
      }
    },
    [sessionId]
  );

  /**
   * Fetch collaboration updates since last sync
   */
  const fetchUpdates = useCallback(async (since?: string) => {
    if (!sessionId) return;

    try {
      const url = new URL('/api/collaboration/updates', window.location.origin);
      url.searchParams.set('sessionId', sessionId);
      url.searchParams.set('limit', '100');
      if (since) url.searchParams.set('since', since);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch collaboration updates');

      const data = await res.json();
      setSession((prev) => ({
        ...prev,
        updates: data.updates,
      }));

      return { success: true, updates: data.updates };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch updates';
      setSession((prev) => ({ ...prev, error: message }));
      return { success: false, error: message };
    }
  }, [sessionId]);

  /**
   * Toggle auto-save
   */
  const toggleAutoSave = useCallback(
    async (enabled: boolean) => {
      setSession((prev) => ({
        ...prev,
        autoSaveEnabled: enabled,
      }));

      // Save the preference
      if (session.canvasData) {
        await saveCanvasData(session.canvasData, enabled);
      }
    },
    [session.canvasData, saveCanvasData]
  );

  /**
   * Set up auto-save interval
   */
  useEffect(() => {
    if (!session.autoSaveEnabled || !sessionId) {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
      return;
    }

    // Auto-save every 30 seconds if enabled
    autoSaveIntervalRef.current = setInterval(async () => {
      if (session.canvasData) {
        await saveCanvasData(session.canvasData);
      }
    }, 30000);

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    };
  }, [session.autoSaveEnabled, session.canvasData, sessionId, saveCanvasData]);

  /**
   * Set up Supabase realtime subscription for collaboration updates
   */
  useEffect(() => {
    if (!sessionId) return;

    let realtimeChannel: RealtimeChannel | null = null;

    const setupRealtime = async () => {
      try {
        // Subscribe to CollaborationUpdate changes for this session
        realtimeChannel = supabase
          .channel(`collaboration:${sessionId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'CollaborationUpdate',
              filter: `sessionId=eq.${sessionId}`,
            },
            (payload: any) => {
              // New update received
              const newUpdate: CollaborationUpdate = {
                ...payload.new,
                data: JSON.parse(payload.new.data),
              };

              setSession((prev) => ({
                ...prev,
                updates: [...prev.updates, newUpdate],
              }));
            }
          )
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              // Subscription established
            } else if (status === 'CHANNEL_ERROR') {
              // Fall back to polling if realtime fails
            }
          });
      } catch (error) {
        // Realtime setup failed, will fall back to polling
        console.warn('Realtime subscription setup failed:', error);
      }
    };

    setupRealtime();

    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [sessionId]);

  /**
   * Set up fallback polling for updates (when realtime fails)
   */
  useEffect(() => {
    if (!sessionId) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    // Poll for new updates every 10 seconds as fallback
    // Realtime should handle most updates, polling is just a safety net
    syncIntervalRef.current = setInterval(async () => {
      await fetchUpdates();
    }, 10000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [sessionId, fetchUpdates]);

  /**
   * Load initial canvas data
   */
  useEffect(() => {
    if (sessionId) {
      fetchCanvasData();
    }
  }, [sessionId, fetchCanvasData]);

  return {
    // State
    sessionId: session.sessionId,
    canvasData: session.canvasData,
    autoSaveEnabled: session.autoSaveEnabled,
    lastSavedAt: session.lastSavedAt,
    lastModifiedBy: session.lastModifiedBy,
    syncVersion: session.syncVersion,
    updates: session.updates,
    isLoading: session.isLoading,
    error: session.error,

    // Actions
    fetchCanvasData,
    saveCanvasData,
    createUpdate,
    fetchUpdates,
    toggleAutoSave,
  };
}
