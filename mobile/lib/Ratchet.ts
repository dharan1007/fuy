/**
 * Ratchet.ts — Fix 3: Forward Secrecy via Double Ratchet
 *
 * Simplified Double Ratchet algorithm using nacl primitives.
 * Each conversation maintains a RatchetState with root, sending,
 * and receiving chain keys. Message keys are derived per-message
 * and discarded immediately after use.
 *
 * State is stored encrypted in Expo SecureStore (never AsyncStorage/Supabase).
 */

import nacl from 'tweetnacl';
import util from 'tweetnacl-util';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Buffer } from 'buffer';

// --- Types ---

export interface RatchetState {
    /** Root key (32 bytes, Base64) — used to derive new chain keys on DH ratchet step */
    rootKey: string;
    /** Sending chain key (32 bytes, Base64) — advanced per message sent */
    sendingChainKey: string;
    /** Receiving chain key (32 bytes, Base64) — advanced per message received */
    receivingChainKey: string;
    /** Number of messages sent in current sending chain */
    sendMessageNumber: number;
    /** Number of messages received in current receiving chain */
    receiveMessageNumber: number;
    /** Length of previous sending chain (for skipped message handling) */
    previousSendingChainLength: number;
    /** Our current DH ratchet public key (Base64) */
    dhPublicKey: string;
    /** Our current DH ratchet private key (Base64) */
    dhPrivateKey: string;
    /** Their current DH ratchet public key (Base64) */
    theirDhPublicKey: string;
}

export interface RatchetHeader {
    /** Sender's current DH ratchet public key (Base64) */
    dhPublicKey: string;
    /** Message number in current sending chain */
    messageNumber: number;
    /** Length of previous sending chain */
    previousChainLength: number;
}

export interface RatchetMessage {
    /** Message header (unencrypted, needed for ratchet) */
    header: RatchetHeader;
    /** nacl.secretbox ciphertext (Base64) */
    ciphertext: string;
    /** nacl.secretbox nonce (Base64) */
    nonce: string;
}

// --- HKDF Implementation ---

/**
 * HKDF-SHA256 derive function.
 * Uses expo-crypto's SHA-256 to implement HMAC-based key derivation.
 *
 * @param inputKeyMaterial - Input key material (hex string)
 * @param salt             - Salt (hex string)
 * @param info             - Context info string
 * @param length           - Output length in bytes (max 64)
 * @returns Derived key as hex string
 */
async function hkdfDerive(
    inputKeyMaterial: string,
    salt: string,
    info: string,
    length: number = 32
): Promise<string> {
    // HKDF-Extract: PRK = HMAC-SHA256(salt, IKM)
    // We simulate HMAC via H(key || H(key || message)) approach
    // using expo-crypto digest.
    const prk = await hmacSha256(salt, inputKeyMaterial);

    // HKDF-Expand: derive output key material
    // For our use case, length <= 32, so one round is sufficient
    const infoHex = Buffer.from(info, 'utf-8').toString('hex');
    const t1 = await hmacSha256(prk, infoHex + '01');

    return t1.substring(0, length * 2);
}

/**
 * Simplified HMAC-SHA256 using double-hash construction.
 * HMAC(K, M) = H((K ^ opad) || H((K ^ ipad) || M))
 */
async function hmacSha256(keyHex: string, messageHex: string): Promise<string> {
    const blockSize = 64; // SHA-256 block size in bytes

    // Ensure key is exactly blockSize bytes
    let keyBytes: number[];
    if (keyHex.length / 2 > blockSize) {
        // Hash the key if too long
        const hashed = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            keyHex
        );
        keyBytes = hexToBytes(hashed);
    } else {
        keyBytes = hexToBytes(keyHex);
    }

    // Pad key to blockSize
    while (keyBytes.length < blockSize) {
        keyBytes.push(0);
    }

    // XOR with ipad (0x36) and opad (0x5c)
    const ipadKey = keyBytes.map((b) => b ^ 0x36);
    const opadKey = keyBytes.map((b) => b ^ 0x5c);

    const ipadHex = bytesToHex(ipadKey);
    const opadHex = bytesToHex(opadKey);

    // Inner hash: H(ipadKey || message)
    const innerHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        ipadHex + messageHex
    );

    // Outer hash: H(opadKey || innerHash)
    const outerHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        opadHex + innerHash
    );

    return outerHash;
}

function hexToBytes(hex: string): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substring(i, i + 2), 16));
    }
    return bytes;
}

