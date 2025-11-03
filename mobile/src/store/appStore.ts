import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface AppStore {
  // Global state
  isLoading: boolean;
  toasts: Toast[];
  theme: 'light' | 'dark';
  isOnline: boolean;
  syncInProgress: boolean;

  // Actions
  setLoading: (loading: boolean) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setOnline: (online: boolean) => void;
  setSyncInProgress: (syncing: boolean) => void;
  clearToasts: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  isLoading: false,
  toasts: [],
  theme: 'light',
  isOnline: true,
  syncInProgress: false,

  setLoading: (isLoading) => set({ isLoading }),

  addToast: (toast) => {
    const id = Date.now().toString();
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));

    // Auto-remove toast after duration
    if (toast.duration !== 0) {
      setTimeout(
        () => {
          set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
          }));
        },
        toast.duration || 3000
      );
    }

    return id;
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),

  setTheme: (theme) => set({ theme }),

  setOnline: (isOnline) => set({ isOnline }),

  setSyncInProgress: (syncInProgress) => set({ syncInProgress }),

  clearToasts: () => set({ toasts: [] }),
}));

// Helper functions for easier toast management
export const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration?: number) => {
  useAppStore.setState((state) => ({
    toasts: [
      ...state.toasts,
      {
        id: Date.now().toString(),
        message,
        type,
        duration: duration ?? 3000,
      },
    ],
  }));
};

export const showSuccessToast = (message: string, duration?: number) => {
  showToast(message, 'success', duration);
};

export const showErrorToast = (message: string, duration?: number) => {
  showToast(message, 'error', duration);
};

export const showInfoToast = (message: string, duration?: number) => {
  showToast(message, 'info', duration);
};

export const showWarningToast = (message: string, duration?: number) => {
  showToast(message, 'warning', duration);
};
