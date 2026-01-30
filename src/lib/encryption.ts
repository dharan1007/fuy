import nacl from 'tweetnacl';
import util from 'tweetnacl-util';
import CryptoJS from 'crypto-js';

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

export const generateKeyPair = (): KeyPair => {
    const pair = nacl.box.keyPair();
    return {
        publicKey: encodeBase64(pair.publicKey),
        privateKey: encodeBase64(pair.secretKey)
    };
};

// --- 2. PIN Protection (Key Wrapping) ---

export const wrapPrivateKey = (privateKey: string, pin: string): EncryptedPrivateKey => {
    const salt = CryptoJS.lib.WordArray.random(16).toString();

    // Key Derivation
    const keyBytes = new Uint8Array(32);
    const derived = CryptoJS.PBKDF2(pin, salt, { keySize: 8, iterations: 10000 });

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

export const unwrapPrivateKey = (encrypted: EncryptedPrivateKey, pin: string): string | null => {
    try {
        const keyBytes = new Uint8Array(32);
        const derived = CryptoJS.PBKDF2(pin, encrypted.salt, { keySize: 8, iterations: 10000 });
        const hex = derived.toString(CryptoJS.enc.Hex);
        for (let i = 0; i < 32; i++) {
            keyBytes[i] = parseInt(hex.substr(i * 2, 2), 16);
        }

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

export const encryptMessage = (
    text: string,
    myPrivateKey: string,
    theirPublicKey: string
): EncryptedMessage => {
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const msgBytes = util.decodeUTF8(text);

    const myPrivBytes = decodeBase64(myPrivateKey);
    const theirPubBytes = decodeBase64(theirPublicKey);

    const box = nacl.box(msgBytes, nonce, theirPubBytes, myPrivBytes);

    return {
        ciphertext: encodeBase64(box),
        nonce: encodeBase64(nonce)
    };
};

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
        return null;
    }
};
