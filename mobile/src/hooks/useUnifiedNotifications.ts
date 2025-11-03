import { useEffect, useState } from 'react';
import { expoNotificationsService } from '../services/expoNotificationsService';
import { oneSignalService } from '../services/oneSignalService';
import Constants from 'expo-constants';

/**
 * Unified Notifications Hook
 * Uses Expo by default, falls back to OneSignal when configured
 *
 * Environment variables (add to app.json):
 * - ONESIGNAL_APP_ID: Your OneSignal App ID
 * - ONESIGNAL_REST_API_KEY: Your OneSignal REST API Key
 */

export function useUnifiedNotifications() {
  const [isReady, setIsReady] = useState(false);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [notificationProvider, setNotificationProvider] = useState<'expo' | 'onesignal'>('expo');

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      // Check if OneSignal is configured
      const appConfig = Constants.expoConfig?.extra;
      const oneSignalAppId = appConfig?.ONESIGNAL_APP_ID;
      const oneSignalRestKey = appConfig?.ONESIGNAL_REST_API_KEY;

      if (oneSignalAppId && oneSignalRestKey && oneSignalAppId !== 'YOUR_ONESIGNAL_APP_ID') {
        // Use OneSignal if configured
        try {
          const success = await oneSignalService.initialize({
            appId: oneSignalAppId,
            restApiKey: oneSignalRestKey,
          });

          if (success) {
            setNotificationProvider('onesignal');
            setIsReady(true);
            setHasPermission(true);
            console.log('✓ Using OneSignal for notifications');
            return;
          }
        } catch (error) {
          console.warn('OneSignal initialization failed, falling back to Expo:', error);
        }
      }

      // Default: Use Expo
      const expoReady = await expoNotificationsService.initialize();
      setIsReady(expoReady);
      setDeviceToken(expoNotificationsService.getDeviceToken());
      setHasPermission(expoReady);
      setNotificationProvider('expo');
      console.log('✓ Using Expo for notifications');
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      setIsReady(false);
    }
  };

  const requestPermissions = async () => {
    if (notificationProvider === 'onesignal') {
      setHasPermission(true);
      return true;
    }

    const granted = await expoNotificationsService.requestPermissions();
    setHasPermission(granted);
    return granted;
  };

  const sendLocalNotification = (title: string, body: string, data?: any) => {
    if (notificationProvider === 'expo') {
      expoNotificationsService.sendLocalNotification({
        title,
        body,
        data,
      });
    } else {
      console.log('OneSignal: Local notifications use sendNotificationToSegment instead');
    }
  };

  const scheduleNotification = (
    title: string,
    body: string,
    delaySeconds: number,
    data?: any
  ) => {
    if (notificationProvider === 'expo') {
      expoNotificationsService.scheduleNotification(
        {
          title,
          body,
          data,
        },
        delaySeconds
      );
    } else {
      console.log('OneSignal: Use scheduleNotificationAsync instead');
    }
  };

  const sendToSegment = async (
    segment: string,
    message: { title: string; content: string; data?: Record<string, string> }
  ) => {
    if (notificationProvider === 'onesignal') {
      return oneSignalService.sendNotificationToSegment(segment, message);
    } else {
      console.log('OneSignal feature not available with Expo');
    }
  };

  const sendToUsers = async (
    userIds: string[],
    message: { title: string; content: string; data?: Record<string, string> }
  ) => {
    if (notificationProvider === 'onesignal') {
      return oneSignalService.sendNotificationViaAPI(userIds, message);
    } else {
      console.log('OneSignal feature not available with Expo');
    }
  };

  const onNotification = (callback: (notification: any) => void) => {
    if (notificationProvider === 'expo') {
      return expoNotificationsService.onNotification(callback);
    }
    return () => {}; // No-op for OneSignal
  };

  return {
    isReady,
    deviceToken,
    hasPermission,
    notificationProvider,
    requestPermissions,
    sendLocalNotification,
    scheduleNotification,
    sendToSegment,
    sendToUsers,
    onNotification,
  };
}
