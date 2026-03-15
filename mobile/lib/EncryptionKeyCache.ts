/**
 * OPT-2: Encryption Key Cache
 *
 * In-memory Map + AsyncStorage backing with 24h TTL.
 * Eliminates redundant Supabase fetches for recipient public keys.
 *
 * Usage: const key = await EncryptionKeyCache.getCachedKey(userId);
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const CACHE_KEY = 'app:keys:public_key_cache';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedKey {
    publicKey: string;
    cachedAt: number;
}

class EncryptionKeyCacheImpl {
    private static instance: EncryptionKeyCacheImpl;
    private memoryCache: Map<string, CachedKey> = new Map();
    private initialized = false;

    private constructor() {}

    static getInstance(): EncryptionKeyCacheImpl {
        if (!EncryptionKeyCacheImpl.instance) {
            EncryptionKeyCacheImpl.instance = new EncryptionKeyCacheImpl();
        }
        return EncryptionKeyCacheImpl.instance;
    }

    /**
     * Initialize from AsyncStorage on cold start
     */
    private async initialize() {
        if (this.initialized) return;

        try {
            const stored = await AsyncStorage.getItem(CACHE_KEY);
            if (stored) {
                const parsed: Record<string, CachedKey> = JSON.parse(stored);
                const now = Date.now();

                for (const [userId, entry] of Object.entries(parsed)) {
                    // Only load non-expired entries
                    if (now - entry.cachedAt < TTL_MS) {
                        this.memoryCache.set(userId, entry);
                    }
                }
            }
        } catch (e) {
            console.error('[EncryptionKeyCache] Init from AsyncStorage failed:', e);
        }

        this.initialized = true;
    }

    /**
     * Get the public key for a user. Checks memory first, then AsyncStorage,
     * then fetches from Supabase Profile table.
     *
     * All 5 features and the encryption pipeline should use this instead of
     * fetching keys directly.
     */
    async getCachedKey(userId: string): Promise<string | null> {
        await this.initialize();

        // 1. Check memory cache
        const memEntry = this.memoryCache.get(userId);
        if (memEntry && Date.now() - memEntry.cachedAt < TTL_MS) {
            return memEntry.publicKey;
        }

        // 2. Check AsyncStorage (in case memory was cleared but storage has it)
        try {
            const stored = await AsyncStorage.getItem(CACHE_KEY);
            if (stored) {
                const parsed: Record<string, CachedKey> = JSON.parse(stored);
                const entry = parsed[userId];
                if (entry && Date.now() - entry.cachedAt < TTL_MS) {
                    // Restore to memory
                    this.memoryCache.set(userId, entry);
                    return entry.publicKey;
                }
            }
        } catch {
            // Ignore parse errors
        }

        // 3. Fetch from Supabase
        try {
            const { data, error } = await supabase
                .from('Profile')
                .select('publicKey')
                .eq('userId', userId)
                .single();

            if (error || !data?.publicKey) {
                console.warn(`[EncryptionKeyCache] No public key found for user ${userId}`);
                return null;
            }

            // Cache in memory and AsyncStorage
            const cachedEntry: CachedKey = {
                publicKey: data.publicKey,
                cachedAt: Date.now(),
            };
            this.memoryCache.set(userId, cachedEntry);
            await this.persistToStorage();

            return data.publicKey;
        } catch (e) {
            console.error('[EncryptionKeyCache] Fetch from Supabase failed:', e);
            return null;
        }
    }

    /**
     * Pre-warm the cache for a specific user (e.g., on chat room open)
     */
    async warmup(userId: string): Promise<void> {
        await this.getCachedKey(userId);
    }

    /**
     * Invalidate a specific user's cached key (e.g., if keys are rotated)
     */
    async invalidate(userId: string): Promise<void> {
        this.memoryCache.delete(userId);
        await this.persistToStorage();
    }

    /**
     * Clear the entire cache
     */
    async clearAll(): Promise<void> {
        this.memoryCache.clear();
        await AsyncStorage.removeItem(CACHE_KEY);
    }

    private async persistToStorage() {
        try {
            const obj: Record<string, CachedKey> = {};
            this.memoryCache.forEach((value, key) => {
                obj[key] = value;
            });
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(obj));
        } catch (e) {
            console.error('[EncryptionKeyCache] Persist to AsyncStorage failed:', e);
        }
    }
}

export const EncryptionKeyCache = EncryptionKeyCacheImpl.getInstance();
