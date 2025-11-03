import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export interface QueuedRequest {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  data?: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

const QUEUE_KEY = 'offline_queue';
const MAX_RETRIES = 3;

class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private isProcessing = false;

  async initialize() {
    await this.loadQueue();
    this.startMonitoring();
  }

  private async loadQueue() {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  }

  private async saveQueue() {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  async addRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'POST',
    data?: any
  ) {
    const request: QueuedRequest = {
      id: `${Date.now()}-${Math.random()}`,
      endpoint,
      method,
      data,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: MAX_RETRIES,
    };

    this.queue.push(request);
    await this.saveQueue();

    // Try to process immediately if online
    this.tryProcessQueue();
  }

  private startMonitoring() {
    NetInfo.addEventListener(async (state) => {
      if (state.isConnected && !this.isProcessing) {
        this.tryProcessQueue();
      }
    });
  }

  async tryProcessQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const state = await NetInfo.fetch();

    if (!state.isConnected) {
      this.isProcessing = false;
      return;
    }

    const processed: string[] = [];

    for (const request of this.queue) {
      try {
        // Retry logic would go here - call the actual API endpoint
        console.log(`Processing queued request: ${request.endpoint}`);

        // Mark as successfully processed
        processed.push(request.id);
      } catch (error) {
        console.error(`Failed to process request ${request.id}:`, error);
        request.retries++;

        // Remove if max retries exceeded
        if (request.retries >= request.maxRetries) {
          processed.push(request.id);
        }
      }
    }

    // Remove processed requests
    this.queue = this.queue.filter((r) => !processed.includes(r.id));
    await this.saveQueue();

    this.isProcessing = false;

    // Continue processing if there are more requests
    if (this.queue.length > 0) {
      setTimeout(() => this.tryProcessQueue(), 1000);
    }
  }

  async getQueueSize() {
    return this.queue.length;
  }

  async clearQueue() {
    this.queue = [];
    await AsyncStorage.removeItem(QUEUE_KEY);
  }

  getQueue() {
    return this.queue;
  }
}

export const offlineQueue = new OfflineQueue();