function bytesToHex(bytes: number[]): string {
    return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function uint8ToHex(arr: Uint8Array): string {
    let hex = '';
    for (let i = 0; i < arr.length; i++) {
        hex += arr[i].toString(16).padStart(2, '0');
    }
    return hex;
}

function hexToUint8(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

// --- Chain Key Derivation ---

/**
 * Derive a message key and next chain key from the current chain key.
 * Uses HKDF with different info strings to produce independent keys.
 *
 * @returns [messageKey (32 bytes Uint8Array), nextChainKey (Base64 string)]
 */
async function advanceChainKey(
    chainKeyBase64: string
): Promise<[Uint8Array, string]> {
    const chainKeyHex = uint8ToHex(util.decodeBase64(chainKeyBase64));

    // Derive message key
    const messageKeyHex = await hkdfDerive(chainKeyHex, chainKeyHex, 'msg_key', 32);
    const messageKey = hexToUint8(messageKeyHex);

    // Derive next chain key
    const nextChainKeyHex = await hkdfDerive(chainKeyHex, chainKeyHex, 'chain_key', 32);
    const nextChainKey = util.encodeBase64(hexToUint8(nextChainKeyHex));

    return [messageKey, nextChainKey];
}

// --- DH Ratchet Step ---

/**
 * Perform a DH ratchet step: generate new DH keypair, compute shared secret,
 * and derive new root + chain keys.
 */
async function dhRatchetStep(
    state: RatchetState,
    theirNewDhPublicKey: string
): Promise<RatchetState> {
    const theirPub = util.decodeBase64(theirNewDhPublicKey);

    // Compute DH with our current private key and their new public key
    const sharedSecret1 = nacl.box.before(theirPub, util.decodeBase64(state.dhPrivateKey));

    // Derive new receiving chain key from root key + shared secret
    const rootKeyHex = uint8ToHex(util.decodeBase64(state.rootKey));
    const sharedHex1 = uint8ToHex(sharedSecret1);
    const newRootKeyHex1 = await hkdfDerive(sharedHex1, rootKeyHex, 'root_recv', 32);
    const newReceivingChainHex = await hkdfDerive(sharedHex1, rootKeyHex, 'chain_recv', 32);

    // Generate new DH keypair
    const newDhPair = nacl.box.keyPair();

    // Compute DH with our new private key and their new public key
    const sharedSecret2 = nacl.box.before(theirPub, newDhPair.secretKey);

    // Derive new sending chain key
    const sharedHex2 = uint8ToHex(sharedSecret2);
    const newRootKeyHex2 = await hkdfDerive(sharedHex2, newRootKeyHex1, 'root_send', 32);
    const newSendingChainHex = await hkdfDerive(sharedHex2, newRootKeyHex1, 'chain_send', 32);

    return {
        rootKey: util.encodeBase64(hexToUint8(newRootKeyHex2)),
        sendingChainKey: util.encodeBase64(hexToUint8(newSendingChainHex)),
        receivingChainKey: util.encodeBase64(hexToUint8(newReceivingChainHex)),
        sendMessageNumber: 0,
        receiveMessageNumber: 0,
        previousSendingChainLength: state.sendMessageNumber,
        dhPublicKey: util.encodeBase64(newDhPair.publicKey),
        dhPrivateKey: util.encodeBase64(newDhPair.secretKey),
        theirDhPublicKey: theirNewDhPublicKey,
    };
}

// --- Public API ---

/**
 * Initialize a ratchet for a new conversation.
 *
 * @param myPrivateKeyBase64    - Our identity private key (Base64)
 * @param theirPublicKeyBase64  - Their identity public key (Base64)
 * @param isInitiator           - true if we initiated the conversation (Alice)
 * @returns Initial RatchetState
 */
export async function initRatchet(
    myPrivateKeyBase64: string,
    theirPublicKeyBase64: string,
    isInitiator: boolean
): Promise<RatchetState> {
    const myPriv = util.decodeBase64(myPrivateKeyBase64);
    const theirPub = util.decodeBase64(theirPublicKeyBase64);

    // Initial DH shared secret
    const sharedSecret = nacl.box.before(theirPub, myPriv);
    const sharedHex = uint8ToHex(sharedSecret);

    // Derive initial root key
    const rootKeyHex = await hkdfDerive(sharedHex, '00'.repeat(32), 'init_root', 32);

    // Generate our DH ratchet keypair
    const dhPair = nacl.box.keyPair();

    // Derive initial chain keys
    const dhShared = nacl.box.before(theirPub, dhPair.secretKey);
    const dhSharedHex = uint8ToHex(dhShared);
    const sendingChainHex = await hkdfDerive(dhSharedHex, rootKeyHex, 'init_send', 32);
    const receivingChainHex = await hkdfDerive(dhSharedHex, rootKeyHex, 'init_recv', 32);

    const state: RatchetState = {
        rootKey: util.encodeBase64(hexToUint8(rootKeyHex)),
        // Initiator sends first, so swap send/recv for non-initiator
        sendingChainKey: util.encodeBase64(hexToUint8(isInitiator ? sendingChainHex : receivingChainHex)),
        receivingChainKey: util.encodeBase64(hexToUint8(isInitiator ? receivingChainHex : sendingChainHex)),
        sendMessageNumber: 0,
        receiveMessageNumber: 0,
        previousSendingChainLength: 0,
        dhPublicKey: util.encodeBase64(dhPair.publicKey),
        dhPrivateKey: util.encodeBase64(dhPair.secretKey),
        theirDhPublicKey: theirPublicKeyBase64,
    };

    return state;
}

/**
 * Encrypt a message using the ratchet.
 *
 * 1. Derives a message key from the sending chain key
 * 2. Advances the sending chain key
 * 3. Encrypts the plaintext with nacl.secretbox using the message key
 * 4. Discards the message key immediately
 *
 * @param state     - Current RatchetState (will be mutated)
 * @param plaintext - UTF-8 plaintext to encrypt
 * @returns [updatedState, ratchetMessage]
 */
export async function ratchetEncrypt(
    state: RatchetState,
    plaintext: string
): Promise<[RatchetState, RatchetMessage]> {
    // 1. Derive message key and advance chain
    const [messageKey, nextChainKey] = await advanceChainKey(state.sendingChainKey);

    // 2. Build header
    const header: RatchetHeader = {
        dhPublicKey: state.dhPublicKey,
        messageNumber: state.sendMessageNumber,
        previousChainLength: state.previousSendingChainLength,
    };

    // 3. Encrypt with nacl.secretbox
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const messageBytes = util.decodeUTF8(plaintext);
    const ciphertext = nacl.secretbox(messageBytes, nonce, messageKey);

    // 4. Zero the message key (JS doesn't guarantee memory clearing,
    //    but overwrite the reference so it's GC'd sooner)
    messageKey.fill(0);

    // 5. Update state
    const newState: RatchetState = {
        ...state,
        sendingChainKey: nextChainKey,
        sendMessageNumber: state.sendMessageNumber + 1,
    };

    const message: RatchetMessage = {
        header,
        ciphertext: util.encodeBase64(ciphertext),
        nonce: util.encodeBase64(nonce),
    };

    return [newState, message];
}

/**
 * Decrypt a message using the ratchet.
 *
 * If the sender's DH public key has changed, performs a DH ratchet step
 * before deriving the message key.
 *
 * @param state   - Current RatchetState
 * @param message - Received RatchetMessage
 * @returns [updatedState, decryptedPlaintext] or null if decryption fails
 */
export async function ratchetDecrypt(
    state: RatchetState,
    message: RatchetMessage
): Promise<[RatchetState, string] | null> {
    try {
        let currentState = { ...state };

        // Check if we need a DH ratchet step
        if (message.header.dhPublicKey !== currentState.theirDhPublicKey) {
            currentState = await dhRatchetStep(currentState, message.header.dhPublicKey);
        }

        // Advance the receiving chain to the correct message number
        let receivingChainKey = currentState.receivingChainKey;
        let messageKey: Uint8Array | null = null;

        // Skip ahead to the correct message number
        for (let i = currentState.receiveMessageNumber; i <= message.header.messageNumber; i++) {
            const [mk, nextCk] = await advanceChainKey(receivingChainKey);
            if (i === message.header.messageNumber) {
                messageKey = mk;
            } else {
                mk.fill(0); // Discard skipped key
            }
            receivingChainKey = nextCk;
        }

        if (!messageKey) return null;

        // Decrypt
        const ciphertext = util.decodeBase64(message.ciphertext);
        const nonce = util.decodeBase64(message.nonce);
        const opened = nacl.secretbox.open(ciphertext, nonce, messageKey);

        // Zero message key
        messageKey.fill(0);

        if (!opened) return null;

        const plaintext = util.encodeUTF8(opened);

        // Update state
        const newState: RatchetState = {
            ...currentState,
            receivingChainKey: receivingChainKey,
            receiveMessageNumber: message.header.messageNumber + 1,
        };

        return [newState, plaintext];
    } catch (e) {
        console.error('[Ratchet] Decrypt failed:', e);
        return null;
    }
}

/**
 * Serialize RatchetState to a JSON string for secure storage.
 */
export function serializeRatchetState(state: RatchetState): string {
    return JSON.stringify(state);
}

/**
 * Deserialize a JSON string back to RatchetState.
 */
export function deserializeRatchetState(data: string): RatchetState {
    return JSON.parse(data) as RatchetState;
}

// --- SecureStore Persistence ---

const RATCHET_STORE_PREFIX = 'ratchet_state_';

/**
 * Save ratchet state for a conversation to Expo SecureStore.
 * State is stored encrypted by the OS (Keychain on iOS, EncryptedSharedPreferences on Android).
 */
export async function saveRatchetState(
    conversationId: string,
    state: RatchetState
): Promise<void> {
    const key = `${RATCHET_STORE_PREFIX}${conversationId}`;
    await SecureStore.setItemAsync(key, serializeRatchetState(state));
}

/**
 * Load ratchet state for a conversation from Expo SecureStore.
 * Returns null if no state exists (first message in conversation).
 */
export async function loadRatchetState(
    conversationId: string
): Promise<RatchetState | null> {
    const key = `${RATCHET_STORE_PREFIX}${conversationId}`;
    const data = await SecureStore.getItemAsync(key);
    if (!data) return null;

    try {
        return deserializeRatchetState(data);
    } catch {
        return null;
    }
}

/**
 * Delete ratchet state for a conversation.
 */
export async function deleteRatchetState(
    conversationId: string
): Promise<void> {
    const key = `${RATCHET_STORE_PREFIX}${conversationId}`;
    await SecureStore.deleteItemAsync(key);
}
