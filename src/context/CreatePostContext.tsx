'use client';

import React, { createContext, useContext } from 'react';

interface CreatePostContextType {
    onBack: () => void;
    initialData?: any;
}

const CreatePostContext = createContext<CreatePostContextType | undefined>(undefined);

export function CreatePostProvider({ children, onBack, initialData }: { children: React.ReactNode; onBack: () => void; initialData?: any }) {
    return (
        <CreatePostContext.Provider value={{ onBack, initialData }}>
            {children}
        </CreatePostContext.Provider>
    );
}

export function useCreatePost() {
    const context = useContext(CreatePostContext);
    if (!context) {
        throw new Error('useCreatePost must be used within a CreatePostProvider');
    }
    return context;
}
