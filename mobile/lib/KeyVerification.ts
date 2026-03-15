/**
 * KeyVerification.ts — Fix 2: Prevent MITM Key Substitution
 *
 * Stores SHA-256 fingerprints of each contact's public key locally
 * in Expo SecureStore. On every message send, re-fetches the public key
 * and compares its fingerprint to detect key changes (potential MITM).
 *
 * Also generates Signal-style Safety Numbers for out-of-band verification.
 */

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import util from 'tweetnacl-util';

const FINGERPRINT_PREFIX = 'key_fp_';

/**
 * Compute a SHA-256 fingerprint of a Base64-encoded public key.
 * Returns the fingerprint as a lowercase hex string.
 */
export async function computeFingerprint(publicKeyBase64: string): Promise<string> {
    const keyBytes = util.decodeBase64(publicKeyBase64);
    // Convert Uint8Array to hex string for hashing
    let hexKey = '';
    for (let i = 0; i < keyBytes.length; i++) {
        hexKey += keyBytes[i].toString(16).padStart(2, '0');
    }

    const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        hexKey
    );

    return digest.toLowerCase();
}

/**
 * Store a public key fingerprint for a user in Expo SecureStore.
 */
export async function storeFingerprint(
    userId: string,
    fingerprint: string
): Promise<void> {
    await SecureStore.setItemAsync(`${FINGERPRINT_PREFIX}${userId}`, fingerprint);
}

/**
 * Retrieve the stored fingerprint for a user from SecureStore.
 * Returns null if no fingerprint has been stored (first interaction).
 */
export async function getStoredFingerprint(
    userId: string
): Promise<string | null> {
    return SecureStore.getItemAsync(`${FINGERPRINT_PREFIX}${userId}`);
}

/**
 * Remove a stored fingerprint (e.g., when user explicitly accepts a key change).
 */
export async function removeFingerprint(userId: string): Promise<void> {
    await SecureStore.deleteItemAsync(`${FINGERPRINT_PREFIX}${userId}`);
}

/**
 * Verification result indicating trust state of a public key.
 */
export type KeyTrustStatus = 'trusted' | 'new' | 'changed';

/**
 * Verify a public key against the stored fingerprint.
 *
 * Returns:
 * - 'new':     No fingerprint stored yet (first interaction). Auto-stores it.
 * - 'trusted': Fingerprint matches the stored one.
 * - 'changed': Fingerprint does NOT match. Possible MITM attack.
 *
 * @param userId           - The contact's user ID
 * @param publicKeyBase64  - The freshly fetched public key (Base64)
 */
export async function verifyKey(
    userId: string,
    publicKeyBase64: string
): Promise<KeyTrustStatus> {
    const currentFingerprint = await computeFingerprint(publicKeyBase64);
    const storedFingerprint = await getStoredFingerprint(userId);

    if (!storedFingerprint) {
        // First time seeing this user's key — store and trust
        await storeFingerprint(userId, currentFingerprint);
        return 'new';
    }

    if (storedFingerprint === currentFingerprint) {
        return 'trusted';
    }

    // Fingerprint mismatch! Key has changed.
    return 'changed';
}

/**
 * Accept a changed key (user explicitly trusts the new key).
 * Updates the stored fingerprint to the new value.
 */
export async function acceptKeyChange(
    userId: string,
    publicKeyBase64: string
): Promise<void> {
    const newFingerprint = await computeFingerprint(publicKeyBase64);
    await storeFingerprint(userId, newFingerprint);
}

/**
 * Generate a Signal-style Safety Number for two users.
 *
 * Combines both public keys, hashes them, and produces a 12-digit
 * numeric code that can be verified out-of-band (in person, phone call, etc).
 *
 * The code is symmetric: both users generate the same number regardless
 * of who initiates, because we sort the keys alphabetically before hashing.
 *
 * @param myPublicKeyBase64    - Current user's public key (Base64)
 * @param theirPublicKeyBase64 - Contact's public key (Base64)
 * @returns 12-digit numeric string formatted as "XXX XXX XXX XXX"
 */
export async function generateSafetyNumber(
    myPublicKeyBase64: string,
    theirPublicKeyBase64: string
): Promise<string> {
    // Sort keys to ensure both parties get the same result
    const keys = [myPublicKeyBase64, theirPublicKeyBase64].sort();
    const combined = keys[0] + '|' + keys[1];

    const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        combined
    );

    // Extract 12 digits from the hex hash
    // Take pairs of hex characters and mod 10 to get digits
    let digits = '';
    for (let i = 0; i < 12; i++) {
        const hexPair = digest.substring(i * 2, i * 2 + 2);
        const num = parseInt(hexPair, 16) % 10;
        digits += num.toString();
    }

    // Format as "XXX XXX XXX XXX"
    return digits.replace(/(.{3})/g, '$1 ').trim();
}
