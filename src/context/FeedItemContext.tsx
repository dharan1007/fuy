'use client';

import React, { createContext, useContext } from 'react';

interface FeedItemContextType {
    onRefresh: () => void;
    onPostHidden?: (postId: string) => void;
}

const FeedItemContext = createContext<FeedItemContextType | undefined>(undefined);

export function FeedItemProvider({ children, onRefresh, onPostHidden }: { children: React.ReactNode; onRefresh: () => void; onPostHidden?: (postId: string) => void }) {
    return (
        <FeedItemContext.Provider value={{ onRefresh, onPostHidden }}>
            {children}
        </FeedItemContext.Provider>
    );
}

export function useFeedItem() {
    return useContext(FeedItemContext);
}

// Global Feed Refresh Context to avoid passing onRefresh to every item prop
interface FeedRefreshContextType {
    onRefresh: () => void;
}

const FeedRefreshContext = createContext<FeedRefreshContextType | undefined>(undefined);

export function FeedRefreshProvider({ children, onRefresh }: { children: React.ReactNode; onRefresh: () => void }) {
    return (
        <FeedRefreshContext.Provider value={{ onRefresh }}>
            {children}
        </FeedRefreshContext.Provider>
    );
}

export function useFeedRefresh() {
    return useContext(FeedRefreshContext);
}
