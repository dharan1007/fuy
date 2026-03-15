/**
 * KeyVault.ts — Fix 1: Argon2id + BIP-39 Recovery Phrase
 *
 * Replaces the insecure PBKDF2 + 6-digit PIN key wrapping.
 * Uses Argon2id (OWASP 2024 minimum: 64MB, 3 iterations, parallelism=1)
 * with a BIP-39 12-word mnemonic recovery phrase.
 *
 * The private key is wrapped with nacl.secretbox (XSalsa20-Poly1305)
 * using the Argon2id-derived 256-bit key.
 */

import nacl from 'tweetnacl';
import util from 'tweetnacl-util';
import { argon2id } from 'hash-wasm';
import * as bip39 from 'bip39';
import * as Random from 'expo-crypto';
import { Buffer } from 'buffer';
import { supabase } from './supabase';

// --- Types ---

export interface VaultBlob {
    /** nacl.secretbox ciphertext of the private key (Base64) */
    ciphertext: string;
    /** Random 16-byte salt used for Argon2id (Hex) */
    salt: string;
    /** nacl.secretbox nonce (Base64) */
    nonce: string;
    /** Version marker for future migrations */
    version: 2;
}

// --- Argon2id Parameters (OWASP 2024 minimum) ---
const ARGON2_MEMORY_COST = 65536; // 64 MB in KiB
const ARGON2_ITERATIONS = 3;
const ARGON2_PARALLELISM = 1;
const ARGON2_HASH_LENGTH = 32; // 256 bits

// --- Helpers ---
const encodeBase64 = util.encodeBase64;
const decodeBase64 = util.decodeBase64;

/**
 * Generate a new BIP-39 12-word mnemonic recovery phrase.
 * Uses 128 bits of entropy (= 12 words).
 */
export function generateMnemonic(): string {
    return bip39.generateMnemonic();
}

/**
 * Validate that a mnemonic string is a valid BIP-39 phrase.
 */
export function validateMnemonic(mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic);
}

/**
 * Derive a 256-bit wrapping key from a mnemonic + salt using Argon2id.
 *
 * @param mnemonic - BIP-39 12-word recovery phrase
 * @param salt     - 16-byte hex-encoded salt
 * @returns 32-byte Uint8Array wrapping key
 */
export async function deriveWrappingKey(
    mnemonic: string,
    salt: string
): Promise<Uint8Array> {
    const saltBytes = new Uint8Array(Buffer.from(salt, 'hex'));

    const hashHex = await argon2id({
        password: mnemonic.normalize('NFKD'),
        salt: saltBytes,
        parallelism: ARGON2_PARALLELISM,
        iterations: ARGON2_ITERATIONS,
        memorySize: ARGON2_MEMORY_COST,
        hashLength: ARGON2_HASH_LENGTH,
        outputType: 'hex',
    });

    // Convert hex output to Uint8Array
    const keyBytes = new Uint8Array(ARGON2_HASH_LENGTH);
    for (let i = 0; i < ARGON2_HASH_LENGTH; i++) {
        keyBytes[i] = parseInt(hashHex.substr(i * 2, 2), 16);
    }

    return keyBytes;
}

/**
 * Wrap (encrypt) a private key using a mnemonic-derived Argon2id key.
 *
 * 1. Generate random 16-byte salt
 * 2. Derive 256-bit wrapping key via Argon2id(mnemonic, salt)
 * 3. Encrypt privateKey with nacl.secretbox(wrappingKey)
 * 4. Return VaultBlob with ciphertext, salt, nonce
 *
 * @param privateKeyBase64 - Base64-encoded private key
 * @param mnemonic         - BIP-39 12-word recovery phrase
 * @returns VaultBlob ready for server storage
 */
export async function wrapPrivateKey(
    privateKeyBase64: string,
    mnemonic: string
): Promise<VaultBlob> {
    // 1. Random salt
    const saltBytes = Random.getRandomBytes(16);
    const salt = Buffer.from(saltBytes).toString('hex');

    // 2. Derive wrapping key
    const wrappingKey = await deriveWrappingKey(mnemonic, salt);

    // 3. Encrypt with nacl.secretbox (XSalsa20-Poly1305)
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const privateKeyBytes = decodeBase64(privateKeyBase64);
    const box = nacl.secretbox(privateKeyBytes, nonce, wrappingKey);

    return {
        ciphertext: encodeBase64(box),
        salt,
        nonce: encodeBase64(nonce),
        version: 2,
    };
}

/**
 * Unwrap (decrypt) a private key from a VaultBlob using the mnemonic.
 *
 * @param vault    - VaultBlob containing encrypted private key
 * @param mnemonic - BIP-39 12-word recovery phrase
 * @returns Base64-encoded private key, or null if mnemonic is wrong
 */
export async function unwrapPrivateKey(
    vault: VaultBlob,
    mnemonic: string
): Promise<string | null> {
    try {
        // 1. Re-derive the same wrapping key
        const wrappingKey = await deriveWrappingKey(mnemonic, vault.salt);

        // 2. Decrypt
        const box = decodeBase64(vault.ciphertext);
        const nonce = decodeBase64(vault.nonce);

        const opened = nacl.secretbox.open(box, nonce, wrappingKey);
        if (!opened) return null; // Wrong mnemonic

        return encodeBase64(opened);
    } catch (e) {
        console.error('[KeyVault] Failed to unwrap private key:', e);
        return null;
    }
}

/**
 * Save the encrypted vault blob + public key to Supabase Profile.
 *
 * The VaultBlob is stored as JSON in the `encryptedPrivateKey` column.
 * The server NEVER sees the plaintext private key or the mnemonic.
 *
 * @param userId    - Supabase user ID
 * @param vault     - Encrypted VaultBlob
 * @param publicKey - Base64-encoded public key
 */
export async function saveVaultToSupabase(
    userId: string,
    vault: VaultBlob,
    publicKey: string
): Promise<void> {
    const { error } = await supabase
        .from('Profile')
        .update({
            publicKey,
            encryptedPrivateKey: vault,
        })
        .eq('userId', userId);

    if (error) {
        console.error('[KeyVault] Failed to save vault to Supabase:', error);
        throw new Error(`Vault save failed: ${error.message}`);
    }
}
