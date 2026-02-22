import * as SecureStore from 'expo-secure-store';

/**
 * Secure storage wrapper using Expo SecureStore
 * SecureStore uses OS-level encryption (Keychain on iOS, EncryptedSharedPreferences on Android)
 */

export const SecureStorage = {
    /**
     * Save data securely
     */
    async save(key: string, value: string): Promise<boolean> {
        try {
            await SecureStore.setItemAsync(key, value);
            return true;
        } catch (error) {
            console.error('SecureStorage.save error:', error);
            return false;
        }
    },

    /**
     * Retrieve data
     */
    async get(key: string): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync(key);
        } catch (error) {
            console.error('SecureStorage.get error:', error);
            return null;
        }
    },

    /**
     * Remove data
     */
    async remove(key: string): Promise<boolean> {
        try {
            await SecureStore.deleteItemAsync(key);
            return true;
        } catch (error) {
            console.error('SecureStorage.remove error:', error);
            return false;
        }
    },

    /**
     * Clear all stored data
     */
    async clear(): Promise<boolean> {
        try {
            // SecureStore doesn't have a clear all method
            // You would need to track all keys and remove them individually
            const keys = ['auth_token', 'refresh_token', 'user_data'];
            for (const key of keys) {
                await this.remove(key);
            }
            return true;
        } catch (error) {
            console.error('SecureStorage.clear error:', error);
            return false;
        }
    },
};

/**
 * Token management
 */
export const TokenManager = {
    /**
     * Save authentication token
     */
    async saveAuthToken(token: string): Promise<boolean> {
        return SecureStorage.save('auth_token', token);
    },

    /**
     * Get authentication token
     */
    async getAuthToken(): Promise<string | null> {
        return SecureStorage.get('auth_token');
    },

    /**
     * Save refresh token
     */
    async saveRefreshToken(token: string): Promise<boolean> {
        return SecureStorage.save('refresh_token', token);
    },

    /**
     * Get refresh token
     */
    async getRefreshToken(): Promise<string | null> {
        return SecureStorage.get('refresh_token');
    },

    /**
     * Clear all tokens (logout)
     */
    async clearTokens(): Promise<boolean> {
        await SecureStorage.remove('auth_token');
        await SecureStorage.remove('refresh_token');
        return true;
    },

    /**
     * Check if user is authenticated
     */
    async isAuthenticated(): Promise<boolean> {
        const token = await this.getAuthToken();
        return !!token;
    },
};

/**
 * User data management
 */
export const UserDataManager = {
    /**
     * Save user data
     */
    async saveUserData(userData: any): Promise<boolean> {
        const jsonData = JSON.stringify(userData);
        return SecureStorage.save('user_data', jsonData);
    },

    /**
     * Get user data
     */
    async getUserData(): Promise<any | null> {
        const jsonData = await SecureStorage.get('user_data');
        if (!jsonData) return null;

        try {
            return JSON.parse(jsonData);
        } catch {
            return null;
        }
    },

    /**
     * Clear user data
     */
    async clearUserData(): Promise<boolean> {
        return SecureStorage.remove('user_data');
    },
};
