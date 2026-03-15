/**
 * MultiDeviceEncryption.ts — Fix 6: Per-Device Key Pairs
 *
 * Each device generates its OWN Curve25519 key pair on first launch.
 * Private keys never leave the device.
 *
 * When sending a message:
 *   - Fetch ALL of the recipient's active device public keys
 *   - Encrypt the message once per device key
 *   - Store each ciphertext in the messages_by_device table
 *
 * When receiving:
 *   - Decrypt only the ciphertext addressed to this device
 *
 * New device authorization via QR code:
 *   - Existing device generates QR containing encrypted welcome package
 *   - New device scans QR, decrypts, and registers itself
 */

import nacl from 'tweetnacl';
import util from 'tweetnacl-util';
import * as SecureStore from 'expo-secure-store';
import * as Random from 'expo-crypto';
import { Buffer } from 'buffer';
import { supabase } from './supabase';

// --- SecureStore Keys ---
const DEVICE_PRIVATE_KEY = 'device_private_key';
const DEVICE_PUBLIC_KEY = 'device_public_key';
const DEVICE_ID_KEY = 'device_id';

// --- Types ---

export interface DeviceKeyPair {
    publicKey: string;  // Base64
    privateKey: string; // Base64
    deviceId: string;
}

export interface DeviceCiphertext {
    deviceId: string;
    ciphertext: string; // Base64
    nonce: string;      // Base64
}

export interface QRAuthPayload {
    /** New device's public key (Base64) */
    newDevicePublicKey: string;
    /** Encrypted welcome package (Base64) */
    encryptedWelcome: string;
    /** Nonce for the encrypted welcome (Base64) */
    nonce: string;
    /** Existing device's public key used for encryption (Base64) */
    existingDevicePublicKey: string;
}

// --- Device Registration ---

/**
 * Generate a unique device ID using secure random bytes.
 */
function generateDeviceId(): string {
    const bytes = Random.getRandomBytes(16);
    return Buffer.from(bytes).toString('hex');
}

/**
 * Register this device by generating a Curve25519 keypair
 * and uploading the public key to the user_devices table.
 *
 * If the device already has keys, returns the existing ones.
 *
 * @param userId     - Current user's Supabase ID
 * @param deviceName - Human-readable device name (e.g. "iPhone 15 Pro")
 * @returns DeviceKeyPair for this device
 */
export async function registerDevice(
    userId: string,
    deviceName?: string
): Promise<DeviceKeyPair> {
    // Check if device already has keys
    const existingPriv = await SecureStore.getItemAsync(DEVICE_PRIVATE_KEY);
    const existingPub = await SecureStore.getItemAsync(DEVICE_PUBLIC_KEY);
    const existingId = await SecureStore.getItemAsync(DEVICE_ID_KEY);

    if (existingPriv && existingPub && existingId) {
        return {
            publicKey: existingPub,
            privateKey: existingPriv,
            deviceId: existingId,
        };
    }

    // Generate new keypair for this device
    const pair = nacl.box.keyPair();
    const deviceId = generateDeviceId();

    const publicKeyB64 = util.encodeBase64(pair.publicKey);
    const privateKeyB64 = util.encodeBase64(pair.secretKey);

    // Store private key ONLY in SecureStore (never leaves device)
    await SecureStore.setItemAsync(DEVICE_PRIVATE_KEY, privateKeyB64);
    await SecureStore.setItemAsync(DEVICE_PUBLIC_KEY, publicKeyB64);
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);

    // Upload public key to Supabase
    const { error } = await supabase.from('UserDevice').insert({
        userId,
        deviceId,
        publicKey: publicKeyB64,
        deviceName: deviceName || 'Unknown Device',
        isActive: true,
    });

    if (error) {
        // If device already registered (unique constraint), update instead
        if (error.code === '23505') {
            await supabase.from('UserDevice').update({
                publicKey: publicKeyB64,
                deviceName: deviceName || 'Unknown Device',
                isActive: true,
            }).eq('deviceId', deviceId);
        } else {
            console.error('[MultiDevice] Registration failed:', error);
            throw new Error(`Device registration failed: ${error.message}`);
        }
    }

    return {
        publicKey: publicKeyB64,
        privateKey: privateKeyB64,
        deviceId,
    };
}

/**
 * Get this device's key pair from SecureStore.
 * Returns null if device hasn't been registered yet.
 */
export async function getDeviceKeys(): Promise<DeviceKeyPair | null> {
    const priv = await SecureStore.getItemAsync(DEVICE_PRIVATE_KEY);
    const pub = await SecureStore.getItemAsync(DEVICE_PUBLIC_KEY);
    const id = await SecureStore.getItemAsync(DEVICE_ID_KEY);

    if (!priv || !pub || !id) return null;

    return { publicKey: pub, privateKey: priv, deviceId: id };
}

// --- Multi-Device Encryption ---

/**
 * Encrypt a plaintext message for ALL of a recipient's active devices.
 *
 * Fetches all active device public keys for the recipient,
 * encrypts the message separately for each device key.
 *
 * @param plaintext       - UTF-8 plaintext to encrypt
 * @param recipientUserId - Recipient's Supabase user ID
 * @param senderPrivateKey - Sender's device private key (Base64)
 * @returns Array of DeviceCiphertext, one per recipient device
 */
