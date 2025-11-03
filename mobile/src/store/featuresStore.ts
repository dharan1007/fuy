import { create } from 'zustand';

// ===== HOPLN TYPES =====
export interface Route {
  id: string;
  name: string;
  distance: number;
  duration: number;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'completed' | 'in-progress' | 'planned';
  startedAt?: number;
  completedAt?: number;
  coordinates?: Array<{ lat: number; lng: number }>;
}

// ===== ESSENZ TYPES =====
export interface Challenge {
  id: string;
  name: string;
  description: string;
  category: string;
  progress: number;
  totalSteps: number;
  daysLeft: number;
  difficulty: 'easy' | 'medium' | 'hard';
  reward: number;
  startedAt: number;
  endsAt: number;
}

// ===== BONDING TYPES =====
export interface Connection {
  id: string;
  name: string;
  status: 'close' | 'friend' | 'acquaintance';
  sharedMoments: number;
  lastInteraction: number;
  vibe: string;
  avatar?: string;
}

// ===== RANKING TYPES =====
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  score: number;
  badges: string[];
  trend: 'up' | 'down' | 'stable';
}

// ===== SHOP TYPES =====
export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  icon: string;
  purchased: boolean;
}

// ===== STORE INTERFACE =====
interface FeaturesStore {
  // HOPLN
  routes: Route[];
  currentRoute: Route | null;

  // ESSENZ
  challenges: Challenge[];
  completedChallenges: Challenge[];

  // BONDING
  connections: Connection[];

  // RANKING
  leaderboard: LeaderboardEntry[];
  userRank: LeaderboardEntry | null;

  // SHOP
  shopItems: ShopItem[];
  inventory: string[]; // array of purchased item IDs
  walletBalance: number;

  // GENERAL
  loading: boolean;
  error: string | null;

  // ACTIONS - HOPLN
  setRoutes: (routes: Route[]) => void;
  addRoute: (route: Route) => void;
  updateRoute: (id: string, updates: Partial<Route>) => void;
  deleteRoute: (id: string) => void;
  setCurrentRoute: (route: Route | null) => void;

  // ACTIONS - ESSENZ
  setChallenges: (challenges: Challenge[]) => void;
  addChallenge: (challenge: Challenge) => void;
  updateChallenge: (id: string, updates: Partial<Challenge>) => void;
  completeChallenge: (id: string) => void;
  deleteChallenge: (id: string) => void;

  // ACTIONS - BONDING
  setConnections: (connections: Connection[]) => void;
  addConnection: (connection: Connection) => void;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  removeConnection: (id: string) => void;

  // ACTIONS - RANKING
  setLeaderboard: (leaderboard: LeaderboardEntry[]) => void;
  setUserRank: (rank: LeaderboardEntry | null) => void;

  // ACTIONS - SHOP
  setShopItems: (items: ShopItem[]) => void;
  purchaseItem: (itemId: string, cost: number) => boolean;
  setWalletBalance: (balance: number) => void;
  addWalletBalance: (amount: number) => void;

  // GENERAL
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useFeaturesStore = create<FeaturesStore>((set, get) => ({
  // INITIAL STATE
  routes: [],
  currentRoute: null,
  challenges: [],
  completedChallenges: [],
  connections: [],
  leaderboard: [],
  userRank: null,
  shopItems: [],
  inventory: [],
  walletBalance: 0,
  loading: false,
  error: null,

  // HOPLN ACTIONS
  setRoutes: (routes) => set({ routes }),
  addRoute: (route) =>
    set((state) => ({
      routes: [route, ...state.routes],
    })),
  updateRoute: (id, updates) =>
    set((state) => ({
      routes: state.routes.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    })),
  deleteRoute: (id) =>
    set((state) => ({
      routes: state.routes.filter((r) => r.id !== id),
    })),
  setCurrentRoute: (route) => set({ currentRoute: route }),

  // ESSENZ ACTIONS
  setChallenges: (challenges) =>
    set({
      challenges: challenges.filter((c) => c.progress < c.totalSteps),
      completedChallenges: challenges.filter((c) => c.progress === c.totalSteps),
    }),
  addChallenge: (challenge) =>
    set((state) => ({
      challenges: [challenge, ...state.challenges],
    })),
  updateChallenge: (id, updates) =>
    set((state) => ({
      challenges: state.challenges.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),
  completeChallenge: (id) =>
    set((state) => {
      const challenge = state.challenges.find((c) => c.id === id);
      if (!challenge) return state;
      return {
        challenges: state.challenges.filter((c) => c.id !== id),
        completedChallenges: [...state.completedChallenges, { ...challenge, progress: challenge.totalSteps }],
      };
    }),
  deleteChallenge: (id) =>
    set((state) => ({
      challenges: state.challenges.filter((c) => c.id !== id),
      completedChallenges: state.completedChallenges.filter((c) => c.id !== id),
    })),

  // BONDING ACTIONS
  setConnections: (connections) => set({ connections }),
  addConnection: (connection) =>
    set((state) => ({
      connections: [connection, ...state.connections],
    })),
  updateConnection: (id, updates) =>
    set((state) => ({
      connections: state.connections.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),
  removeConnection: (id) =>
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id),
    })),

  // RANKING ACTIONS
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  setUserRank: (rank) => set({ userRank: rank }),

  // SHOP ACTIONS
  setShopItems: (items) => set({ shopItems: items }),
  purchaseItem: (itemId, cost) => {
    const state = get();
    if (state.walletBalance < cost) return false;

    set((s) => ({
      inventory: [...s.inventory, itemId],
      walletBalance: s.walletBalance - cost,
      shopItems: s.shopItems.map((item) =>
        item.id === itemId ? { ...item, purchased: true } : item
      ),
    }));
    return true;
  },
  setWalletBalance: (balance) => set({ walletBalance: balance }),
  addWalletBalance: (amount) =>
    set((state) => ({
      walletBalance: state.walletBalance + amount,
    })),

  // GENERAL ACTIONS
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      routes: [],
      currentRoute: null,
      challenges: [],
      completedChallenges: [],
      connections: [],
      leaderboard: [],
      userRank: null,
      shopItems: [],
      inventory: [],
      walletBalance: 0,
      loading: false,
      error: null,
    }),
}));
