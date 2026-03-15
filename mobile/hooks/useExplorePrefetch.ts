/**
 * useExplorePrefetch — Scroll-velocity-based image prefetch for the Explore grid.
 *
 * Tracks scroll velocity using Reanimated shared values on the UI thread.
 * When velocity is low (<600px/s), prefetches the next 12 thumbnails.
 * When velocity is high (>1200px/s), cancels pending low-priority prefetches.
 */

import { useCallback, useRef } from 'react';
import { Image } from 'expo-image';
import { useSharedValue } from 'react-native-reanimated';
import { runOnJS } from 'react-native-reanimated';

interface PrefetchPost {
    id: string;
    media?: { url?: string; thumbnailUrl?: string }[];
    thumbnailUrl?: string;
}

export function useExplorePrefetch(posts: PrefetchPost[], currentVisibleIndex: number) {
    const lastScrollY = useSharedValue(0);
    const lastScrollTime = useSharedValue(Date.now());
    const velocity = useSharedValue(0);

    const pendingPrefetchAbort = useRef<AbortController | null>(null);
    const activePrefetches = useRef<Set<string>>(new Set());

    const doPrefetch = useCallback((startIndex: number) => {
        // Cancel any existing low-priority prefetches
        if (pendingPrefetchAbort.current) {
            pendingPrefetchAbort.current.abort();
        }
        pendingPrefetchAbort.current = new AbortController();

        const remaining = posts.slice(startIndex, startIndex + 12);
        if (remaining.length === 0) return;

        // Batch 1: high priority (next 6)
        const highPriority = remaining.slice(0, 6);
        // Batch 2: normal priority (following 6)
        const normalPriority = remaining.slice(6, 12);

        for (const post of highPriority) {
            const url = getThumbUrl(post);
            if (url && !activePrefetches.current.has(url)) {
                activePrefetches.current.add(url);
                Image.prefetch(url, { cachePolicy: 'memory-disk' }).catch(() => {
                    activePrefetches.current.delete(url);
                });
            }
        }

        // Delay normal priority slightly
        const abortSignal = pendingPrefetchAbort.current.signal;
        setTimeout(() => {
            if (abortSignal.aborted) return;
            for (const post of normalPriority) {
                if (abortSignal.aborted) break;
                const url = getThumbUrl(post);
                if (url && !activePrefetches.current.has(url)) {
                    activePrefetches.current.add(url);
                    Image.prefetch(url, { cachePolicy: 'memory-disk' }).catch(() => {
                        activePrefetches.current.delete(url);
                    });
                }
            }
        }, 100);
    }, [posts]);

    const cancelPrefetch = useCallback(() => {
        if (pendingPrefetchAbort.current) {
            pendingPrefetchAbort.current.abort();
            pendingPrefetchAbort.current = null;
        }
    }, []);

    const handleVelocityCheck = useCallback((v: number, visibleIdx: number) => {
        const absVelocity = Math.abs(v);

        if (absVelocity < 600) {
            // Slow scroll — prefetch ahead
            doPrefetch(visibleIdx + 3); // Start 1 row ahead
        } else if (absVelocity > 1200) {
            // Fast scroll — cancel everything
            cancelPrefetch();
        }
        // 600-1200: maintain current queue, do nothing new
    }, [doPrefetch, cancelPrefetch]);

    const onScroll = useCallback((event: any) => {
        'worklet';
        const y = event.nativeEvent.contentOffset.y;
        const now = Date.now();
        const dt = now - lastScrollTime.value;

        if (dt > 50) { // Sample at ~20fps
            const dy = y - lastScrollY.value;
            const v = (dy / dt) * 1000; // px/s
            velocity.value = v;
            lastScrollY.value = y;
            lastScrollTime.value = now;

            runOnJS(handleVelocityCheck)(v, currentVisibleIndex);
        }
    }, [currentVisibleIndex, handleVelocityCheck]);

    return { onScroll, velocity };
}

function getThumbUrl(post: PrefetchPost): string | null {
    if (post.thumbnailUrl) return post.thumbnailUrl;
    if (post.media && post.media.length > 0) {
        return post.media[0].thumbnailUrl || post.media[0].url || null;
    }
    return null;
}
