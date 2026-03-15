import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { generateKeyPair } from '../lib/encryption';
import {
    generateMnemonic,
    validateMnemonic,
    wrapPrivateKey,
    unwrapPrivateKey,
    saveVaultToSupabase,
    VaultBlob,
} from '../lib/KeyVault';
import { Alert } from 'react-native';

interface EncryptionContextType {
    isLocked: boolean;
    hasKeys: boolean;
    privateKey: string | null;
    publicKey: string | null;
    /** Setup wallet with a new BIP-39 mnemonic. Returns the mnemonic on success. */
    setupWallet: () => Promise<string | null>;
    /** Unlock wallet using existing mnemonic recovery phrase. */
    unlockWallet: (mnemonic: string) => Promise<boolean>;
    lockWallet: () => void;
    isLoading: boolean;
}

const EncryptionContext = createContext<EncryptionContextType>({
    isLocked: true,
    hasKeys: false,
    privateKey: null,
    publicKey: null,
    setupWallet: async () => null,
    unlockWallet: async () => false,
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
    const [serverVault, setServerVault] = useState<VaultBlob | null>(null);

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
                .from('Profile')
                .select('publicKey, encryptedPrivateKey')
                .eq('userId', session?.user?.id)
                .single();

            if (data?.publicKey && data?.encryptedPrivateKey) {
                setHasKeys(true);
                setPublicKey(data.publicKey);
                // Parse the vault blob
                const vault: VaultBlob = typeof data.encryptedPrivateKey === 'string'
                    ? JSON.parse(data.encryptedPrivateKey)
                    : data.encryptedPrivateKey;
                setServerVault(vault);

                // 2. Auto-unlock from SecureStore (cached decrypted key)
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

    /**
     * Setup a new encryption wallet.
     * Generates a BIP-39 mnemonic, creates a Curve25519 keypair,
     * wraps the private key with Argon2id, and uploads to Supabase.
     * Returns the mnemonic so the UI can display it to the user.
     */
    const setupWallet = async (): Promise<string | null> => {
        try {
            if (!session?.user) return null;

            // 1. Generate new mnemonic recovery phrase
            const mnemonic = generateMnemonic();

            // 2. Generate new Curve25519 key pair
            const pair = generateKeyPair();

            // 3. Wrap private key with Argon2id-derived key
            const vault = await wrapPrivateKey(pair.privateKey, mnemonic);

            // 4. Upload to Supabase
            await saveVaultToSupabase(session.user.id, vault, pair.publicKey);

            // 5. Save decrypted key to SecureStore for session caching
            setPrivateKey(pair.privateKey);
            setPublicKey(pair.publicKey);
            setIsLocked(false);
            setHasKeys(true);
            await SecureStore.setItemAsync('unlocked_private_key', pair.privateKey);

            return mnemonic;
        } catch (e) {
            console.error("Setup Wallet Error", e);
            Alert.alert("Setup Failed", "Could not save secure keys. Please try again.");
            return null;
        }
    };

    /**
     * Unlock wallet using a BIP-39 recovery phrase.
     */
    const unlockWallet = async (mnemonic: string): Promise<boolean> => {
        if (!serverVault) return false;

        if (!validateMnemonic(mnemonic.trim().toLowerCase())) {
            return false;
        }

        const key = await unwrapPrivateKey(serverVault, mnemonic.trim().toLowerCase());

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
