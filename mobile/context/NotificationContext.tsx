import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { decryptMessage } from '../lib/encryption';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

interface NotificationContextType {
    expoPushToken: string | undefined;
}

const NotificationContext = createContext<NotificationContextType>({ expoPushToken: undefined });

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
    const { session } = useAuth();
    const router = useRouter();
    const segments = useSegments();
    const userId = session?.user?.id;
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>(undefined);
    const notificationListener = useRef<Notifications.Subscription | null>(null);
    const responseListener = useRef<Notifications.Subscription | null>(null);

    // Register for Push Notifications
    useEffect(() => {
        if (!userId) return;

        registerForPushNotificationsAsync().then(token => {
            setExpoPushToken(token);
            if (token) {
                savePushToken(userId, token);
            }
        });

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            // Handle foreground notification if needed, or let system handle it
            console.log('Foreground notification received:', notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            if (data?.conversationId) {
                // Navigate to chat
                console.log('Notification tapped, navigating to:', data.conversationId);
                // logic to navigate would go here, e.g. router.push(`/chat/${data.conversationId}`)
            }
        });

        return () => {
            if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
            if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
        };
    }, [userId]);

    const savePushToken = async (uid: string, token: string) => {
        try {
            const { error } = await supabase
                .from('UserPushToken')
                .upsert({ userId: uid, token: token, updatedAt: new Date().toISOString() }, { onConflict: 'token' });

            if (error) console.error('Error saving push token:', error);
            else console.log('Push token saved for user:', uid);
        } catch (e) {
            console.error('Exception saving push token:', e);
        }
    };

    // Keep Notifee for local channel management if needed, but Expo handles display too
    useEffect(() => {
        const createChannel = async () => {
            if (Platform.OS === 'android') {
                await notifee.createChannel({
                    id: 'messages',
                    name: 'Messages',
                    importance: AndroidImportance.HIGH,
                    sound: 'default'
                });
            }
        };
        createChannel();
    }, []);

    // Existing Realtime Listener (Optional: can run in parallel for foreground updates)
    // If using Expo Push, the server will send the push. 
    // We can keep this for "In-App" updates if needed, but for "Closed App" support, 
    // we strictly rely on the server (Edge Function) sending the push to Expo.

    return (
        <NotificationContext.Provider value={{ expoPushToken }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);

async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return;
        }

        try {
            // Project ID from app.json
            const projectId = Constants.expoConfig?.extra?.eas?.projectId;

            if (projectId) {
                token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
                console.log('Expo Push Token:', token);
            } else {
                console.warn('No Expo Project ID found, skipping push token setup.');
            }
        } catch (e: any) {
            console.warn('Push Notifications (FCM) are not configured for this device build. Error:', e.message);
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}
