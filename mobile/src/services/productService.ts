/**
 * Product Management Service
 * Handles product creation, updates, and listing operations
 */

import { Product, TemplateProduct, CourseProduct, PlanProduct, ExclusiveContentProduct, ProductReview } from '../types/product';

class ProductService {
  private apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

  /**
   * Create a new product
   */
  async createProduct(sellerId: string, productData: Partial<Product>): Promise<Product> {
    try {
      const response = await fetch(`${this.apiUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({
          sellerId,
          ...productData,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  /**
   * Get product details
   */
  async getProduct(productId: string): Promise<Product> {
    try {
      const response = await fetch(`${this.apiUrl}/products/${productId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  }

  /**
   * Update product
   */
  async updateProduct(productId: string, updates: Partial<Product>): Promise<Product> {
    try {
      const response = await fetch(`${this.apiUrl}/products/${productId}`, {
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
      console.error('Error updating product:', error);
      throw error;
    }
  }

  /**
   * Get seller products
   */
  async getSellerProducts(
    sellerId: string,
    status?: string,
    type?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ products: Product[]; total: number }> {
    try {
      const params = new URLSearchParams();
      params.append('sellerId', sellerId);
      if (status) params.append('status', status);
      if (type) params.append('type', type);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await fetch(`${this.apiUrl}/products?${params.toString()}`, {
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
      console.error('Error fetching seller products:', error);
      throw error;
    }
  }

  /**
   * Publish product
   */
  async publishProduct(productId: string): Promise<Product> {
    try {
      const response = await fetch(`${this.apiUrl}/products/${productId}/publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error publishing product:', error);
      throw error;
    }
  }

  /**
   * Unpublish product
   */
  async unpublishProduct(productId: string): Promise<Product> {
    try {
      const response = await fetch(`${this.apiUrl}/products/${productId}/unpublish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error unpublishing product:', error);
      throw error;
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(productId: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.apiUrl}/products/${productId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  /**
   * Upload product image
   */
  async uploadProductImage(productId: string, imageFile: File, type: 'thumbnail' | 'preview'): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('type', type);

      const response = await fetch(`${this.apiUrl}/products/${productId}/images`, {
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
      console.error('Error uploading product image:', error);
      throw error;
    }
  }

  /**
   * Upload course video
   */
  async uploadCourseVideo(lessonId: string, videoFile: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', videoFile);

      const response = await fetch(`${this.apiUrl}/lessons/${lessonId}/video`, {
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
      console.error('Error uploading video:', error);
      throw error;
    }
  }

  /**
   * Get product reviews
   */
  async getProductReviews(productId: string, page: number = 1): Promise<{ reviews: ProductReview[]; total: number }> {
    try {
      const response = await fetch(`${this.apiUrl}/products/${productId}/reviews?page=${page}`, {
        method: 'GET',
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
   * Submit product review
   */
  async submitReview(productId: string, buyerId: string, rating: number, reviewText: string): Promise<ProductReview> {
    try {
      const response = await fetch(`${this.apiUrl}/products/${productId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({
          buyerId,
          rating,
          reviewText,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting review:', error);
      throw error;
    }
  }

  /**
   * Search products
   */
  async searchProducts(
    query: string,
    filters?: {
      type?: string;
      category?: string;
      priceMin?: number;
      priceMax?: number;
      rating?: number;
      seller?: string;
    },
    page: number = 1
  ): Promise<{ products: Product[]; total: number }> {
    try {
      const params = new URLSearchParams();
      params.append('q', query);
      params.append('page', page.toString());

      if (filters) {
        if (filters.type) params.append('type', filters.type);
        if (filters.category) params.append('category', filters.category);
        if (filters.priceMin) params.append('priceMin', filters.priceMin.toString());
        if (filters.priceMax) params.append('priceMax', filters.priceMax.toString());
        if (filters.rating) params.append('rating', filters.rating.toString());
        if (filters.seller) params.append('seller', filters.seller);
      }

      const response = await fetch(`${this.apiUrl}/products/search?${params.toString()}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  /**
   * Get trending products
   */
  async getTrendingProducts(limit: number = 10): Promise<Product[]> {
    try {
      const response = await fetch(`${this.apiUrl}/products/trending?limit=${limit}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching trending products:', error);
      throw error;
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category: string, page: number = 1): Promise<{ products: Product[]; total: number }> {
    try {
      const response = await fetch(`${this.apiUrl}/products/category/${category}?page=${page}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching products by category:', error);
      throw error;
    }
  }

  /**
   * Helper: Get auth token
   */
  private getAuthToken(): string {
    return localStorage.getItem('authToken') || '';
  }
}

export default ProductService;
