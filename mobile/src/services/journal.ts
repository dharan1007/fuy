import { apiClient } from './api';
import { JournalEntry, JournalBlock } from '../types/index';

export const journalService = {
  // Get all journal entries for user
  async getEntries(
    userId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ entries: JournalEntry[]; total: number; hasMore: boolean }> {
    try {
      const response = await apiClient.get<any>(
        `/users/${userId}/journal`,
        { params: { page, pageSize } }
      );
      const data = response.data.data;
      return {
        entries: data.items || [],
        total: data.total || 0,
        hasMore: data.hasMore || false,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get single journal entry
  async getEntry(entryId: string): Promise<JournalEntry> {
    try {
      const response = await apiClient.get<JournalEntry>(
        `/journal/${entryId}`
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Create journal entry
  async createEntry(
    userId: string,
    entryData: {
      content: string;
      blocks: JournalBlock[];
      mood?: string;
      tags?: string[];
    }
  ): Promise<JournalEntry> {
    try {
      const response = await apiClient.post<JournalEntry>(
        `/users/${userId}/journal`,
        entryData
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Update journal entry
  async updateEntry(
    entryId: string,
    entryData: Partial<JournalEntry>
  ): Promise<JournalEntry> {
    try {
      const response = await apiClient.put<JournalEntry>(
        `/journal/${entryId}`,
        entryData
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Delete journal entry
  async deleteEntry(entryId: string): Promise<void> {
    try {
      await apiClient.delete(`/journal/${entryId}`);
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Add block to entry
  async addBlock(
    entryId: string,
    block: JournalBlock
  ): Promise<JournalEntry> {
    try {
      const response = await apiClient.post<JournalEntry>(
        `/journal/${entryId}/blocks`,
        block
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Remove block from entry
  async removeBlock(entryId: string, blockId: string): Promise<JournalEntry> {
    try {
      const response = await apiClient.delete<JournalEntry>(
        `/journal/${entryId}/blocks/${blockId}`
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Get journal templates
  async getTemplates(userId: string): Promise<any[]> {
    try {
      const response = await apiClient.get<any[]>(
        `/users/${userId}/journal/templates`
      );
      return response.data.data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Create journal entry from template
  async createFromTemplate(
    userId: string,
    templateId: string,
    templateData: any
  ): Promise<JournalEntry> {
    try {
      const response = await apiClient.post<JournalEntry>(
        `/users/${userId}/journal/from-template/${templateId}`,
        templateData
      );
    return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  },  handleError(error: any): Error {
    if (error.response?.data?.error) {
      return new Error(error.response.data.error);
    }
    return new Error('Journal operation failed');
  },
};
