/**
 * OPT-1: MessageQueue with Retry (Offline Resilience)
 *
 * Singleton class that wraps every outgoing message.
 * Flow: enqueue -> broadcast -> 2s ACK timeout -> retry 3s x 5 ->
 *       fallback DB insert -> persist to AsyncStorage
 *
 * On app foreground resume: drain the AsyncStorage queue.
 * Exposes per-message status: sending | sent | delivered | confirmed
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { AppState, AppStateStatus } from 'react-native';

const PENDING_QUEUE_KEY = 'app:queue:pending_messages';
const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 3000;
const ACK_TIMEOUT_MS = 2000;

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'confirmed';

export interface QueuedMessage {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    type: string;
    mediaUrl?: string | null;
    createdAt: string;
    metadata?: Record<string, any>;
    retryCount: number;
    failedAt?: string;
    status: MessageStatus;
}

type StatusListener = (messageId: string, status: MessageStatus) => void;

class MessageQueueImpl {
    private static instance: MessageQueueImpl;
    private queue: QueuedMessage[] = [];
    private statusListeners: Map<string, StatusListener[]> = new Map();
    private processing = false;
    private appStateSubscription: any;

    private constructor() {
        // Listen for app foreground to drain pending queue
        this.appStateSubscription = AppState.addEventListener(
            'change',
            this.handleAppStateChange
        );
        // Drain on init
        this.drainPendingQueue();
    }

    static getInstance(): MessageQueueImpl {
        if (!MessageQueueImpl.instance) {
            MessageQueueImpl.instance = new MessageQueueImpl();
        }
        return MessageQueueImpl.instance;
    }

    private handleAppStateChange = (nextState: AppStateStatus) => {
        if (nextState === 'active') {
            this.drainPendingQueue();
        }
    };

    /**
     * Subscribe to status changes for a specific message
     */
    onStatusChange(messageId: string, listener: StatusListener): () => void {
        const existing = this.statusListeners.get(messageId) || [];
        existing.push(listener);
        this.statusListeners.set(messageId, existing);

        return () => {
            const listeners = this.statusListeners.get(messageId) || [];
            this.statusListeners.set(
                messageId,
                listeners.filter((l) => l !== listener)
            );
        };
    }

    private emitStatus(messageId: string, status: MessageStatus) {
        const listeners = this.statusListeners.get(messageId) || [];
        listeners.forEach((l) => l(messageId, status));
    }

    /**
     * Mark a message as confirmed (called when postgres_changes event arrives)
     */
    confirmMessage(messageId: string) {
        this.emitStatus(messageId, 'confirmed');
        // Clean up listeners after confirmation
        setTimeout(() => {
            this.statusListeners.delete(messageId);
        }, 5000);
    }

    /**
     * Mark a message as delivered (broadcast ACK received)
     */
    markDelivered(messageId: string) {
        this.emitStatus(messageId, 'delivered');
    }

    /**
     * Enqueue a message for sending with retry logic.
     * Returns immediately after optimistic broadcast attempt.
     */
    async enqueue(
        message: Omit<QueuedMessage, 'retryCount' | 'status'>,
        broadcastFn: (msg: QueuedMessage) => Promise<boolean>,
        dbInsertFn: (msg: QueuedMessage) => Promise<boolean>
    ): Promise<void> {
        const queuedMsg: QueuedMessage = {
            ...message,
            retryCount: 0,
            status: 'sending',
        };

        this.emitStatus(queuedMsg.id, 'sending');

        // Attempt broadcast with ACK timeout
        const broadcastSuccess = await this.attemptBroadcastWithTimeout(
            queuedMsg,
            broadcastFn
        );

        if (broadcastSuccess) {
            queuedMsg.status = 'sent';
            this.emitStatus(queuedMsg.id, 'sent');
        }

        // Always attempt DB insert (reliable path)
        const dbSuccess = await dbInsertFn(queuedMsg);
        if (dbSuccess) {
            queuedMsg.status = 'delivered';
            this.emitStatus(queuedMsg.id, 'delivered');
            return;
        }

        // If broadcast failed, start retry loop
        if (!broadcastSuccess) {
            this.retryWithBackoff(queuedMsg, broadcastFn, dbInsertFn);
        }
    }

    private attemptBroadcastWithTimeout(
        msg: QueuedMessage,
        broadcastFn: (msg: QueuedMessage) => Promise<boolean>
    ): Promise<boolean> {
        return new Promise((resolve) => {
            const timer = setTimeout(() => resolve(false), ACK_TIMEOUT_MS);

            broadcastFn(msg)
                .then((success) => {
                    clearTimeout(timer);
                    resolve(success);
                })
                .catch(() => {
                    clearTimeout(timer);
                    resolve(false);
                });
        });
    }

    private async retryWithBackoff(
        msg: QueuedMessage,
        broadcastFn: (msg: QueuedMessage) => Promise<boolean>,
        dbInsertFn: (msg: QueuedMessage) => Promise<boolean>
    ) {
        for (let i = 0; i < MAX_RETRIES; i++) {
            await new Promise((r) => setTimeout(r, RETRY_INTERVAL_MS));
            msg.retryCount = i + 1;

            // Try broadcast again
            const success = await broadcastFn(msg).catch(() => false);
            if (success) {
                this.emitStatus(msg.id, 'sent');
                // Try DB insert
                const dbOk = await dbInsertFn(msg).catch(() => false);
                if (dbOk) {
                    this.emitStatus(msg.id, 'delivered');
                }
                return;
            }

            // Try direct DB insert as fallback
            const dbSuccess = await dbInsertFn(msg).catch(() => false);
            if (dbSuccess) {
                this.emitStatus(msg.id, 'delivered');
                return;
            }
        }

        // All retries exhausted -- persist to AsyncStorage for later
        msg.failedAt = new Date().toISOString();
        msg.status = 'sending';
        await this.persistToQueue(msg);
        console.warn(
            `[MessageQueue] Message ${msg.id} failed after ${MAX_RETRIES} retries. Persisted to AsyncStorage.`
        );
    }

    private async persistToQueue(msg: QueuedMessage) {
        try {
            const existing = await AsyncStorage.getItem(PENDING_QUEUE_KEY);
            const queue: QueuedMessage[] = existing ? JSON.parse(existing) : [];
            // Avoid duplicates
            if (!queue.find((m) => m.id === msg.id)) {
                queue.push(msg);
            }
            await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(queue));
        } catch (e) {
            console.error('[MessageQueue] Failed to persist to AsyncStorage:', e);
        }
    }

    /**
     * Drain pending messages from AsyncStorage (called on app foreground)
     */
    async drainPendingQueue() {
        if (this.processing) return;
        this.processing = true;

        try {
            const existing = await AsyncStorage.getItem(PENDING_QUEUE_KEY);
            if (!existing) {
                this.processing = false;
                return;
            }

            const queue: QueuedMessage[] = JSON.parse(existing);
            if (queue.length === 0) {
                this.processing = false;
                return;
            }

            console.log(`[MessageQueue] Draining ${queue.length} pending messages`);

            const remaining: QueuedMessage[] = [];

            for (const msg of queue) {
                try {
                    const { error } = await supabase.from('Message').insert({
                        id: msg.id,
                        conversationId: msg.conversationId,
                        senderId: msg.senderId,
                        content: msg.content,
                        type: msg.type,
                        mediaUrl: msg.mediaUrl,
                        createdAt: msg.createdAt,
                        ...(msg.metadata || {}),
                    });

                    if (error) {
                        // Check if it's a duplicate (already inserted)
                        if (error.code === '23505') {
                            console.log(`[MessageQueue] Message ${msg.id} already exists, skipping`);
                            continue;
                        }
                        remaining.push(msg);
                    } else {
                        this.emitStatus(msg.id, 'confirmed');
                    }
                } catch {
                    remaining.push(msg);
                }
            }

            if (remaining.length > 0) {
                await AsyncStorage.setItem(
                    PENDING_QUEUE_KEY,
                    JSON.stringify(remaining)
                );
            } else {
                await AsyncStorage.removeItem(PENDING_QUEUE_KEY);
            }
        } catch (e) {
            console.error('[MessageQueue] Drain failed:', e);
        } finally {
            this.processing = false;
        }
    }

    destroy() {
        this.appStateSubscription?.remove();
        this.statusListeners.clear();
    }
}

export const MessageQueue = MessageQueueImpl.getInstance();
