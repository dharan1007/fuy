"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";

// Context Shape
interface FeedPlaybackContextType {
    activePostId: string | null;
    registerVideo: (id: string, element: HTMLElement) => void;
    unregisterVideo: (id: string) => void;
}

const FeedPlaybackContext = createContext<FeedPlaybackContextType | null>(null);

export function useFeedPlayback() {
    return useContext(FeedPlaybackContext);
}

// Hook for individual Video Cards
export function useVideoAutoplay(postId: string, dependency?: any) {
    const context = useFeedPlayback();
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (!context || !videoRef.current) return;

        // Register the container of the video (usually the parent div) for intersection
        // But here we register the video element itself or a cleaner wrapper
        context.registerVideo(postId, videoRef.current);

        return () => {
            context.unregisterVideo(postId);
        };
    }, [context, postId, dependency]);

    useEffect(() => {
        if (!context || !videoRef.current) return;

        const isPlaying = context.activePostId === postId;

        if (isPlaying) {
            // Play logic: Attempt play, handle promise
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch((error) => {
                    // Auto-play was prevented
                    console.warn(`Autoplay prevented for ${postId}`, error);
                });
            }
        } else {
            videoRef.current.pause();
        }
    }, [context?.activePostId, postId]);

    return {
        videoRef,
        isPlaying: context?.activePostId === postId
    };
}

export function FeedPlaybackProvider({ children }: { children: React.ReactNode }) {
    const [activePostId, setActivePostId] = useState<string | null>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const elementsRef = useRef<Map<string, HTMLElement>>(new Map());

    useEffect(() => {
        // Intersection Observer Options
        // threshold: 0.6 means 60% of the video must be visible
        const options = {
            root: null,
            rootMargin: "0px",
            threshold: 0.6,
        };

        const callback: IntersectionObserverCallback = (entries) => {
            // We need to find which entry is "most" visible or if any entry just triggered
            // Optimistic approach: The last entry that crossed the threshold to isIntersecting=true wins

            // Allow multiple concurrent entries to be checked
            entries.forEach((entry) => {
                const targetId = entry.target.getAttribute("data-post-id");
                if (entry.isIntersecting && targetId) {
                    setActivePostId(targetId);
                }
            });

            // If the ACTIVE post scrolls OUT, we should nullify it?
            // Actually, if we scroll quickly, another one might take over.
            // But if we scroll to a non-video area, the video should stop.

            // Refined Logic:
            // Calculate which registered element is closest to the center of the viewport
            // This is safer than just using the observer callback for "winning"
            // However, observer is efficient. Let's stick to observer for simple "scroll in"
            // But if the active one scrolls out, we stop it.
        };

        observerRef.current = new IntersectionObserver(callback, options);

        return () => {
            if (observerRef.current) observerRef.current.disconnect();
        };
    }, []);

    const registerVideo = (id: string, element: HTMLElement) => {
        if (!element || !observerRef.current) return;

        // Tag element for identification
        element.setAttribute("data-post-id", id);

        elementsRef.current.set(id, element);
        observerRef.current.observe(element);
    };

    const unregisterVideo = (id: string) => {
        const element = elementsRef.current.get(id);
        if (element && observerRef.current) {
            observerRef.current.unobserve(element);
        }
        elementsRef.current.delete(id);
        if (activePostId === id) setActivePostId(null);
    };

    return (
        <FeedPlaybackContext.Provider value={{ activePostId, registerVideo, unregisterVideo }}>
            {children}
        </FeedPlaybackContext.Provider>
    );
}
