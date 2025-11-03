import AsyncStorage from '@react-native-async-storage/async-storage';
import { webSocketService } from './webSocketService';
import { offlineQueue } from './offlineQueue';
import { expoNotificationsService } from './expoNotificationsService';

class InitializationService {
  async initialize() {
    console.log('Initializing app services...');

    try {
      // Initialize offline queue
      await offlineQueue.initialize();
      console.log('✓ Offline queue initialized');

      // Initialize push notifications (Expo) - FREE!
      const notificationsReady = await expoNotificationsService.initialize();
      if (notificationsReady) {
        console.log('✓ Push notifications initialized (Expo)');
      } else {
        console.warn('Push notifications could not be initialized (might not be on physical device)');
      }

      // Try to connect WebSocket if user is authenticated
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        try {
          await webSocketService.connect(token);
          console.log('✓ WebSocket connected');
        } catch (error) {
          console.warn('WebSocket connection failed, will retry later:', error);
        }
      }

      console.log('✓ App services initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize app services:', error);
      return false;
    }
  }

  async cleanup() {
    console.log('Cleaning up app services...');
    webSocketService.disconnect();
    console.log('✓ WebSocket disconnected');
  }

  setupAuthListener() {
    // This would be called when user logs in/out to manage WebSocket connection
    // Can be integrated with your auth flow
  }
}

export const initializationService = new InitializationService();
