// import * as Notifications from 'expo-notifications';
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

interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, string>;
}

class ExpoNotificationsService {
  private deviceToken: string | null = null;
  private notificationListeners: Array<(notification: any) => void> = [];

  async initialize() {
    console.log('Notifications disabled to prevent crash');
    return false;
  }

  private async registerForPushNotifications() {
    return null;
  }

  private setupListeners() {
    return () => { };
  }

  private handleNotification(notification: any) {
    // No-op
  }

  private handleNotificationTap(response: any) {
    // No-op
  }

  private async sendTokenToBackend(token: string) {
    // No-op
  }

  async sendLocalNotification(data: NotificationData) {
    console.log('Local notification skipped:', data.title);
  }

  async scheduleNotification(
    data: NotificationData,
    delaySeconds: number
  ) {
    console.log('Notification scheduling skipped:', data.title);
  }

  async requestPermissions() {
    return false;
  }

  onNotification(callback: (notification: any) => void) {
    return () => { };
  }

  getDeviceToken() {
    return null;
  }

  async getAllScheduledNotifications() {
    return [];
  }

  async dismissAllNotifications() {
    // No-op
  }
}

export const expoNotificationsService = new ExpoNotificationsService();