export async function encryptForAllDevices(
    plaintext: string,
    recipientUserId: string,
    senderPrivateKey: string
): Promise<DeviceCiphertext[]> {
    // Fetch all active device public keys for recipient
    const { data: devices, error } = await supabase
        .from('UserDevice')
        .select('deviceId, publicKey')
        .eq('userId', recipientUserId)
        .eq('isActive', true);

    if (error) {
        console.error('[MultiDevice] Failed to fetch device keys:', error);
        throw new Error(`Failed to fetch recipient devices: ${error.message}`);
    }

    if (!devices || devices.length === 0) {
        throw new Error('Recipient has no registered devices.');
    }

    const senderPriv = util.decodeBase64(senderPrivateKey);
    const messageBytes = util.decodeUTF8(plaintext);

    const results: DeviceCiphertext[] = [];

    for (const device of devices) {
        const recipientPub = util.decodeBase64(device.publicKey);
        const nonce = nacl.randomBytes(nacl.box.nonceLength);

        const ciphertext = nacl.box(
            messageBytes,
            nonce,
            recipientPub,
            senderPriv
        );

        results.push({
            deviceId: device.deviceId,
            ciphertext: util.encodeBase64(ciphertext),
            nonce: util.encodeBase64(nonce),
        });
    }

    return results;
}

/**
 * Decrypt a message ciphertext addressed to this device.
 *
 * @param ciphertextB64    - nacl.box ciphertext (Base64)
 * @param nonceB64         - nacl.box nonce (Base64)
 * @param senderPublicKeyB64 - Sender's device public key (Base64)
 * @returns Decrypted plaintext, or null if decryption fails
 */
export async function decryptForThisDevice(
    ciphertextB64: string,
    nonceB64: string,
    senderPublicKeyB64: string
): Promise<string | null> {
    const deviceKeys = await getDeviceKeys();
    if (!deviceKeys) {
        console.error('[MultiDevice] No device keys found. Device not registered.');
        return null;
    }

    try {
        const ciphertext = util.decodeBase64(ciphertextB64);
        const nonce = util.decodeBase64(nonceB64);
        const senderPub = util.decodeBase64(senderPublicKeyB64);
        const myPriv = util.decodeBase64(deviceKeys.privateKey);

        const opened = nacl.box.open(ciphertext, nonce, senderPub, myPriv);
        if (!opened) return null;

        return util.encodeUTF8(opened);
    } catch (e) {
        console.error('[MultiDevice] Decryption failed:', e);
        return null;
    }
}

// --- Device Authorization via QR ---

/**
 * Generate a QR code payload from an existing trusted device.
 *
 * The existing device encrypts a "welcome package" containing
 * essential data for the new device using the new device's public key.
 *
 * @param existingDevicePrivateKey - Existing device's private key (Base64)
 * @param existingDevicePublicKey  - Existing device's public key (Base64)
 * @param newDevicePublicKey       - New device's public key (Base64, scanned or entered)
 * @param welcomeData             - Data to share (e.g. user's identity confirmation)
 * @returns QRAuthPayload to encode as QR code
 */
export function generateDeviceAuthQR(
    existingDevicePrivateKey: string,
    existingDevicePublicKey: string,
    newDevicePublicKey: string,
    welcomeData: Record<string, any>
): QRAuthPayload {
    const existPriv = util.decodeBase64(existingDevicePrivateKey);
    const newPub = util.decodeBase64(newDevicePublicKey);
    const nonce = nacl.randomBytes(nacl.box.nonceLength);

    const welcomeBytes = util.decodeUTF8(JSON.stringify(welcomeData));
    const encrypted = nacl.box(welcomeBytes, nonce, newPub, existPriv);

    return {
        newDevicePublicKey,
        encryptedWelcome: util.encodeBase64(encrypted),
        nonce: util.encodeBase64(nonce),
        existingDevicePublicKey,
    };
}

/**
 * Process a QR code payload on a new device.
 *
 * Decrypts the welcome package using the new device's private key
 * and the existing device's public key from the QR payload.
 *
 * @param qrData            - QRAuthPayload from the scanned QR code
 * @param newDevicePrivateKey - New device's private key (Base64)
 * @returns Decrypted welcome data, or null if verification fails
 */
export function processDeviceAuthQR(
    qrData: QRAuthPayload,
    newDevicePrivateKey: string
): Record<string, any> | null {
    try {
        const ciphertext = util.decodeBase64(qrData.encryptedWelcome);
        const nonce = util.decodeBase64(qrData.nonce);
        const existPub = util.decodeBase64(qrData.existingDevicePublicKey);
        const newPriv = util.decodeBase64(newDevicePrivateKey);

        const opened = nacl.box.open(ciphertext, nonce, existPub, newPriv);
        if (!opened) return null;

        return JSON.parse(util.encodeUTF8(opened));
    } catch (e) {
        console.error('[MultiDevice] QR auth processing failed:', e);
        return null;
    }
}

/**
 * Deactivate a device (e.g. when logging out or revoking access).
 */
export async function deactivateDevice(deviceId: string): Promise<void> {
    const { error } = await supabase
        .from('UserDevice')
        .update({ isActive: false })
        .eq('deviceId', deviceId);

    if (error) {
        console.error('[MultiDevice] Deactivation failed:', error);
    }
}

/**
 * List all active devices for a user.
 */
export async function listActiveDevices(userId: string): Promise<Array<{
    deviceId: string;
    publicKey: string;
    deviceName: string | null;
    createdAt: string;
}>> {
    const { data, error } = await supabase
        .from('UserDevice')
        .select('deviceId, publicKey, deviceName, createdAt')
        .eq('userId', userId)
        .eq('isActive', true)
        .order('createdAt', { ascending: true });

    if (error) {
        console.error('[MultiDevice] List devices failed:', error);
        return [];
    }

    return data || [];
}
