import { create } from 'zustand';

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood: 'joy' | 'calm' | 'reflect';
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  isPrivate?: boolean;
}

interface CanvasStore {
  entries: JournalEntry[];
  loading: boolean;
  error: string | null;
  selectedEntry: JournalEntry | null;

  // Actions
  setEntries: (entries: JournalEntry[]) => void;
  addEntry: (entry: JournalEntry) => void;
  updateEntry: (id: string, updates: Partial<JournalEntry>) => void;
  deleteEntry: (id: string) => void;
  setSelectedEntry: (entry: JournalEntry | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  searchEntries: (query: string) => JournalEntry[];
  filterByMood: (mood: string) => JournalEntry[];
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  entries: [],
  loading: false,
  error: null,
  selectedEntry: null,

  setEntries: (entries) => set({ entries }),
  addEntry: (entry) =>
    set((state) => ({
      entries: [entry, ...state.entries],
    })),
  updateEntry: (id, updates) =>
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === id ? { ...e, ...updates, updatedAt: Date.now() } : e
      ),
    })),
  deleteEntry: (id) =>
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== id),
    })),
  setSelectedEntry: (entry) => set({ selectedEntry: entry }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  searchEntries: (query) => {
    const entries = get().entries;
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(query.toLowerCase()) ||
        e.content.toLowerCase().includes(query.toLowerCase())
    );
  },
  filterByMood: (mood) => {
    const entries = get().entries;
    return entries.filter((e) => e.mood === mood);
  },
}));
