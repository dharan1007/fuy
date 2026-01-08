import { TokenManager } from './secure-storage';
import CryptoJS from 'crypto-js';
import NetInfo from '@react-native-community/netinfo';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://fuy.vercel.app';
const API_SECRET = process.env.EXPO_PUBLIC_API_SECRET || 'default-secret';

/**
 * Generate request signature for API security
 */
function generateSignature(
    method: string,
    path: string,
    timestamp: string,
    body: string
): string {
    const message = `${method}${path}${timestamp}${body}`;
    return CryptoJS.HmacSHA256(message, API_SECRET).toString(CryptoJS.enc.Hex);
}

/**
 * Secure API client with request signing and auto-retry
 */
export class ApiClient {
    private static instance: ApiClient;

    private constructor() { }

    static getInstance(): ApiClient {
        if (!ApiClient.instance) {
            ApiClient.instance = new ApiClient();
        }
        return ApiClient.instance;
    }

    /**
     * Check if device is online
     */
    async isOnline(): Promise<boolean> {
        const state = await NetInfo.fetch();
        return state.isConnected ?? false;
    }

    /**
     * Make authenticated API request
     */
    async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<{ data?: T; error?: string }> {
        try {
            // Check network connectivity
            if (!(await this.isOnline())) {
                return { error: 'No internet connection' };
            }

            // Get auth token
            const token = await TokenManager.getAuthToken();

            // Prepare headers
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
                ...options.headers,
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Add request signature for security
            const timestamp = Math.floor(Date.now() / 1000).toString();
            const body = options.body ? String(options.body) : '';
            const signature = generateSignature(
                options.method || 'GET',
                endpoint,
                timestamp,
                body
            );

            headers['x-signature'] = signature;
            headers['x-timestamp'] = timestamp;

            // Make request
            console.log('Fetching:', `${API_URL}${endpoint}`);
            console.log('Headers:', JSON.stringify(headers));

            const response = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers,
            });

            // Handle 401 - token might be expired
            if (response.status === 401) {
                await TokenManager.clearTokens();
                return { error: 'Session expired. Please login again.' };
            }

            // Parse response
            const data = await response.json();

            if (!response.ok) {
                return { error: data.error || 'Request failed' };
            }

            return { data };
        } catch (error) {
            console.error('API request error:', error);
            return { error: 'Network error. Please try again.' };
        }
    }

    /**
     * GET request
     */
    async get<T>(endpoint: string): Promise<{ data?: T; error?: string }> {
        return this.request<T>(endpoint, { method: 'GET' });
    }

    /**
     * POST request
     */
    async post<T>(
        endpoint: string,
        body: any
    ): Promise<{ data?: T; error?: string }> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    /**
     * PUT request
     */
    async put<T>(
        endpoint: string,
        body: any
    ): Promise<{ data?: T; error?: string }> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    /**
     * DELETE request
     */
    async delete<T>(endpoint: string): Promise<{ data?: T; error?: string }> {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }

    /**
     * Upload file with multipart/form-data
     */
    async uploadFile<T>(
        endpoint: string,
        file: { uri: string; name: string; type: string }
    ): Promise<{ data?: T; error?: string }> {
        try {
            if (!(await this.isOnline())) {
                return { error: 'No internet connection' };
            }

            const token = await TokenManager.getAuthToken();

            const formData = new FormData();
            formData.append('file', {
                uri: file.uri,
                name: file.name,
                type: file.type,
            } as any);

            const headers: HeadersInit = {
                'Content-Type': 'multipart/form-data',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers,
                body: formData,
            });

            if (response.status === 401) {
                await TokenManager.clearTokens();
                return { error: 'Session expired. Please login again.' };
            }

            const data = await response.json();

            if (!response.ok) {
                return { error: data.error || 'Upload failed' };
            }

            return { data };
        } catch (error) {
            console.error('File upload error:', error);
            return { error: 'Upload error. Please try again.' };
        }
    }
}

// Export singleton instance
export const api = ApiClient.getInstance();
