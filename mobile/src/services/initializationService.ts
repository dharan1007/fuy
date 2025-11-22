import AsyncStorage from '@react-native-async-storage/async-storage';
import { webSocketService } from './webSocketService';
import { offlineQueue } from './offlineQueue';
import { expoNotificationsService } from './expoNotificationsService';

class InitializationService {
  async initialize() {
    console.log('Initializing app services...');

    try {
      // Initialize offline queue
      try {
        await offlineQueue.initialize();
        console.log('✓ Offline queue initialized');
      } catch (error) {
        console.warn('Offline queue initialization failed:', error);
      }

      // Initialize push notifications (Expo) - FREE!
      try {
        const notificationsReady = await expoNotificationsService.initialize();
        if (notificationsReady) {
          console.log('✓ Push notifications initialized (Expo)');
        } else {
          console.warn('Push notifications could not be initialized (might not be on physical device)');
        }
      } catch (error) {
        console.warn('Push notifications initialization failed:', error);
      }

      // Try to connect WebSocket if user is authenticated
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          try {
            await webSocketService.connect(token);
            console.log('✓ WebSocket connected');
          } catch (error) {
            console.warn('WebSocket connection failed, will retry later:', error);
          }
        }
      } catch (error) {
        console.warn('Failed to check auth token:', error);
      }

      console.log('✓ App services initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize app services:', error);
      // Don't throw - let the app continue even if some services fail
      return false;
    }
  }

  async cleanup() {
    console.log('Cleaning up app services...');
    try {
      webSocketService.disconnect();
      console.log('✓ WebSocket disconnected');
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  }

  setupAuthListener() {
    // This would be called when user logs in/out to manage WebSocket connection
    // Can be integrated with your auth flow
  }
}

export const initializationService = new InitializationService();
