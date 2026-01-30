'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase-client';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { generateKeyPair, wrapPrivateKey, unwrapPrivateKey, KeyPair, EncryptedPrivateKey } from '../lib/encryption';

interface EncryptionContextType {
    isLocked: boolean;
    hasKeys: boolean;
    privateKey: string | null;
    publicKey: string | null;
    unlockWallet: (pin: string) => Promise<boolean>;
    setupWallet: (pin: string) => Promise<boolean>;
    lockWallet: () => void;
    isLoading: boolean;
    userId: string | null;
}

const EncryptionContext = createContext<EncryptionContextType | null>(null); // Nullable initially

export const EncryptionProvider = ({ children }: { children: React.ReactNode }) => {
    // We assume Auth is handled by a separate provider or Supabase client directly
    const [userId, setUserId] = useState<string | null>(null);
    const [privateKey, setPrivateKey] = useState<string | null>(null);
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [isLocked, setIsLocked] = useState(true);
    const [hasKeys, setHasKeys] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [serverEncryptedKey, setServerEncryptedKey] = useState<EncryptedPrivateKey | null>(null);

    // Watch Auth State
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
            if (session?.user) {
                setUserId(session.user.id);
            } else {
                setUserId(null);
                // Reset state
                setPrivateKey(null);
                setPublicKey(null);
                setIsLocked(true);
                setHasKeys(false);
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Check Keys when User ID is set
    useEffect(() => {
        if (!userId) return;
        checkKeys();
    }, [userId]);

    const checkKeys = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('Profile')
                .select('publicKey, encryptedPrivateKey')
                .eq('userId', userId)
                .single();

            if (data?.publicKey && data?.encryptedPrivateKey) {
                setHasKeys(true);
                setPublicKey(data.publicKey);

                // Parse if needed
                const encKey = typeof data.encryptedPrivateKey === 'string'
                    ? JSON.parse(data.encryptedPrivateKey)
                    : data.encryptedPrivateKey;
                setServerEncryptedKey(encKey);

                // Try Auto-unlock from LocalStorage (Session persistence)
                const cachedKey = localStorage.getItem('unlocked_private_key');
                if (cachedKey) {
                    setPrivateKey(cachedKey);
                    setIsLocked(false);
                }
            } else {
                setHasKeys(false);
            }
        } catch (e) {
            console.error("Encryption check failed", e);
        } finally {
            setIsLoading(false);
        }
    };

    const setupWallet = async (pin: string): Promise<boolean> => {
        try {
            if (!userId) return false;

            const pair = generateKeyPair();
            const encrypted = wrapPrivateKey(pair.privateKey, pin);

            const { error } = await supabase
                .from('Profile')
                .update({
                    publicKey: pair.publicKey,
                    encryptedPrivateKey: encrypted
                })
                .eq('userId', userId);

            if (error) {
                console.error("Setup upload failed:", error);
                throw error;
            }

            setPrivateKey(pair.privateKey);
            setPublicKey(pair.publicKey);
            setIsLocked(false);
            setHasKeys(true);
            localStorage.setItem('unlocked_private_key', pair.privateKey);

            return true;
        } catch (e) {
            console.error("Setup Wallet Error", e);
            alert("Setup Failed. Could not save keys.");
            return false;
        }
    };

    const unlockWallet = async (pin: string): Promise<boolean> => {
        if (!serverEncryptedKey) return false;

        const key = unwrapPrivateKey(serverEncryptedKey, pin);

        if (key) {
            setPrivateKey(key);
            setIsLocked(false);
            localStorage.setItem('unlocked_private_key', key);
            return true;
        } else {
            return false;
        }
    };

    const lockWallet = () => {
        setPrivateKey(null);
        setIsLocked(true);
        localStorage.removeItem('unlocked_private_key');
    };

    return (
        <EncryptionContext.Provider value={{
            isLocked,
            hasKeys,
            privateKey,
            publicKey,
            unlockWallet,
            setupWallet,
            lockWallet,
            isLoading,
            userId
        }}>
            {children}
        </EncryptionContext.Provider>
    );
};

export const useEncryption = () => {
    const context = useContext(EncryptionContext);
    if (!context) {
        // Return a dummy safe context if not wrapped (or error)
        // Better to error to catch dev mistakes
        // console.warn("useEncryption must be used within EncryptionProvider");
        // Return default blocked state to prevent crashes
        return {
            isLocked: true,
            hasKeys: false,
            privateKey: null,
            publicKey: null,
            unlockWallet: async () => false,
            setupWallet: async () => false,
            lockWallet: () => { },
            isLoading: false,
            userId: null
        };
    }
    return context;
};
