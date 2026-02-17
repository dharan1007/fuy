import React, { createContext, useContext, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { decryptMessage } from '../lib/encryption';

interface NotificationContextType {
    // expose methods if needed, currently automatic
}

const NotificationContext = createContext<NotificationContextType>({});

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
    const { session } = useAuth();
    const router = useRouter();
    const segments = useSegments();
    const userId = session?.user?.id;

    // Request permissions on mount
    useEffect(() => {
        const requestPermissions = async () => {
            await notifee.requestPermission();
        };
        requestPermissions();
    }, []);

    // Create channel
    useEffect(() => {
        const createChannel = async () => {
            if (Platform.OS === 'android') {
                await notifee.createChannel({
                    id: 'messages',
                    name: 'Messages',
                    importance: AndroidImportance.HIGH,
                    sound: 'default' // Add sound explicitly
                });
            }
        };
        createChannel();
    }, []);

    // Foreground/Background Listener
    useEffect(() => {
        if (!userId) return;

        console.log('NotificationProvider: Listening for new messages for user', userId);

        const channel = supabase.channel('global:messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'Message',
                    // Note: RLS should filter this to only messages the user can see.
                    // If RLS is weak, we might get everything. 
                    // To be safe, we check senderId !== userId locally.
                },
                async (payload) => {
                    const newMessage = payload.new;
                    console.log('NotificationProvider: Received message', newMessage.id);

                    // 1. Ignore own messages
                    if (newMessage.senderId === userId) return;

                    // 2. Check if we are currently looking at this conversation
                    // segments usually looks like ["(tabs)", "chat"] or ["post", "[id]"]
                    // Note: We'd need to know the active conversation ID to suppress properly.
                    // For now, let's just show it. If user is in app, it shows as a heads-up or existing UI handles it.
                    // Ideally check router state.

                    // Fetch sender name and public key for decryption
                    let title = 'New Message';
                    let senderPublicKey: string | null = null;
                    try {
                        const { data: sender } = await supabase
                            .from('User')
                            .select('name, profile:Profile(displayName, publicKey)')
                            .eq('id', newMessage.senderId)
                            .single();

                        if (sender) {
                            const profile = Array.isArray(sender.profile) ? sender.profile[0] : sender.profile;
                            title = profile?.displayName || sender.name || 'Anonymous';
                            senderPublicKey = profile?.publicKey || null;
                        }
                    } catch (e) {
                        console.error('Error fetching sender details', e);
                    }

                    // 3. Prepare Body (Decrypt if needed)
                    let body = newMessage.content;
                    const isEncrypted = body && body.startsWith('{') && body.includes('"c":') && body.includes('"n":');

                    if (isEncrypted) {
                        // Attempt decryption
                        let decrypted = null;
                        try {
                            const myPrivateKey = await SecureStore.getItemAsync('unlocked_private_key');
                            if (myPrivateKey && senderPublicKey) {
                                const parsed = JSON.parse(body);
                                decrypted = decryptMessage(
                                    { ciphertext: parsed.c, nonce: parsed.n },
                                    myPrivateKey,
                                    senderPublicKey
                                );
                            }
                        } catch (e) {
                            // Decryption failed or keys missing
                        }

                        // If decrypted, show it; otherwise show placeholder
                        body = decrypted || 'Encrypted Message';
                    } else if (!body && newMessage.mediaUrl) {
                        body = 'Sent a media file';
                    } else if (!body) {
                        body = 'Sent a message';
                    }

                    // 4. Display Notification
                    await notifee.displayNotification({
                        title: title,
                        body: body,
                        data: { conversationId: newMessage.conversationId },
                        android: {
                            channelId: 'messages',
                            pressAction: {
                                id: 'default',
                            },
                            // Add person icon if possible, but keeping simple for now
                        },
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    // Handle Notification Press (Foreground/Background)
    useEffect(() => {
        return notifee.onForegroundEvent(({ type, detail }) => {
            if (type === EventType.PRESS && detail.notification) {
                const navTo = detail.notification.data?.conversationId;
                // Navigate to chat if we have ID
                // Note: Actual navigation logic depends on structure.
                // Assuming we just want to open the likely Chat tab or specific room.
                // We'll leave it as default behavior (open app) for now unless we have a specific route.
                console.log('Notification pressed:', detail.notification);
            }
        });
    }, []);

    // Background event handler should be registered in index.js usually, 
    // but for simple cases Notifee handles basic launch.

    return (
        <NotificationContext.Provider value={{}}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);
