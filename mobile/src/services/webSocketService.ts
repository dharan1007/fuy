import AsyncStorage from '@react-native-async-storage/async-storage';

const WS_BASE_URL = 'ws://localhost:3000';

type MessageHandler = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private isIntentionallyClosed = false;

  constructor() {
    this.url = WS_BASE_URL;
  }

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.isIntentionallyClosed = false;
        this.ws = new WebSocket(`${this.url}?token=${token}`);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          if (!this.isIntentionallyClosed) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(data: any) {
    const { type, payload } = data;

    // Emit to all listeners for this type
    const listeners = this.handlers.get(type) || [];
    listeners.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        console.error(`Error in WebSocket handler for ${type}:`, error);
      }
    });
  }

  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);

    // Return unsubscribe function
    return () => {
      const listeners = this.handlers.get(type) || [];
      const index = listeners.indexOf(handler);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  off(type: string, handler: MessageHandler) {
    const listeners = this.handlers.get(type) || [];
    const index = listeners.indexOf(handler);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  send(type: string, payload: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, queuing message');
      return;
    }

    try {
      this.ws.send(JSON.stringify({ type, payload }));
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
    }
  }

  private attemptReconnect() {
    if (this.isIntentionallyClosed || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          await this.connect(token);
        }
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.attemptReconnect();
      }
    }, delay);
  }

  disconnect() {
    this.isIntentionallyClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const webSocketService = new WebSocketService();

// Real-time event types
export const WS_EVENTS = {
  // Feed events
  NEW_POST: 'post:new',
  POST_REACTION: 'post:reaction',
  POST_DELETE: 'post:delete',

  // Message events
  NEW_MESSAGE: 'message:new',
  MESSAGE_SENT: 'message:sent',
  TYPING_START: 'typing:start',
  TYPING_END: 'typing:end',

  // Connection events
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',

  // Challenge events
  CHALLENGE_COMPLETED: 'challenge:completed',
  CHALLENGE_PROGRESS: 'challenge:progress',

  // Rank events
  RANK_UPDATE: 'rank:update',

  // Bonding/Friend Request events
  CONNECTION_REQUEST: 'connection:request',
  CONNECTION_ACCEPTED: 'connection:accepted',
  FRIEND_REQUEST_CREATED: 'friend:request:created',
  FRIEND_REQUEST_ACCEPTED: 'friend:request:accepted',
  FRIEND_REQUEST_REJECTED: 'friend:request:rejected',
  FRIEND_REQUEST_GHOSTED: 'friend:request:ghosted',
  FRIEND_REQUEST_UPDATED: 'friend:request:updated',

  // Notification events
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_DELETED: 'notification:deleted',
};
