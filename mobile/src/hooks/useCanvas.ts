import { useState, useCallback } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { apiService } from '../services/apiService';

export function useCanvas() {
  const {
    entries,
    loading,
    error,
    setEntries,
    addEntry,
    updateEntry: updateStoreEntry,
    deleteEntry: deleteStoreEntry,
    setLoading,
    setError,
  } = useCanvasStore();

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getJournalEntries(1, 10);
      setEntries(data.entries || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load entries');
    } finally {
      setLoading(false);
    }
  }, [setEntries, setLoading, setError]);

  const createEntry = useCallback(
    async (title: string, content: string, mood: string) => {
      setError(null);
      try {
        const data = await apiService.createJournalEntry({
          title,
          content,
          mood,
        });
        addEntry({
          id: data.id || Date.now().toString(),
          title,
          content,
          mood: mood as any,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } catch (err: any) {
        setError(err.message || 'Failed to create entry');
      }
    },
    [addEntry, setError]
  );

  const updateEntry = useCallback(
    async (id: string, title: string, content: string, mood: string) => {
      setError(null);
      try {
        await apiService.updateJournalEntry(id, {
          title,
          content,
          mood,
        });
        updateStoreEntry(id, {
          title,
          content,
          mood: mood as any,
          updatedAt: Date.now(),
        });
      } catch (err: any) {
        setError(err.message || 'Failed to update entry');
      }
    },
    [updateStoreEntry, setError]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await apiService.deleteJournalEntry(id);
        deleteStoreEntry(id);
      } catch (err: any) {
        setError(err.message || 'Failed to delete entry');
      }
    },
    [deleteStoreEntry, setError]
  );

  return {
    entries,
    loading,
    error,
    loadEntries,
    createEntry,
    updateEntry,
    deleteEntry,
  };
}
