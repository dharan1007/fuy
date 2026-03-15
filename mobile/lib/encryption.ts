import nacl from 'tweetnacl';
import util from 'tweetnacl-util';
import CryptoJS from 'crypto-js';
import * as Random from 'expo-crypto';
import { Buffer } from 'buffer';

// Polyfill PRNG for React Native/Expo
nacl.setPRNG((x, n) => {
    const out = Random.getRandomBytes(n);
    for (let i = 0; i < n; i++) x[i] = out[i];
});


// --- Types ---
export interface KeyPair {
    publicKey: string;  // Base64
    privateKey: string; // Base64
}

export interface EncryptedPrivateKey {
    ciphertext: string; // Base64
    salt: string;       // Hex (for PBKDF2)
    nonce: string;      // Base64 (for NaCl)
}

export interface EncryptedMessage {
    ciphertext: string; // Base64
    nonce: string;      // Base64
}

// --- Helpers ---
const encodeBase64 = util.encodeBase64;
const decodeBase64 = util.decodeBase64;

// --- 1. Key Generation ---

/**
 * Generates a new Curve25519 Key Pair for the user.
 */
export const generateKeyPair = (): KeyPair => {
    const pair = nacl.box.keyPair();
    return {
        publicKey: encodeBase64(pair.publicKey),
        privateKey: encodeBase64(pair.secretKey)
    };
};

// Obsolete wrapPrivateKey/unwrapPrivateKey removed (now in KeyVault.ts)

import {
    RatchetState,
    RatchetMessage,
    initRatchet,
    ratchetEncrypt,
    ratchetDecrypt,
    loadRatchetState,
    saveRatchetState
} from './Ratchet';

// --- 3. Messaging (E2EE) ---

/**
 * Encrypts a message for a specific recipient using the Double Ratchet.
 */
export const encryptMessage = async (
    text: string,
    myPrivateKey: string,
    theirPublicKey: string,
    conversationId: string,
    isInitiator: boolean = true
): Promise<RatchetMessage> => {
    let state = await loadRatchetState(conversationId);
    if (!state) {
        state = await initRatchet(myPrivateKey, theirPublicKey, isInitiator);
    }
    const [newState, encrypted] = await ratchetEncrypt(state, text);
    await saveRatchetState(conversationId, newState);
    return encrypted;
};

/**
 * Decrypts a received message using the Double Ratchet.
 */
export const decryptMessage = async (
    encrypted: RatchetMessage,
    myPrivateKey: string,
    theirPublicKey: string,
    conversationId: string,
    isInitiator: boolean = false
): Promise<string | null> => {
    try {
        let state = await loadRatchetState(conversationId);
        if (!state) {
            state = await initRatchet(myPrivateKey, theirPublicKey, isInitiator);
        }
        const result = await ratchetDecrypt(state, encrypted);
        if (!result) return null;
        
        const [newState, plaintext] = result;
        await saveRatchetState(conversationId, newState);
        return plaintext;
    } catch (e) {
        return null; // Return null to indicate unable to decrypt
    }
};
// --- 3. File Encryption (Symmetric AES) ---

import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as FileSystem from 'expo-file-system';

/**
 * Encrypts a file using AES-256.
 * Returns the path to the encrypted file and the encryption key/IV.
 * NOTE: For large video files, this JS-based approach might be slow or hit memory limits.
 * Native modules (react-native-aes-crypto) are recommended for production large files.
 */
export const encryptFile = async (uri: string, password?: string): Promise<{ encryptedUri: string; key: string; iv: string } | null> => {
    try {
        const fileData = await FileSystemLegacy.readAsStringAsync(uri, { encoding: 'base64' });

        let key: string;
        let keyHex: string;
        const iv = Random.getRandomBytes(16);
        const ivHex = Buffer.from(iv).toString('hex');

        if (password) {
            // Password-based encryption
            const salt = Random.getRandomBytes(16);
            const saltHex = Buffer.from(salt).toString('hex');

            // Derive key using PBKDF2
            const derivedKey = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(saltHex), {
                keySize: 256 / 32,
                iterations: 1000
            });

            keyHex = derivedKey.toString();
            // Prefix key with pw: and salt for easy identification
            key = `pw:${saltHex}`;
        } else {
            // Standard random key encryption
            const randomKey = Random.getRandomBytes(32);
            keyHex = Buffer.from(randomKey).toString('hex');
            key = keyHex;
        }

        // Encrypt
        const encrypted = CryptoJS.AES.encrypt(fileData, CryptoJS.enc.Hex.parse(keyHex), {
            iv: CryptoJS.enc.Hex.parse(ivHex)
        }).toString();

        const fileName = (uri.split('/').pop() || 'temp_enc') + '.enc';
        const cacheDir = FileSystemLegacy.cacheDirectory || FileSystemLegacy.documentDirectory || 'file:///';
        const encryptedUri = cacheDir + fileName;

        await FileSystemLegacy.writeAsStringAsync(encryptedUri, encrypted);

        return {
            encryptedUri,
            key,
            iv: ivHex
        };
    } catch (error) {
        console.error("File encryption error:", error);
        return null;
    }
};

/**
 * Decrypts a file using the provided key and IV.
 */
export const decryptFile = async (encryptedUri: string, keyString: string, ivHex: string, password?: string): Promise<string | null> => {
    try {
        const encryptedData = await FileSystemLegacy.readAsStringAsync(encryptedUri);

        let decryptionKey = keyString;

        if (keyString.startsWith('pw:')) {
            if (!password) {
                console.warn("Password required for decryption");
                return null;
            }
            const saltHex = keyString.split(':')[1];
            // Derive key
            const derivedKey = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(saltHex), {
                keySize: 256 / 32,
                iterations: 1000
            });
            decryptionKey = derivedKey.toString();
        }

        const decrypted = CryptoJS.AES.decrypt(encryptedData, CryptoJS.enc.Hex.parse(decryptionKey), {
            iv: CryptoJS.enc.Hex.parse(ivHex)
        });

        let base64Data: string;
        try {
            base64Data = decrypted.toString(CryptoJS.enc.Utf8);
            if (!base64Data) throw new Error("Decryption failed (result empty)");
        } catch (e) {
            console.warn("UTF-8 conversion failed - likely wrong password");
            return null;
        }

        // Identify extension or default to .dat - ideally we store original mime/ext
        // For now, let's assume valid base64 is returned and we can just use it (e.g. Image uri)
        // Check if we need to write to file or return base64 data uri prefix
        // Let's write to a temp file

        // Generate a random filename to avoid conflicts
        const tempFileName = 'dec_' + Date.now() + '.tmp';
        const cacheDir = FileSystemLegacy.cacheDirectory || FileSystemLegacy.documentDirectory || 'file:///';
        const targetUri = cacheDir + tempFileName;

        await FileSystemLegacy.writeAsStringAsync(targetUri, base64Data, { encoding: 'base64' });

        return targetUri;
    } catch (error) {
        console.error("File decryption error:", error);
        return null;
    }
};
