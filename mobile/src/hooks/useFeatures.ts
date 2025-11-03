import { useState, useCallback } from 'react';
import { useFeaturesStore } from '../store/featuresStore';
import { apiService } from '../services/apiService';
import {
  MOCK_ROUTES,
  MOCK_CHALLENGES,
  MOCK_CONNECTIONS,
  MOCK_LEADERBOARD,
  MOCK_SHOP_ITEMS,
  MOCK_USER_RANK,
} from '../constants/dummyData';

export function useHopln() {
  const { routes, loading, error, setRoutes, addRoute, updateRoute, deleteRoute, setLoading, setError } =
    useFeaturesStore();

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getRoutes(1);
      setRoutes(data.routes || MOCK_ROUTES);
    } catch (err: any) {
      // Use mock data as fallback
      setRoutes(MOCK_ROUTES);
      console.warn('Using mock routes data:', err.message);
    } finally {
      setLoading(false);
    }
  }, [setRoutes, setLoading, setError]);

  const createRoute = useCallback(
    async (name: string, distance: number, duration: number, difficulty: string) => {
      setError(null);
      try {
        const data = await apiService.createRoute({
          name,
          distance,
          duration,
          difficulty,
        });
        addRoute({
          id: data.id || Date.now().toString(),
          name,
          distance,
          duration,
          difficulty: difficulty as any,
          status: 'planned',
        });
      } catch (err: any) {
        setError(err.message || 'Failed to create route');
      }
    },
    [addRoute, setError]
  );

  return { routes, loading, error, loadRoutes, createRoute };
}

export function useEssenz() {
  const { challenges, completedChallenges, loading, error, setChallenges, addChallenge, completeChallenge, setLoading, setError } =
    useFeaturesStore();

  const loadChallenges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getChallenges(1);
      setChallenges(data.challenges || MOCK_CHALLENGES);
    } catch (err: any) {
      // Use mock data as fallback
      setChallenges(MOCK_CHALLENGES);
      console.warn('Using mock challenges data:', err.message);
    } finally {
      setLoading(false);
    }
  }, [setChallenges, setLoading, setError]);

  const createChallenge = useCallback(
    async (name: string, description: string, category: string, totalSteps: number, daysLeft: number, difficulty: string, reward: number) => {
      setError(null);
      try {
        const data = await apiService.createChallenge({
          name,
          description,
          category,
          totalSteps,
          daysLeft,
          difficulty,
          reward,
        });
        addChallenge({
          id: data.id || Date.now().toString(),
          name,
          description,
          category,
          progress: 0,
          totalSteps,
          daysLeft,
          difficulty: difficulty as any,
          reward,
          startedAt: Date.now(),
          endsAt: Date.now() + daysLeft * 24 * 60 * 60 * 1000,
        });
      } catch (err: any) {
        setError(err.message || 'Failed to create challenge');
      }
    },
    [addChallenge, setError]
  );

  return { challenges, completedChallenges, loading, error, loadChallenges, createChallenge };
}

export function useBonding() {
  const { connections, loading, error, setConnections, addConnection, updateConnection, removeConnection, setLoading, setError } =
    useFeaturesStore();

  const loadConnections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getConnections(1);
      setConnections(data.connections || MOCK_CONNECTIONS);
    } catch (err: any) {
      // Use mock data as fallback
      setConnections(MOCK_CONNECTIONS);
      console.warn('Using mock connections data:', err.message);
    } finally {
      setLoading(false);
    }
  }, [setConnections, setLoading, setError]);

  const connectWithUser = useCallback(
    async (userId: string) => {
      setError(null);
      try {
        const data = await apiService.addConnection(userId);
        addConnection({
          id: data.id || Date.now().toString(),
          name: data.name || 'Unknown',
          status: 'acquaintance',
          sharedMoments: 0,
          lastInteraction: Date.now(),
          vibe: data.vibe || '✨',
        });
      } catch (err: any) {
        setError(err.message || 'Failed to connect');
      }
    },
    [addConnection, setError]
  );

  return { connections, loading, error, loadConnections, connectWithUser };
}

export function useRanking() {
  const { leaderboard, userRank, loading, error, setLeaderboard, setUserRank, setLoading, setError } =
    useFeaturesStore();

  const loadLeaderboard = useCallback(async (type: 'global' | 'friends' | 'weekly' = 'global') => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getLeaderboard(type);
      setLeaderboard(data.leaderboard || MOCK_LEADERBOARD);
    } catch (err: any) {
      // Use mock data as fallback
      setLeaderboard(MOCK_LEADERBOARD);
      console.warn('Using mock leaderboard data:', err.message);
    } finally {
      setLoading(false);
    }
  }, [setLeaderboard, setLoading, setError]);

  const loadUserRank = useCallback(async () => {
    setError(null);
    try {
      const data = await apiService.getUserRank();
      setUserRank(data || MOCK_USER_RANK);
    } catch (err: any) {
      // Use mock data as fallback
      setUserRank(MOCK_USER_RANK);
      console.warn('Using mock user rank data:', err.message);
    }
  }, [setUserRank, setError]);

  return { leaderboard, userRank, loading, error, loadLeaderboard, loadUserRank };
}

export function useShop() {
  const { shopItems, inventory, walletBalance, loading, error, setShopItems, purchaseItem, setWalletBalance, addWalletBalance, setLoading, setError } =
    useFeaturesStore();

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getShopItems(1);
      setShopItems(data.items || MOCK_SHOP_ITEMS);
    } catch (err: any) {
      // Use mock data as fallback
      setShopItems(MOCK_SHOP_ITEMS);
      console.warn('Using mock shop items data:', err.message);
    } finally {
      setLoading(false);
    }
  }, [setShopItems, setLoading, setError]);

  const loadWallet = useCallback(async () => {
    setError(null);
    try {
      const data = await apiService.getWalletBalance();
      setWalletBalance(data.balance || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load wallet');
    }
  }, [setWalletBalance, setError]);

  const buy = useCallback(
    async (itemId: string, cost: number) => {
      setError(null);
      try {
        await apiService.purchaseItem(itemId);
        purchaseItem(itemId, cost);
      } catch (err: any) {
        setError(err.message || 'Failed to purchase item');
      }
    },
    [purchaseItem, setError]
  );

  return { shopItems, inventory, walletBalance, loading, error, loadItems, loadWallet, buy };
}
