import { apiClient } from './api';
import { Place, PlaceReview, RouteWaypoint } from '../types/index';

export const placesService = {
  // Get user places
  async getPlaces(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ places: Place[]; total: number; hasMore: boolean }> {
    try {
      const response = await apiClient.get<any>(
        `/users/${userId}/places`,
        { params: { page, pageSize } }
      );
      const data = response.data.data;
      return {
        places: data.items || [],
        total: data.total || 0,
        hasMore: data.hasMore || false,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get single place
  async getPlace(placeId: string): Promise<Place> {
    try {
      const response = await apiClient.get<Place>(
        `/places/${placeId}`
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Create place
  async createPlace(
    userId: string,
    placeData: {
      title: string;
      latitude: number;
      longitude: number;
      address?: string;
      photos?: string[];
    }
  ): Promise<Place> {
    try {
      const response = await apiClient.post<Place>(
        `/users/${userId}/places`,
        placeData
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Update place
  async updatePlace(
    placeId: string,
    placeData: Partial<Place>
  ): Promise<Place> {
    try {
      const response = await apiClient.put<Place>(
        `/places/${placeId}`,
        placeData
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Delete place
  async deletePlace(placeId: string): Promise<void> {
    try {
      await apiClient.delete(`/places/${placeId}`);
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Add photo to place
  async addPhoto(
    placeId: string,
    photo: {
      uri: string;
      name: string;
      type: string;
    }
  ): Promise<Place> {
    try {
      const response = await apiClient.uploadFile<Place>(
        `/places/${placeId}/photos`,
        photo
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get place reviews
  async getPlaceReviews(
    placeId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ reviews: PlaceReview[]; total: number; hasMore: boolean }> {
    try {
      const response = await apiClient.get<any>(
        `/places/${placeId}/reviews`,
        { params: { page, pageSize } }
      );
      const data = response.data.data;
      return {
        reviews: data.items || [],
        total: data.total || 0,
        hasMore: data.hasMore || false,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Add review to place
  async addReview(
    placeId: string,
    reviewData: {
      rating: number;
      comment?: string;
    }
  ): Promise<PlaceReview> {
    try {
      const response = await apiClient.post<PlaceReview>(
        `/places/${placeId}/reviews`,
        reviewData
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Delete review
  async deleteReview(placeId: string, reviewId: string): Promise<void> {
    try {
      await apiClient.delete(`/places/${placeId}/reviews/${reviewId}`);
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get awe routes
  async getRoutes(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<any[]> {
    try {
      const response = await apiClient.get<any>(
        `/users/${userId}/routes`,
        { params: { page, pageSize } }
      );
      return response.data.data?.items || [];
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Create route
  async createRoute(
    userId: string,
    routeData: {
      title: string;
      description?: string;
      waypoints: Partial<RouteWaypoint>[];
    }
  ): Promise<any> {
    try {
      const response = await apiClient.post(
        `/users/${userId}/routes`,
        routeData
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get nearby places
  async getNearbyPlaces(
    latitude: number,
    longitude: number,
    radius: number = 5 // km
  ): Promise<Place[]> {
    try {
      const response = await apiClient.get<Place[]>(
        `/places/nearby`,
        { params: { latitude, longitude, radius } }
      );
      return response.data.data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Search places
  async searchPlaces(
    query: string,
    latitude?: number,
    longitude?: number
  ): Promise<Place[]> {
    try {
      const params: any = { q: query };
      if (latitude && longitude) {
        params.latitude = latitude;
        params.longitude = longitude;
      }

      const response = await apiClient.get<Place[]>(
        `/places/search`,
        { params }
      );
      return response.data.data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  },  handleError(error: any): Error {
    if (error.response?.data?.error) {
      return new Error(error.response.data.error);
    }
    return new Error('Places operation failed');
  },
};
