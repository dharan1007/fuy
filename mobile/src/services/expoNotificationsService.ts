import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './apiService';

// Lazy load device info and Constants (may not be available in all environments)
let Device: any = null;
let Constants: any = null;

try {
  Device = require('expo-device');
} catch (e) {
  // Fallback
  Device = { isDevice: true, modelId: 'unknown' };
}

try {
  Constants = require('expo-constants').default;
} catch (e) {
  // Fallback
  Constants = { expoConfig: { extra: { eas: { projectId: null } } } };
}

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, string>;
}

class ExpoNotificationsService {
  private deviceToken: string | null = null;
  private notificationListeners: Array<(notification: any) => void> = [];

  async initialize() {
    try {
      // Check if device supports notifications
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return false;
      }

      // Register for push notifications
      this.deviceToken = await this.registerForPushNotifications();

      if (!this.deviceToken) {
        console.warn('Failed to get device token');
        return false;
      }

      console.log('✓ Expo notifications initialized');
      console.log('Device token:', this.deviceToken);

      // Save token to AsyncStorage
      await AsyncStorage.setItem('expoPushToken', this.deviceToken);

      // Setup notification listeners
      this.setupListeners();

      // Send token to backend
      await this.sendTokenToBackend(this.deviceToken);

      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  private async registerForPushNotifications() {
    try {
      // Get project ID
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        throw new Error('No project ID found. Make sure EAS is configured.');
      }

      // Get permission
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Failed to get push notification permissions');
        return null;
      }

      // Get token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      return token.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  private setupListeners() {
    // Listen for notifications while app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        this.notificationListeners.forEach((listener) => listener(notification));
        this.handleNotification(notification);
      }
    );

    // Listen for notification taps
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        this.handleNotificationTap(response);
      });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }

  private handleNotification(notification: any) {
    const { title, body, data } = notification.request.content;
    console.log('📬 Notification received:', { title, body, data });

    // Handle based on notification type
    if (data?.type === 'message') {
      // Handle new message
      console.log('New message from:', data?.senderName);
    } else if (data?.type === 'post') {
      // Handle new post
      console.log('New post:', data?.postId);
    } else if (data?.type === 'challenge') {
      // Handle challenge update
      console.log('Challenge update:', data?.challengeId);
    }
  }

  private handleNotificationTap(response: any) {
    const data = response.notification.request.content.data;
    console.log('📌 Notification tapped:', data);

    // Navigate based on notification type
    // This would be integrated with your navigation
    // Example: navigateToScreen(data.type, data.id)
  }

  private async sendTokenToBackend(token: string) {
    try {
      // Call your backend to store the token
      // This endpoint should be created on your backend
      await apiService.axiosInstance.post('/notifications/register-device', {
        token,
        platform: 'ios_android', // or 'ios' / 'android'
        deviceId: Device.modelId,
      });

      console.log('✓ Device token sent to backend');
    } catch (error) {
      console.error('Failed to send token to backend:', error);
      // Not critical - app can still work
    }
  }

  async sendLocalNotification(data: NotificationData) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: data.data || {},
          sound: 'default',
          badge: 1,
        },
        trigger: null, // Send immediately
      });

      console.log('✓ Local notification sent:', data.title);
    } catch (error) {
      console.error('Failed to send local notification:', error);
    }
  }

  async scheduleNotification(
    data: NotificationData,
    delaySeconds: number
  ) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: data.data || {},
          sound: 'default',
          badge: 1,
        },
        trigger: {
          seconds: delaySeconds,
        },
      });

      console.log(`✓ Notification scheduled for ${delaySeconds}s:`, data.title);
    } catch (error) {
      console.error('Failed to schedule notification:', error);
    }
  }

  async requestPermissions() {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  onNotification(callback: (notification: any) => void) {
    this.notificationListeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.notificationListeners.indexOf(callback);
      if (index > -1) {
        this.notificationListeners.splice(index, 1);
      }
    };
  }

  getDeviceToken() {
    return this.deviceToken;
  }

  async getAllScheduledNotifications() {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  async dismissAllNotifications() {
    try {
      await Notifications.dismissAllNotificationsAsync();
      console.log('✓ All notifications dismissed');
    } catch (error) {
      console.error('Failed to dismiss notifications:', error);
    }
  }
}

export const expoNotificationsService = new ExpoNotificationsService();
