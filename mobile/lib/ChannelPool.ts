/**
 * OPT-3: Broadcast Channel Pool
 *
 * Singleton maintaining ONE Supabase Realtime channel per roomId.
 * All broadcast events (messages, live canvas updates, poll votes,
 * spin results, sticky note changes) are multiplexed over this
 * single channel per room.
 *
 * Usage:
 *   ChannelPool.emit(roomId, 'live_canvas:update', payload)
 *   ChannelPool.on(roomId, 'live_canvas:update', handler)
 *   ChannelPool.join(roomId)   // on room entry
 *   ChannelPool.leave(roomId)  // on room exit
 */

import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type EventHandler = (payload: any) => void;

interface ChannelEntry {
    channel: RealtimeChannel;
    handlers: Map<string, Set<EventHandler>>;
    subscribed: boolean;
}

class ChannelPoolImpl {
    private static instance: ChannelPoolImpl;
    private channels: Map<string, ChannelEntry> = new Map();

    private constructor() {}

    static getInstance(): ChannelPoolImpl {
        if (!ChannelPoolImpl.instance) {
            ChannelPoolImpl.instance = new ChannelPoolImpl();
        }
        return ChannelPoolImpl.instance;
    }

    /**
     * Join a room channel. Creates the channel if it doesn't exist
     * and subscribes to it. Idempotent -- safe to call multiple times.
     */
    join(roomId: string): RealtimeChannel {
        const existing = this.channels.get(roomId);
        if (existing?.subscribed) {
            return existing.channel;
        }

        if (existing && !existing.subscribed) {
            // Channel exists but not subscribed -- resubscribe
            existing.channel.subscribe();
            existing.subscribed = true;
            return existing.channel;
        }

        // Create new channel
        const channelName = `chat:${roomId}`;
        const channel = supabase.channel(channelName, {
            config: {
                broadcast: { ack: true, self: false },
            },
        });

        const entry: ChannelEntry = {
            channel,
            handlers: new Map(),
            subscribed: false,
        };

        // Set up a catch-all broadcast listener that routes to registered handlers
        channel.on('broadcast', { event: '*' }, (message: any) => {
            const event = message.event;
            const handlers = entry.handlers.get(event);
            if (handlers) {
                handlers.forEach((handler) => {
                    try {
                        handler(message.payload);
                    } catch (e) {
                        console.error(`[ChannelPool] Handler error for ${event}:`, e);
                    }
                });
            }
        });

        channel.subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
                entry.subscribed = true;
                console.log(`[ChannelPool] Subscribed to ${channelName}`);
            }
        });

        this.channels.set(roomId, entry);
        return channel;
    }

    /**
     * Leave a room channel. Unsubscribes and removes all handlers.
     */
    leave(roomId: string) {
        const entry = this.channels.get(roomId);
        if (!entry) return;

        try {
            supabase.removeChannel(entry.channel);
        } catch (e) {
            console.error(`[ChannelPool] Error removing channel for ${roomId}:`, e);
        }

        entry.handlers.clear();
        entry.subscribed = false;
        this.channels.delete(roomId);
        console.log(`[ChannelPool] Left room ${roomId}`);
    }

    /**
     * Register an event handler for a specific room and event.
     * Returns an unsubscribe function.
     */
    on(roomId: string, event: string, handler: EventHandler): () => void {
        // Ensure channel is joined
        this.join(roomId);

        const entry = this.channels.get(roomId)!;
        const handlers = entry.handlers.get(event) || new Set();
        handlers.add(handler);
        entry.handlers.set(event, handlers);

        // Return unsubscribe function
        return () => {
            const currentEntry = this.channels.get(roomId);
            if (!currentEntry) return;
            const currentHandlers = currentEntry.handlers.get(event);
            if (currentHandlers) {
                currentHandlers.delete(handler);
                if (currentHandlers.size === 0) {
                    currentEntry.handlers.delete(event);
                }
            }
        };
    }

    /**
     * Emit a broadcast event to a room.
     * Returns true if the broadcast was sent successfully.
     */
    async emit(roomId: string, event: string, payload: any): Promise<boolean> {
        const entry = this.channels.get(roomId);
        if (!entry || !entry.subscribed) {
            console.warn(`[ChannelPool] Cannot emit to ${roomId}: not subscribed`);
            // Try to join and retry once
            this.join(roomId);
            // Wait a short time for subscription
            await new Promise((r) => setTimeout(r, 500));
            const retryEntry = this.channels.get(roomId);
            if (!retryEntry?.subscribed) {
                return false;
            }
        }

        try {
            const result = await this.channels.get(roomId)!.channel.send({
                type: 'broadcast',
                event,
                payload,
            });
            return result === 'ok';
        } catch (e) {
            console.error(`[ChannelPool] Emit failed for ${event}:`, e);
            return false;
        }
    }

    /**
     * Get the raw Supabase channel for a room (for advanced usage
     * like postgres_changes subscriptions).
     */
    getChannel(roomId: string): RealtimeChannel | null {
        return this.channels.get(roomId)?.channel || null;
    }

    /**
     * Check if a room channel is active
     */
    isJoined(roomId: string): boolean {
        const entry = this.channels.get(roomId);
        return !!entry?.subscribed;
    }

    /**
     * Clean up all channels
     */
    destroyAll() {
        this.channels.forEach((entry, roomId) => {
            try {
                supabase.removeChannel(entry.channel);
            } catch {
                // Ignore errors during cleanup
            }
        });
        this.channels.clear();
    }
}

export const ChannelPool = ChannelPoolImpl.getInstance();
