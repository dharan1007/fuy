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

// --- 2. PIN Protection (Key Wrapping) ---

/**
 * Encrypts the Private Key with the User's PIN.
 * This allows safe storage on the server for sync.
 */
export const wrapPrivateKey = (privateKey: string, pin: string): EncryptedPrivateKey => {
    // 1. Generate random salt using Expo Crypto (Native Secure Random)
    const saltBytes = Random.getRandomBytes(16);
    const salt = Buffer.from(saltBytes).toString('hex');

    // 2. Derive wrapping key from PIN (PBKDF2)
    // 10,000 iterations is a reasonable balance for mobile JS performance vs security
    const wrappingKeyHex = CryptoJS.PBKDF2(pin, salt, { keySize: 256 / 32, iterations: 10000 }).toString();
    const wrappingKey = new Uint8Array(Buffer.from(wrappingKeyHex, 'hex')); // Need raw bytes for NaCl? Actually NaCl takes Uint8Array key.

    // Wait, simpler to use Crypto-JS for the symmetric wrap of the key itself, 
    // OR use NaCl's secretbox with path-derived key. 
    // Let's use NaCl secretbox (XSalsa20) for consistency.
    // We need 32-byte key for secretbox.
    // PBKDF2 in CryptoJS returns WordArray. Convert to Uint8Array:

    const keyBytes = new Uint8Array(32);
    const derived = CryptoJS.PBKDF2(pin, salt, { keySize: 8, iterations: 10000 }); // keySize is in words (32 bits). 8 words = 32 bytes = 256 bits.

    // Convert WordArray to Uint8Array manually to be safe
    const hex = derived.toString(CryptoJS.enc.Hex);
    for (let i = 0; i < 32; i++) {
        keyBytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }

    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const message = decodeBase64(privateKey);
    const box = nacl.secretbox(message, nonce, keyBytes);

    return {
        ciphertext: encodeBase64(box),
        salt: salt,
        nonce: encodeBase64(nonce)
    };
};

/**
 * Decrypts the Private Key using the User's PIN.
 */
export const unwrapPrivateKey = (encrypted: EncryptedPrivateKey, pin: string): string | null => {
    try {
        // 1. Derive same wrapping key
        const keyBytes = new Uint8Array(32);
        const derived = CryptoJS.PBKDF2(pin, encrypted.salt, { keySize: 8, iterations: 10000 });
        const hex = derived.toString(CryptoJS.enc.Hex);
        for (let i = 0; i < 32; i++) {
            keyBytes[i] = parseInt(hex.substr(i * 2, 2), 16);
        }

        // 2. Decrypt
        const box = decodeBase64(encrypted.ciphertext);
        const nonce = decodeBase64(encrypted.nonce);

        const opened = nacl.secretbox.open(box, nonce, keyBytes);

        if (!opened) return null;

        return encodeBase64(opened);
    } catch (e) {
        console.error("Failed to unwrap private key", e);
        return null;
    }
};

// --- 3. Messaging (E2EE) ---

/**
 * Encrypts a message for a specific recipient.
 * Uses Sender's Private Key + Recipient's Public Key.
 */
export const encryptMessage = (
    text: string,
    myPrivateKey: string,
    theirPublicKey: string
): EncryptedMessage => {
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const msgBytes = util.decodeUTF8(text);

    // Check keys
    const myPrivBytes = decodeBase64(myPrivateKey);
    const theirPubBytes = decodeBase64(theirPublicKey); // This might fail if public key format is bad

    const box = nacl.box(msgBytes, nonce, theirPubBytes, myPrivBytes);

    return {
        ciphertext: encodeBase64(box),
        nonce: encodeBase64(nonce)
    };
};

/**
 * Decrypts a received message.
 * Uses Recipient's (My) Private Key + Sender's Public Key.
 */
export const decryptMessage = (
    encrypted: EncryptedMessage,
    myPrivateKey: string,
    theirPublicKey: string
): string | null => {
    try {
        const box = decodeBase64(encrypted.ciphertext);
        const nonce = decodeBase64(encrypted.nonce);
        const myPrivBytes = decodeBase64(myPrivateKey);
        const theirPubBytes = decodeBase64(theirPublicKey);

        const opened = nacl.box.open(box, nonce, theirPubBytes, myPrivBytes);

        if (!opened) return null;

        return util.encodeUTF8(opened);
    } catch (e) {
        // Console error might be too noisy for thousands of messages
        // console.warn("Failed to decrypt message", e); 
        return null; // Return null to indicate unable to decrypt (might show "Encrypted Message")
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
