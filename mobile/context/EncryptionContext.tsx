import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { generateKeyPair, wrapPrivateKey, unwrapPrivateKey, KeyPair, EncryptedPrivateKey } from '../lib/encryption';
import { Alert } from 'react-native';

interface EncryptionContextType {
    isLocked: boolean;
    hasKeys: boolean;
    privateKey: string | null;
    publicKey: string | null;
    unlockWallet: (pin: string) => Promise<boolean>;
    setupWallet: (pin: string) => Promise<boolean>;
    lockWallet: () => void;
    isLoading: boolean;
}

const EncryptionContext = createContext<EncryptionContextType>({
    isLocked: true,
    hasKeys: false,
    privateKey: null,
    publicKey: null,
    unlockWallet: async () => false,
    setupWallet: async () => false,
    lockWallet: () => { },
    isLoading: true,
});

export const EncryptionProvider = ({ children }: { children: React.ReactNode }) => {
    const { session, loading: authLoading } = useAuth();
    const [privateKey, setPrivateKey] = useState<string | null>(null);
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [isLocked, setIsLocked] = useState(true);
    const [hasKeys, setHasKeys] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [serverEncryptedKey, setServerEncryptedKey] = useState<EncryptedPrivateKey | null>(null);

    // Load initial state on auth load
    useEffect(() => {
        if (authLoading) return;
        if (!session?.user) {
            // Reset state on logout
            setPrivateKey(null);
            setPublicKey(null);
            setIsLocked(true);
            setHasKeys(false);
            setIsLoading(false);
            return;
        }

        checkKeys();
    }, [session, authLoading]);

    const checkKeys = async () => {
        try {
            setIsLoading(true);
            // 1. Check if user has keys in Supabase Profile
            const { data, error } = await supabase
                .from('Profile') // Assuming Profile table exists and is linked
                .select('publicKey, encryptedPrivateKey')
                .eq('userId', session?.user?.id) // or userId
                .single();

            if (data?.publicKey && data?.encryptedPrivateKey) {
                setHasKeys(true);
                setPublicKey(data.publicKey);
                // Parse the JSON field if it's stored as JSONB or text
                const encKey = typeof data.encryptedPrivateKey === 'string'
                    ? JSON.parse(data.encryptedPrivateKey)
                    : data.encryptedPrivateKey;
                setServerEncryptedKey(encKey);

                // 2. Try to auto-unlock from SecureStore (Cached PIN/Key)
                const cachedKey = await SecureStore.getItemAsync('unlocked_private_key');
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
            if (!session?.user) return false;

            // 1. Generate New Keys
            const pair = generateKeyPair();

            // 2. Encrypt Private Key with PIN
            const encrypted = wrapPrivateKey(pair.privateKey, pin);

            // 3. Upload to Supabase
            // We need to store these in the Profile.
            // Note: If columns don't exist, this will fail. User needs to run migration.
            // We will attempt to update.
            const { error } = await supabase
                .from('Profile')
                .update({
                    publicKey: pair.publicKey,
                    encryptedPrivateKey: encrypted // Supabase handles JSON automatically for JSONB columns, or we stringify for text
                })
                .eq('userId', session.user.id);

            if (error) {
                console.error("Setup upload failed:", error);
                throw error;
            }

            // 4. Save to State & SecureStore
            setPrivateKey(pair.privateKey);
            setPublicKey(pair.publicKey);
            setIsLocked(false);
            setHasKeys(true);
            // Optionally cache unlocked key for session persistence
            await SecureStore.setItemAsync('unlocked_private_key', pair.privateKey);

            return true;
        } catch (e) {
            console.error("Setup Wallet Error", e);
            Alert.alert("Setup Failed", "Could not save secure keys. Database might need updates.");
            return false;
        }
    };

    const unlockWallet = async (pin: string): Promise<boolean> => {
        if (!serverEncryptedKey) return false;

        // Decrypt
        const key = unwrapPrivateKey(serverEncryptedKey, pin);

        if (key) {
            setPrivateKey(key);
            setIsLocked(false);
            await SecureStore.setItemAsync('unlocked_private_key', key);
            return true;
        } else {
            return false;
        }
    };

    const lockWallet = async () => {
        setPrivateKey(null);
        setIsLocked(true);
        await SecureStore.deleteItemAsync('unlocked_private_key');
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
            isLoading
        }}>
            {children}
        </EncryptionContext.Provider>
    );
};

export const useEncryption = () => useContext(EncryptionContext);
