/**
 * Seller Management Service
 * Handles seller account creation, store management, and seller-related operations
 */

import { SellerProfile, StoreAnalytics, WithdrawalRequest, Commission } from '../types/seller';
import { Order } from '../types/payment';

class SellerService {
  private apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

  /**
   * Create a new seller account
   */
  async createSellerProfile(userId: string, sellerData: Partial<SellerProfile>): Promise<SellerProfile> {
    try {
      const response = await fetch(`${this.apiUrl}/sellers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({
          userId,
          ...sellerData,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating seller profile:', error);
      throw error;
    }
  }

  /**
   * Get seller profile
   */
  async getSellerProfile(sellerId: string): Promise<SellerProfile> {
    try {
      const response = await fetch(`${this.apiUrl}/sellers/${sellerId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching seller profile:', error);
      throw error;
    }
  }

  /**
   * Update seller profile
   */
  async updateSellerProfile(sellerId: string, updates: Partial<SellerProfile>): Promise<SellerProfile> {
    try {
      const response = await fetch(`${this.apiUrl}/sellers/${sellerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating seller profile:', error);
      throw error;
    }
  }

  /**
   * Upload store logo
   */
  async uploadStoreLogo(sellerId: string, imageFile: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('type', 'logo');

      const response = await fetch(`${this.apiUrl}/sellers/${sellerId}/media`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Error uploading store logo:', error);
      throw error;
    }
  }

  /**
   * Upload store banner
   */
  async uploadStoreBanner(sellerId: string, imageFile: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('type', 'banner');

      const response = await fetch(`${this.apiUrl}/sellers/${sellerId}/media`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Error uploading store banner:', error);
      throw error;
    }
  }

  /**
   * Get store analytics
   */
  async getStoreAnalytics(sellerId: string, period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<StoreAnalytics> {
    try {
      const response = await fetch(`${this.apiUrl}/sellers/${sellerId}/analytics?period=${period}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    }
  }

  /**
   * Get seller orders
   */
  async getSellerOrders(sellerId: string, page: number = 1, limit: number = 20): Promise<{ orders: Order[]; total: number }> {
    try {
      const response = await fetch(`${this.apiUrl}/sellers/${sellerId}/orders?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  /**
   * Get seller earnings
   */
  async getSellerEarnings(
    sellerId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ totalEarnings: number; pendingEarnings: number; breakdown: any }> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`${this.apiUrl}/sellers/${sellerId}/earnings?${params.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching earnings:', error);
      throw error;
    }
  }

  /**
   * Request withdrawal
   */
  async requestWithdrawal(sellerId: string, amount: number): Promise<WithdrawalRequest> {
    try {
      const response = await fetch(`${this.apiUrl}/sellers/${sellerId}/withdrawals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      throw error;
    }
  }

  /**
   * Get withdrawal history
   */
  async getWithdrawalHistory(sellerId: string, page: number = 1): Promise<WithdrawalRequest[]> {
    try {
      const response = await fetch(`${this.apiUrl}/sellers/${sellerId}/withdrawals?page=${page}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching withdrawal history:', error);
      throw error;
    }
  }

  /**
   * Get seller commission rates
   */
  async getCommissionRates(sellerId: string): Promise<Commission[]> {
    try {
      const response = await fetch(`${this.apiUrl}/sellers/${sellerId}/commissions`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching commission rates:', error);
      throw error;
    }
  }

  /**
   * Get seller reviews and ratings
   */
  async getSellerReviews(sellerId: string, page: number = 1): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/sellers/${sellerId}/reviews?page=${page}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching reviews:', error);
      throw error;
    }
  }

  /**
   * Verify seller KYC
   */
  async verifyKYC(sellerId: string, kycData: any): Promise<{ status: string; message: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/sellers/${sellerId}/kyc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify(kycData),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error verifying KYC:', error);
      throw error;
    }
  }

  /**
   * Get seller statistics summary
   */
  async getSellerStats(sellerId: string): Promise<{
    totalProducts: number;
    totalSales: number;
    totalEarnings: number;
    averageRating: number;
    totalReviews: number;
    activeListings: number;
  }> {
    try {
      const response = await fetch(`${this.apiUrl}/sellers/${sellerId}/stats`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  }

  /**
   * Check if store slug is available
   */
  async checkSlugAvailability(slug: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/sellers/check-slug/${slug}`, {
        method: 'GET',
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.available;
    } catch (error) {
      console.error('Error checking slug availability:', error);
      return false;
    }
  }

  /**
   * Get public store profile
   */
  async getPublicStoreProfile(storeSlug: string): Promise<Partial<SellerProfile> & { products: any[] }> {
    try {
      const response = await fetch(`${this.apiUrl}/stores/${storeSlug}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching public store profile:', error);
      throw error;
    }
  }

  /**
   * Helper: Get auth token from localStorage
   */
  private getAuthToken(): string {
    return localStorage.getItem('authToken') || '';
  }
}

export default SellerService;
