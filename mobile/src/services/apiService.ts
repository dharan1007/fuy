import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MOCK_CANVAS_ENTRIES,
  MOCK_SHOP_ITEMS,
  MOCK_ROUTES,
  MOCK_CHALLENGES,
  MOCK_CONNECTIONS,
  MOCK_LEADERBOARD,
  MOCK_FEED_POSTS,
  MOCK_WALLET,
  MOCK_CONVERSATIONS,
  MOCK_CONVERSATION_MESSAGES,
  MOCK_ALL_USERS,
} from '../constants/dummyData';

const API_BASE_URL = 'http://localhost:3000/api';

class ApiService {
  public axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
    });

    // Add token to requests
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Handle responses
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          AsyncStorage.removeItem('authToken');
        }
        return Promise.reject(error);
      }
    );
  }

  // ===== FEED ENDPOINTS =====
  async getFeed(page: number = 1, limit: number = 10) {
    try {
      const response = await this.axiosInstance.get('/feed', {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      // Fallback to mock data when API is unavailable
      return {
        posts: MOCK_FEED_POSTS,
        totalCount: MOCK_FEED_POSTS.length,
        page,
        limit,
        hasMore: false,
      };
    }
  }

  async createPost(data: { content: string; mood?: string }) {
    const response = await this.axiosInstance.post('/posts', data);
    return response.data;
  }

  async deletePost(postId: string) {
    const response = await this.axiosInstance.delete(`/posts/${postId}`);
    return response.data;
  }

  async addReaction(postId: string) {
    const response = await this.axiosInstance.post(`/posts/${postId}/reactions`);
    return response.data;
  }

  // ===== MESSAGES ENDPOINTS =====
  async getConversations(page: number = 1) {
    try {
      const response = await this.axiosInstance.get('/messages/conversations', {
        params: { page },
      });
      return response.data;
    } catch (error) {
      // Fallback to mock data when API is unavailable
      return {
        conversations: MOCK_CONVERSATIONS,
        totalCount: MOCK_CONVERSATIONS.length,
        page,
      };
    }
  }

  async getMessages(conversationId: string, page: number = 1) {
    try {
      const response = await this.axiosInstance.get(`/messages/${conversationId}`, {
        params: { page },
      });
      return response.data;
    } catch (error) {
      // Fallback to mock data when API is unavailable
      return {
        messages: (MOCK_CONVERSATION_MESSAGES as Record<string, any>)[conversationId] || [],
        participantId: 'user_1',
        participantName: 'Contact',
        lastMessage: 'Hello',
        lastMessageTime: new Date().toISOString(),
      };
    }
  }

  async sendMessage(conversationId: string, content: string) {
    const response = await this.axiosInstance.post(`/messages/${conversationId}`, {
      content,
    });
    return response.data;
  }

  async markConversationAsRead(conversationId: string) {
    const response = await this.axiosInstance.patch(`/messages/${conversationId}/read`);
    return response.data;
  }

  async searchUsers(query: string) {
    try {
      const response = await this.axiosInstance.get('/messages/search/users', {
        params: { q: query },
      });
      return response.data;
    } catch (error) {
      // Fallback to mock data when API is unavailable
      const lowerQuery = query.toLowerCase();
      const filtered = MOCK_ALL_USERS.filter(
        (user) =>
          user.name.toLowerCase().includes(lowerQuery) ||
          user.id.toLowerCase().includes(lowerQuery)
      );
      return {
        users: filtered,
        query,
        totalCount: filtered.length,
      };
    }
  }

  // ===== CANVAS (JOURNAL) ENDPOINTS =====
  async getJournalEntries(page: number = 1, limit: number = 10) {
    try {
      const response = await this.axiosInstance.get('/canvas', {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      // Fallback to mock data when API is unavailable
      return {
        entries: MOCK_CANVAS_ENTRIES,
        totalCount: MOCK_CANVAS_ENTRIES.length,
        page,
        limit,
      };
    }
  }

  async createJournalEntry(data: {
    title: string;
    content: string;
    mood: string;
    tags?: string[];
    isPrivate?: boolean;
  }) {
    const response = await this.axiosInstance.post('/canvas', data);
    return response.data;
  }

  async updateJournalEntry(entryId: string, data: any) {
    const response = await this.axiosInstance.patch(`/canvas/${entryId}`, data);
    return response.data;
  }

  async deleteJournalEntry(entryId: string) {
    const response = await this.axiosInstance.delete(`/canvas/${entryId}`);
    return response.data;
  }

  // ===== HOPLN (ROUTES) ENDPOINTS =====
  async getRoutes(page: number = 1) {
    const response = await this.axiosInstance.get('/hopln', { params: { page } });
    return response.data;
  }

  async createRoute(data: {
    name: string;
    distance: number;
    duration: number;
    difficulty: string;
    coordinates?: any[];
  }) {
    const response = await this.axiosInstance.post('/hopln', data);
    return response.data;
  }

  async updateRoute(routeId: string, data: any) {
    const response = await this.axiosInstance.patch(`/hopln/${routeId}`, data);
    return response.data;
  }

  async deleteRoute(routeId: string) {
    const response = await this.axiosInstance.delete(`/hopln/${routeId}`);
    return response.data;
  }

  // ===== ESSENZ (CHALLENGES) ENDPOINTS =====
  async getChallenges(page: number = 1) {
    const response = await this.axiosInstance.get('/essenz', { params: { page } });
    return response.data;
  }

  async createChallenge(data: {
    name: string;
    description: string;
    category: string;
    totalSteps: number;
    daysLeft: number;
    difficulty: string;
    reward: number;
  }) {
    const response = await this.axiosInstance.post('/essenz', data);
    return response.data;
  }

  async updateChallenge(challengeId: string, data: any) {
    const response = await this.axiosInstance.patch(`/essenz/${challengeId}`, data);
    return response.data;
  }

  async completeChallenge(challengeId: string) {
    const response = await this.axiosInstance.post(`/essenz/${challengeId}/complete`);
    return response.data;
  }

  // ===== BONDING (CONNECTIONS) ENDPOINTS =====
  async getConnections(page: number = 1) {
    const response = await this.axiosInstance.get('/bonding', { params: { page } });
    return response.data;
  }

  async addConnection(userId: string) {
    const response = await this.axiosInstance.post('/bonding', { userId });
    return response.data;
  }

  async updateConnection(connectionId: string, data: any) {
    const response = await this.axiosInstance.patch(`/bonding/${connectionId}`, data);
    return response.data;
  }

  async removeConnection(connectionId: string) {
    const response = await this.axiosInstance.delete(`/bonding/${connectionId}`);
    return response.data;
  }

  // ===== RANKING (LEADERBOARD) ENDPOINTS =====
  async getLeaderboard(type: 'global' | 'friends' | 'weekly' = 'global') {
    const response = await this.axiosInstance.get('/ranking', { params: { type } });
    return response.data;
  }

  async getUserRank() {
    const response = await this.axiosInstance.get('/ranking/user');
    return response.data;
  }

  // ===== SHOP ENDPOINTS =====
  async getShopItems(page: number = 1) {
    try {
      const response = await this.axiosInstance.get('/shop', { params: { page } });
      return response.data;
    } catch (error) {
      // Fallback to mock data when API is unavailable
      return {
        items: MOCK_SHOP_ITEMS,
        totalCount: MOCK_SHOP_ITEMS.length,
        page,
      };
    }
  }

  async purchaseItem(itemId: string) {
    const response = await this.axiosInstance.post(`/shop/${itemId}/purchase`);
    return response.data;
  }

  async getWalletBalance() {
    try {
      const response = await this.axiosInstance.get('/shop/wallet');
      return response.data;
    } catch (error) {
      // Fallback to mock data when API is unavailable
      return {
        balance: MOCK_WALLET.balance,
        totalEarned: MOCK_WALLET.totalEarned,
        totalSpent: MOCK_WALLET.totalSpent,
        currency: MOCK_WALLET.currency,
      };
    }
  }

  async addWalletBalance(amount: number) {
    const response = await this.axiosInstance.post('/shop/wallet', { amount });
    return response.data;
  }

  // ===== USER ENDPOINTS =====
  async getUserProfile() {
    const response = await this.axiosInstance.get('/user/profile');
    return response.data;
  }

  async updateUserProfile(data: any) {
    const response = await this.axiosInstance.patch('/user/profile', data);
    return response.data;
  }

  // ===== DISCOVERY ENDPOINTS =====
  async getTrendingMoments() {
    const response = await this.axiosInstance.get('/discover/trending');
    return response.data;
  }

  async searchMoments(query: string) {
    const response = await this.axiosInstance.get('/discover/search', {
      params: { q: query },
    });
    return response.data;
  }

  // ===== HEALTH CHECK =====
  async healthCheck() {
    try {
      const response = await this.axiosInstance.get('/health');
      return response.data;
    } catch (error) {
      return { status: 'offline' };
    }
  }
}

export const apiService = new ApiService();
