import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './api';
import { STORAGE_KEYS } from '../constants/index';
import { User, LoginRequest, SignupRequest, AuthToken } from '../types/index';

export const authService = {
  // Login with email and password
  async login(credentials: LoginRequest): Promise<{ user: User; token: AuthToken }> {
    try {
      // normalize
      const email = credentials.email.trim().toLowerCase();
      const password = credentials.password.trim();

      const response = await apiClient.post<{
        user: User;
        accessToken: string;
        refreshToken?: string;
        expiresIn: number;
      }>('/auth/login', { email, password });

      const data = response.data.data;
      if (!data || !data.user || !data.accessToken || data.expiresIn === undefined) {
        throw new Error('Invalid login response');
      }
      const { user, accessToken, refreshToken, expiresIn } = data;

      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, accessToken),
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user)),
        ...(refreshToken ? [AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)] : []),
      ]);

      return {
        user,
        token: { accessToken, refreshToken, expiresIn },
      };
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Sign up new account
  async signup(signupData: SignupRequest): Promise<{ user: User; token: AuthToken }> {
    try {
      const payload = {
        email: signupData.email.trim().toLowerCase(),
        password: signupData.password.trim(),
        firstName: signupData.firstName,
        lastName: signupData.lastName,
      };

      const response = await apiClient.post<{
        user: User;
        accessToken: string;
        refreshToken?: string;
        expiresIn: number;
      }>('/auth/signup', payload);

      const data = response.data.data;
      if (!data || !data.user || !data.accessToken || data.expiresIn === undefined) {
        throw new Error('Invalid login response');
      }
      const { user, accessToken, refreshToken, expiresIn } = data;

      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, accessToken),
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user)),
        ...(refreshToken ? [AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)] : []),
      ]);

      return {
        user,
        token: { accessToken, refreshToken, expiresIn },
      };
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Logout
  async logout(): Promise<void> {
    try {
      try {
        await apiClient.post('/auth/logout');
      } catch (_) { /* ignore */ }

      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
      ]);
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get current user from storage
  async getCurrentUser(): Promise<User | null> {
    try {
      const userJson = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  // Refresh access token
  async refreshToken(): Promise<string> {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) throw new Error('No refresh token available');

      const response = await apiClient.post<{ accessToken: string }>(
        '/auth/refresh',
        { refreshToken }
      );

      const tokenData = response.data.data;
      if (!tokenData || !tokenData.accessToken) {
        throw new Error('Invalid refresh token response');
      }
      const { accessToken } = tokenData;

      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, accessToken);
      return accessToken;
    } catch (error) {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
      ]);
      throw this.handleError(error);
    }
  },

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      return !!token;
    } catch {
      return false;
    }
  },

  // Get stored token
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    } catch {
      return null;
    }
  },

  // Update user profile
  async updateProfile(userId: string, data: Partial<User>): Promise<User> {
    try {
      const response = await apiClient.put<User>(`/users/${userId}/profile`, data);
      const user = response.data.data;
      if (!user) throw new Error('No user data received');
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      return user;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Change password
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    try {
      await apiClient.post(`/users/${userId}/change-password`, {
        oldPassword,
        newPassword,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Initialize passkey (WebAuthn)
  async initializePasskey(userId: string): Promise<any> {
    try {
      const response = await apiClient.post(`/auth/passkey/register/init`, { userId });
      const data = response.data.data;
      if (!data) throw new Error('No data received');
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Verify passkey registration
  async verifyPasskeyRegistration(userId: string, credential: any): Promise<void> {
    try {
      await apiClient.post(`/auth/passkey/register/verify`, { userId, credential });
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Handle authentication errors
  handleError(error: any): Error {
    if (error?.response?.data?.error) return new Error(error.response.data.error);
    if (error?.message) return new Error(error.message);
    return new Error('An authentication error occurred');
  },
};
