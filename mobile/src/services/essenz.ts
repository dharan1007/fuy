import { apiClient } from './api';
import { Essenz, EssenzNode } from '../types/index';

export const essenzService = {
  // Get all essenz goals
  async getGoals(
    userId: string,
    status?: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ goals: Essenz[]; total: number; hasMore: boolean }> {
    try {
      const response = await apiClient.get<any>(
        `/users/${userId}/essenz`,
        { params: { status, page, pageSize } }
      );
      const data = response.data.data;
      return {
        goals: data.items || [],
        total: data.total || 0,
        hasMore: data.hasMore || false,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get single essenz goal
  async getGoal(goalId: string): Promise<Essenz> {
    try {
      const response = await apiClient.get<Essenz>(
        `/essenz/${goalId}`
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Create essenz goal
  async createGoal(
    userId: string,
    goalData: {
      title: string;
      description?: string;
      status?: string;
    }
  ): Promise<Essenz> {
    try {
      const response = await apiClient.post<Essenz>(
        `/users/${userId}/essenz`,
        goalData
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Update essenz goal
  async updateGoal(
    goalId: string,
    goalData: Partial<Essenz>
  ): Promise<Essenz> {
    try {
      const response = await apiClient.put<Essenz>(
        `/essenz/${goalId}`,
        goalData
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Delete essenz goal
  async deleteGoal(goalId: string): Promise<void> {
    try {
      await apiClient.delete(`/essenz/${goalId}`);
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Add node to essenz
  async addNode(
    goalId: string,
    node: Partial<EssenzNode>
  ): Promise<EssenzNode> {
    try {
      const response = await apiClient.post<EssenzNode>(
        `/essenz/${goalId}/nodes`,
        node
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Update node
  async updateNode(
    goalId: string,
    nodeId: string,
    nodeData: Partial<EssenzNode>
  ): Promise<EssenzNode> {
    try {
      const response = await apiClient.put<EssenzNode>(
        `/essenz/${goalId}/nodes/${nodeId}`,
        nodeData
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Delete node
  async deleteNode(goalId: string, nodeId: string): Promise<void> {
    try {
      await apiClient.delete(`/essenz/${goalId}/nodes/${nodeId}`);
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get steps for a goal
  async getSteps(goalId: string): Promise<EssenzNode[]> {
    try {
      const response = await apiClient.get<EssenzNode[]>(
        `/essenz/${goalId}/steps`
      );
      return response.data.data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get todos for a goal
  async getTodos(goalId: string): Promise<any[]> {
    try {
      const response = await apiClient.get<any[]>(
        `/essenz/${goalId}/todos`
      );
      return response.data.data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Mark goal as completed
  async completeGoal(goalId: string): Promise<Essenz> {
    try {
      const response = await apiClient.put<Essenz>(
        `/essenz/${goalId}`,
        { status: 'COMPLETED' }
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Pause goal
  async pauseGoal(goalId: string): Promise<Essenz> {
    try {
      const response = await apiClient.put<Essenz>(
        `/essenz/${goalId}`,
        { status: 'PAUSED' }
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Resume goal
  async resumeGoal(goalId: string): Promise<Essenz> {
    try {
      const response = await apiClient.put<Essenz>(
        `/essenz/${goalId}`,
        { status: 'ACTIVE' }
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },  handleError(error: any): Error {
    if (error.response?.data?.error) {
      return new Error(error.response.data.error);
    }
    return new Error('Essenz operation failed');
  },
};
