import { useEffect, useState } from 'react';
import { expoNotificationsService } from '../services/expoNotificationsService';

export function useNotifications() {
  const [isReady, setIsReady] = useState(false);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    const success = await expoNotificationsService.initialize();
    setIsReady(success);
    setDeviceToken(expoNotificationsService.getDeviceToken());
    setHasPermission(success);
  };

  const requestPermissions = async () => {
    const granted = await expoNotificationsService.requestPermissions();
    setHasPermission(granted);
    return granted;
  };

  const sendLocalNotification = (title: string, body: string, data?: any) => {
    expoNotificationsService.sendLocalNotification({
      title,
      body,
      data,
    });
  };

  const scheduleNotification = (
    title: string,
    body: string,
    delaySeconds: number,
    data?: any
  ) => {
    expoNotificationsService.scheduleNotification(
      {
        title,
        body,
        data,
      },
      delaySeconds
    );
  };

  const onNotification = (callback: (notification: any) => void) => {
    return expoNotificationsService.onNotification(callback);
  };

  return {
    isReady,
    deviceToken,
    hasPermission,
    requestPermissions,
    sendLocalNotification,
    scheduleNotification,
    onNotification,
  };
}
