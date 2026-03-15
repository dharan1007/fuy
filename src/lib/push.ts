import { supabaseAdmin } from "./supabase-admin";
import { logger } from "./logger";

interface PushMessage {
  to: string;
  sound?: string;
  title?: string;
  body?: string;
  data?: Record<string, any>;
}

/**
 * Retrieves the stored Expo push token(s) for a given user from Supabase.
 * @param userId The ID of the user to send the notification to.
 * @returns An array of push tokens registered to the user.
 */
export async function getUserPushTokens(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('UserPushToken')
      .select('token')
      .eq('userId', userId);

    if (error) {
      logger.error(`Error querying push tokens for user ${userId}:`, error);
      return [];
    }
    
    // Ensure tokens map to a clean array
    return data ? data.map(row => row.token).filter(Boolean) : [];
  } catch (err) {
    logger.error(`Failed to execute supabase Admin query for push tokens:`, err);
    return [];
  }
}

/**
 * Dispatches a push notification via the Expo Push API.
 * @param userId Recipient UUID.
 * @param title Bold header of the notification.
 * @param body Subtext of the notification.
 * @param data Optional payload to route navigation upon opening the app.
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {

  const tokens = await getUserPushTokens(userId);
  if (!tokens || tokens.length === 0) {
    // User hasn't registered a device/push token
    return;
  }

  const messages: PushMessage[] = [];
  for (let pushToken of tokens) {
    // Validate Expo Push Token superficially
    if (!pushToken.includes('ExponentPushToken')) {
      continue;
    }

    messages.push({
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data || {},
    });
  }

  if (messages.length === 0) {
    return;
  }

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
        logger.error(`Expo Push API rejected payload: ${response.statusText}`);
    }
  } catch (error) {
    logger.error('Error sending push notification via Expo SDK fetch:', error);
  }
}
