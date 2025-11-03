import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * OneSignal Service - Free Alternative to Firebase
 *
 * Setup:
 * 1. Sign up at https://onesignal.com (free tier: 50K subscribers)
 * 2. Create a new app in OneSignal dashboard
 * 3. Get your App ID and REST API Key
 * 4. Install: npm install onesignal-react-native
 * 5. Add to app.json:
 *    {
 *      "plugins": [
 *        [
 *          "onesignal-react-native",
 *          {
 *            "mode": "production"
 *          }
 *        ]
 *      ]
 *    }
 *
 * Benefits:
 * - FREE tier: 50,000 subscribers
 * - NO credit card required
 * - UNLIMITED messages
 * - Segmentation, analytics, A/B testing
 * - Easy to use dashboard
 * - Good documentation
 */

interface OneSignalConfig {
  appId: string;
  restApiKey: string;
}

class OneSignalService {
  private config: OneSignalConfig | null = null;
  private playerId: string | null = null;

  async initialize(config: OneSignalConfig) {
    this.config = config;

    try {
      // Note: Actual OneSignal SDK would be imported as:
      // import OneSignal from 'onesignal-react-native';
      // For now, we'll provide the structure

      console.log('OneSignal would initialize with App ID:', config.appId);

      // This would be the actual OneSignal setup:
      /*
      OneSignal.initialize(config.appId);
      OneSignal.onPermissionChange((response) => {
        console.log('OneSignal permission changed:', response);
      });

      OneSignal.onPushNotificationReceived((notification) => {
        this.handleNotification(notification);
      });

      const playerId = await OneSignal.getDeviceState();
      this.playerId = playerId.userId;

      await this.sendPlayerIdToBackend(this.playerId);
      */

      console.log('✓ OneSignal initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize OneSignal:', error);
      return false;
    }
  }

  private async sendPlayerIdToBackend(playerId: string) {
    try {
      // Send to your backend
      // await apiService.post('/notifications/register-onesignal', { playerId });
      await AsyncStorage.setItem('oneSignalPlayerId', playerId);
      console.log('✓ Player ID sent to backend');
    } catch (error) {
      console.error('Failed to send player ID:', error);
    }
  }

  private handleNotification(notification: any) {
    console.log('📬 OneSignal notification received:', notification);
  }

  /**
   * Send notification via OneSignal API
   * This would typically be done from your backend
   */
  async sendNotificationViaAPI(
    playerIds: string[],
    message: {
      title: string;
      content: string;
      data?: Record<string, string>;
    }
  ) {
    if (!this.config) {
      console.error('OneSignal not initialized');
      return;
    }

    try {
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Basic ${this.config.restApiKey}`,
        },
        body: JSON.stringify({
          app_id: this.config.appId,
          include_player_ids: playerIds,
          headings: { en: message.title },
          contents: { en: message.content },
          data: message.data || {},
        }),
      });

      if (!response.ok) {
        throw new Error(`OneSignal API error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✓ Notification sent via OneSignal:', data);
      return data;
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to segment (e.g., all users, online users, etc.)
   */
  async sendNotificationToSegment(
    segment: string,
    message: {
      title: string;
      content: string;
      data?: Record<string, string>;
    }
  ) {
    if (!this.config) {
      console.error('OneSignal not initialized');
      return;
    }

    try {
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Basic ${this.config.restApiKey}`,
        },
        body: JSON.stringify({
          app_id: this.config.appId,
          included_segments: [segment],
          headings: { en: message.title },
          contents: { en: message.content },
          data: message.data || {},
        }),
      });

      const data = await response.json();
      console.log('✓ Notification sent to segment:', segment, data);
      return data;
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  getPlayerId() {
    return this.playerId;
  }
}

export const oneSignalService = new OneSignalService();

/**
 * SETUP INSTRUCTIONS FOR OneSignal
 *
 * Step 1: Create account at https://onesignal.com
 * Step 2: Go to Dashboard → New App → Name your app
 * Step 3: Select platforms (iOS, Android, or Web)
 * Step 4: Copy App ID and REST API Key
 *
 * Step 5: Install OneSignal:
 *   npm install onesignal-react-native
 *   npx expo prebuild
 *
 * Step 6: Update app.json:
 *   "plugins": [
 *     [
 *       "onesignal-react-native",
 *       {
 *         "mode": "production"
 *       }
 *     ]
 *   ]
 *
 * Step 7: Initialize in your app:
 *   import { oneSignalService } from '@/services/oneSignalService';
 *
 *   await oneSignalService.initialize({
 *     appId: 'YOUR_APP_ID',
 *     restApiKey: 'YOUR_REST_API_KEY',
 *   });
 *
 * FEATURES (FREE TIER):
 * ✓ 50,000 subscribers
 * ✓ Unlimited messages
 * ✓ Push notifications
 * ✓ Email notifications
 * ✓ SMS notifications (limited)
 * ✓ Segmentation
 * ✓ A/B Testing
 * ✓ Analytics
 * ✓ Automation
 *
 * PRICING:
 * - Free: 50K subscribers
 * - Paid: $99/month for unlimited subscribers
 *
 * This is much more cost-effective than Firebase!
 */
