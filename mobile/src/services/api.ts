// src/services/api.ts
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, STORAGE_KEYS } from '../constants';
import { ApiResponse } from '../types';

class ApiClient {
  private instance: AxiosInstance;
  private retryCount = 0;
  private maxRetries = API_CONFIG.RETRY_ATTEMPTS;

  constructor() {
    this.instance = axios.create({
      baseURL: API_CONFIG.BASE_URL, // already normalized + logged in constants
      timeout: API_CONFIG.TIMEOUT,
      headers: { 'Content-Type': 'application/json' },
    });

    // Log outgoing requests (method, url, body)
    this.instance.interceptors.request.use(
      async (config) => {
        try {
          const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Error retrieving auth token:', error);
        }

        const fullUrl = `${config.baseURL ?? ''}${config.url ?? ''}`;
        console.log('[API ->]', (config.method ?? 'GET').toUpperCase(), fullUrl, config.data ?? '');
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Handle responses, refresh, retries; log failures precisely
    this.instance.interceptors.response.use(
      (response) => {
        this.retryCount = 0;
        console.log('[API <-]', response.status, response.config.url);
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest: any = error.config || {};
        const fullUrl = `${originalRequest.baseURL ?? ''}${originalRequest.url ?? ''}`;

        if (error.response) {
          console.log('[API x]', error.response.status, fullUrl, error.response.data);
        } else if (error.request) {
          console.log('[API x] No response from', fullUrl, 'code=', (error as any).code);
        } else {
          console.log('[API x] Config error:', error.message);
        }

        // 401 refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
            if (refreshToken) {
              const res = await axios.post(`${API_CONFIG.BASE_URL}/auth/refresh`, { refreshToken });
              const { accessToken } = res.data;
              await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, accessToken);
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.instance(originalRequest);
            }
          } catch (refreshError) {
            await this.clearAuth();
            throw refreshError;
          }
        }

        // Retry on network errors
        if (!error.response && this.retryCount < this.maxRetries) {
          this.retryCount++;
          await new Promise((r) =>
            setTimeout(r, API_CONFIG.RETRY_DELAY * Math.pow(2, this.retryCount - 1))
          );
          return this.instance(originalRequest);
        }

        return Promise.reject(error);
      }
    );
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig)
    : Promise<AxiosResponse<ApiResponse<T>>> {
    return this.instance.get<ApiResponse<T>>(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig)
    : Promise<AxiosResponse<ApiResponse<T>>> {
    return this.instance.post<ApiResponse<T>>(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig)
    : Promise<AxiosResponse<ApiResponse<T>>> {
    return this.instance.put<ApiResponse<T>>(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig)
    : Promise<AxiosResponse<ApiResponse<T>>> {
    return this.instance.delete<ApiResponse<T>>(url, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig)
    : Promise<AxiosResponse<ApiResponse<T>>> {
    return this.instance.patch<ApiResponse<T>>(url, data, config);
  }

  async uploadFile<T = any>(
    url: string,
    file: { uri: string; name: string; type: string },
    additionalData?: Record<string, any>
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    const formData = new FormData();
    formData.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
    if (additionalData) {
      Object.entries(additionalData).forEach(([k, v]) => formData.append(k, v as any));
    }
    return this.instance.post<ApiResponse<T>>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  private async clearAuth() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
      ]);
    } catch (error) {
      console.error('Error clearing auth:', error);
    }
  }

  getInstance(): AxiosInstance {
    return this.instance;
  }
}

export const apiClient = new ApiClient();
