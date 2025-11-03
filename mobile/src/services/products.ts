import { apiClient } from './api';
import { Product, Order, CartItem } from '../types/index';

export const productsService = {
  // Get products
  async getProducts(
    page: number = 1,
    pageSize: number = 20,
    filters?: { search?: string; brandId?: string; minPrice?: number; maxPrice?: number }
  ): Promise<{ products: Product[]; total: number; hasMore: boolean }> {
    try {
      const params = { page, pageSize, ...filters };
      const response = await apiClient.get<any>(
        `/products`,
        { params }
      );
      const data = response.data.data;
      return {
        products: data.items || [],
        total: data.total || 0,
        hasMore: data.hasMore || false,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Search products
  async searchProducts(
    query: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ products: Product[]; total: number; hasMore: boolean }> {
    try {
      const response = await apiClient.get<any>(
        `/products/search`,
        { params: { q: query, page, pageSize } }
      );
      const data = response.data.data;
      return {
        products: data.items || [],
        total: data.total || 0,
        hasMore: data.hasMore || false,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get single product
  async getProduct(productId: string): Promise<Product> {
    try {
      const response = await apiClient.get<Product>(
        `/products/${productId}`
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get featured products
  async getFeaturedProducts(limit: number = 10): Promise<Product[]> {
    try {
      const response = await apiClient.get<Product[]>(
        `/products/featured`,
        { params: { limit } }
      );
      return response.data.data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get product reviews
  async getProductReviews(
    productId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<any[]> {
    try {
      const response = await apiClient.get<any>(
        `/products/${productId}/reviews`,
        { params: { page, pageSize } }
      );
      return response.data.data?.items || [];
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Add product review
  async addReview(
    productId: string,
    reviewData: {
      rating: number;
      title: string;
      comment: string;
    }
  ): Promise<any> {
    try {
      const response = await apiClient.post(
        `/products/${productId}/reviews`,
        reviewData
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get user orders
  async getOrders(
    userId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ orders: Order[]; total: number; hasMore: boolean }> {
    try {
      const response = await apiClient.get<any>(
        `/users/${userId}/orders`,
        { params: { page, pageSize } }
      );
      const data = response.data.data;
      return {
        orders: data.items || [],
        total: data.total || 0,
        hasMore: data.hasMore || false,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get single order
  async getOrder(orderId: string): Promise<Order> {
    try {
      const response = await apiClient.get<Order>(
        `/orders/${orderId}`
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Create order
  async createOrder(
    userId: string,
    orderData: {
      items: CartItem[];
      shippingAddress: any;
      paymentMethod: string;
    }
  ): Promise<Order> {
    try {
      const response = await apiClient.post<Order>(
        `/users/${userId}/orders`,
        orderData
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Cancel order
  async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    try {
      const response = await apiClient.put<Order>(
        `/orders/${orderId}`,
        { status: 'CANCELLED', cancelReason: reason }
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get deals
  async getDeals(page: number = 1, pageSize: number = 20): Promise<Product[]> {
    try {
      const response = await apiClient.get<any>(
        `/deals`,
        { params: { page, pageSize } }
      );
      return response.data.data?.items || [];
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get brands
  async getBrands(page: number = 1, pageSize: number = 20): Promise<any[]> {
    try {
      const response = await apiClient.get<any>(
        `/brands`,
        { params: { page, pageSize } }
      );
      return response.data.data?.items || [];
    } catch (error) {
      throw this.handleError(error);
    }
  },  handleError(error: any): Error {
    if (error.response?.data?.error) {
      return new Error(error.response.data.error);
    }
    return new Error('Product operation failed');
  },
};
