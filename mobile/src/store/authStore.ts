import { create } from 'zustand';
import { User, AuthToken } from '../types/index';
import { authService } from '../services/auth';

interface AuthStore {
  // State
  user: User | null;
  token: AuthToken | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: AuthToken | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Auth methods
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setToken: (token) => set({ token }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await authService.login({ email, password });
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  signup: async (email, password, firstName, lastName) => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await authService.signup({
        email,
        password,
        firstName,
        lastName,
      });
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Signup failed',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await authService.logout();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Logout failed',
        isLoading: false,
      });
      throw error;
    }
  },

  refreshToken: async () => {
    try {
      const token = await authService.refreshToken();
      set({
        token: {
          accessToken: token,
          expiresIn: 3600,
        },
      });
    } catch (error) {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
      });
      throw error;
    }
  },

  initializeAuth: async () => {
    set({ isLoading: true });
    try {
      const isAuthenticated = await authService.isAuthenticated();
      if (isAuthenticated) {
        const user = await authService.getCurrentUser();
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        });
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Initialization failed',
      });
    }
  },

  updateProfile: async (updates) => {
    const state = get();
    if (!state.user) {
      throw new Error('No user logged in');
    }

    set({ isLoading: true, error: null });
    try {
      const updatedUser = await authService.updateProfile(state.user.id, updates);
      set({
        user: updatedUser,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Profile update failed',
        isLoading: false,
      });
      throw error;
    }
  },
}));
