// FeedCacheService.ts - Local caching for feed data to reduce API calls and egress
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEYS = {
    HOME_FEED: 'cache:home_feed',
    CLOCKS: 'cache:clocks',
    EXPLORE_POSTS: 'cache:explore_posts',
    DOTS_LILLS: 'cache:dots_lills',
    DOTS_FILLS: 'cache:dots_fills',
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

export class FeedCacheService {
    /**
     * Get cached data if valid, otherwise return null
     */
    static async get<T>(key: string): Promise<T | null> {
        try {
            const raw = await AsyncStorage.getItem(key);
            if (!raw) return null;

            const entry: CacheEntry<T> = JSON.parse(raw);
            const age = Date.now() - entry.timestamp;

            if (age > CACHE_TTL) {
                console.log(`[FeedCache] Cache expired for ${key} (age: ${Math.round(age / 1000)}s)`);
                return null; // Expired
            }

            console.log(`[FeedCache] Cache hit for ${key} (age: ${Math.round(age / 1000)}s)`);
            return entry.data;
        } catch (e) {
            console.warn('[FeedCache] Read error:', e);
            return null;
        }
    }

    /**
     * Store data in cache
     */
    static async set<T>(key: string, data: T): Promise<void> {
        try {
            const entry: CacheEntry<T> = {
                data,
                timestamp: Date.now(),
            };
            await AsyncStorage.setItem(key, JSON.stringify(entry));
            console.log(`[FeedCache] Cached ${key}`);
        } catch (e) {
            console.warn('[FeedCache] Write error:', e);
        }
    }

    /**
     * Clear specific cache
     */
    static async clear(key: string): Promise<void> {
        try {
            await AsyncStorage.removeItem(key);
        } catch (e) {
            console.warn('[FeedCache] Clear error:', e);
        }
    }

    /**
     * Clear all feed caches
     */
    static async clearAll(): Promise<void> {
        try {
            await Promise.all(
                Object.values(CACHE_KEYS).map(key => AsyncStorage.removeItem(key))
            );
            console.log('[FeedCache] All caches cleared');
        } catch (e) {
            console.warn('[FeedCache] Clear all error:', e);
        }
    }

    // Convenience methods for specific feeds
    static async getHomeFeed<T>(): Promise<T | null> {
        return this.get<T>(CACHE_KEYS.HOME_FEED);
    }

    static async setHomeFeed<T>(data: T): Promise<void> {
        return this.set(CACHE_KEYS.HOME_FEED, data);
    }

    static async getClocks<T>(): Promise<T | null> {
        return this.get<T>(CACHE_KEYS.CLOCKS);
    }

    static async setClocks<T>(data: T): Promise<void> {
        return this.set(CACHE_KEYS.CLOCKS, data);
    }

    static async getExplorePosts<T>(): Promise<T | null> {
        return this.get<T>(CACHE_KEYS.EXPLORE_POSTS);
    }

    static async setExplorePosts<T>(data: T): Promise<void> {
        return this.set(CACHE_KEYS.EXPLORE_POSTS, data);
    }

    static async getDotsLills<T>(): Promise<T | null> {
        return this.get<T>(CACHE_KEYS.DOTS_LILLS);
    }

    static async setDotsLills<T>(data: T): Promise<void> {
        return this.set(CACHE_KEYS.DOTS_LILLS, data);
    }

    static async getDotsFills<T>(): Promise<T | null> {
        return this.get<T>(CACHE_KEYS.DOTS_FILLS);
    }

    static async setDotsFills<T>(data: T): Promise<void> {
        return this.set(CACHE_KEYS.DOTS_FILLS, data);
    }
}
