/**
 * SealedSender.ts — Fix 5: Sealed Sender Pattern
 *
 * Instead of storing sender_id in plaintext in the messages table,
 * the sender encrypts their ID using the recipient's public key.
 * The server only sees: recipient_id, timestamp, ciphertext, sealed blob.
 * The recipient decrypts the sealed blob to learn who sent the message.
 *
 * Uses an ephemeral keypair per seal so the server cannot correlate
 * sealed sender blobs across messages.
 */

import nacl from 'tweetnacl';
import util from 'tweetnacl-util';

export interface SealedSenderBlob {
    /** Encrypted sender_id (Base64) */
    ciphertext: string;
    /** Nonce for nacl.box (Base64) */
    nonce: string;
    /** Ephemeral public key used for this seal (Base64) */
    ephemeralPublicKey: string;
}

/**
 * Seal the sender's identity for a specific recipient.
 *
 * Creates an ephemeral Curve25519 keypair, encrypts the senderId
 * with nacl.box using the ephemeral private key + recipient's public key.
 * The ephemeral private key is discarded immediately.
 *
 * @param senderId              - The sender's user ID (plaintext string)
 * @param recipientPublicKeyB64 - Recipient's public key (Base64)
 * @returns SealedSenderBlob to store alongside the message
 */
export function sealSender(
    senderId: string,
    recipientPublicKeyB64: string
): SealedSenderBlob {
    // Generate ephemeral keypair (used only for this one seal)
    const ephemeralPair = nacl.box.keyPair();

    const recipientPub = util.decodeBase64(recipientPublicKeyB64);
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const senderIdBytes = util.decodeUTF8(senderId);

    // Encrypt sender ID
    const ciphertext = nacl.box(
        senderIdBytes,
        nonce,
        recipientPub,
        ephemeralPair.secretKey
    );

    // Zero the ephemeral private key
    ephemeralPair.secretKey.fill(0);

    return {
        ciphertext: util.encodeBase64(ciphertext),
        nonce: util.encodeBase64(nonce),
        ephemeralPublicKey: util.encodeBase64(ephemeralPair.publicKey),
    };
}

/**
 * Unseal the sender's identity from a SealedSenderBlob.
 *
 * The recipient uses their private key + the ephemeral public key
 * from the blob to decrypt and recover the sender's user ID.
 *
 * @param sealed                - SealedSenderBlob from the message
 * @param recipientPrivateKeyB64 - Recipient's private key (Base64)
 * @returns The sender's user ID string, or null if decryption fails
 */
export function unsealSender(
    sealed: SealedSenderBlob,
    recipientPrivateKeyB64: string
): string | null {
    try {
        const ciphertext = util.decodeBase64(sealed.ciphertext);
        const nonce = util.decodeBase64(sealed.nonce);
        const ephemeralPub = util.decodeBase64(sealed.ephemeralPublicKey);
        const recipientPriv = util.decodeBase64(recipientPrivateKeyB64);

        const opened = nacl.box.open(
            ciphertext,
            nonce,
            ephemeralPub,
            recipientPriv
        );

        if (!opened) return null;

        return util.encodeUTF8(opened);
    } catch (e) {
        console.error('[SealedSender] Unseal failed:', e);
        return null;
    }
}

/**
 * Convert a SealedSenderBlob to a JSON string for Supabase storage.
 */
export function serializeSealedSender(sealed: SealedSenderBlob): string {
    return JSON.stringify(sealed);
}

/**
 * Parse a stored sealed sender JSON string back to a blob.
 */
export function deserializeSealedSender(json: string): SealedSenderBlob {
    return JSON.parse(json) as SealedSenderBlob;
}
