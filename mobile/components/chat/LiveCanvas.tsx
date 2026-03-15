/**
 * Feature 1: Live Canvas
 *
 * Real-time typing preview bubble pinned between last message and input bar.
 * Uses a shared symmetric key derived from existing asymmetric keys via
 * nacl.box.before() to encrypt/decrypt keystroke data in transit.
 *
 * Props:
 *   roomId     - conversation ID
 *   enabled    - toggle state
 *   myKey      - my private key (base64)
 *   theirKey   - their public key (base64)
 *   partnerText - text being received from partner (set by parent)
 *   onToggle   - callback when toggle is pressed
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChannelPool } from '../../lib/ChannelPool';
import nacl from 'tweetnacl';
import util from 'tweetnacl-util';

interface LiveCanvasProps {
    roomId: string;
    enabled: boolean;
    myPrivateKey: string | null;
    theirPublicKey: string | null;
    onTextReceived: (text: string) => void;
    onTogglePartner: (enabled: boolean) => void;
}

// Event names
const EVT_TOGGLE = 'live_canvas:toggle';
const EVT_UPDATE = 'live_canvas:update';
const EVT_CLEAR = 'live_canvas:clear';

/**
 * Derive a shared secret from my private key and their public key
 * using NaCl's box.before (precomputation for faster operations).
 */
const deriveSharedSecret = (
    myPrivateKey: string,
    theirPublicKey: string
): Uint8Array | null => {
    try {
        const myPriv = util.decodeBase64(myPrivateKey);
        const theirPub = util.decodeBase64(theirPublicKey);
        return nacl.box.before(theirPub, myPriv);
    } catch {
        return null;
    }
};

/**
 * Symmetrically encrypt text using the shared secret via secretbox
 */
const encryptWithShared = (
    text: string,
    sharedKey: Uint8Array
): { c: string; n: string } => {
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const msgBytes = util.decodeUTF8(text);
    const box = nacl.secretbox(msgBytes, nonce, sharedKey);
    return {
        c: util.encodeBase64(box),
        n: util.encodeBase64(nonce),
    };
};

/**
 * Decrypt text using the shared secret
 */
const decryptWithShared = (
    ciphertext: string,
    nonce: string,
    sharedKey: Uint8Array
): string | null => {
    try {
        const box = util.decodeBase64(ciphertext);
        const n = util.decodeBase64(nonce);
        const opened = nacl.secretbox.open(box, n, sharedKey);
        if (!opened) return null;
        return util.encodeUTF8(opened);
    } catch {
        return null;
    }
};

export const LiveCanvas: React.FC<LiveCanvasProps> = ({
    roomId,
    enabled,
    myPrivateKey,
    theirPublicKey,
    onTextReceived,
    onTogglePartner,
}) => {
    const [partnerText, setPartnerText] = useState('');
    const [partnerCanvasEnabled, setPartnerCanvasEnabled] = useState(false);
    const sharedKeyRef = useRef<Uint8Array | null>(null);
    const dashAnim = useRef(new Animated.Value(0)).current;
    const throttleTimer = useRef<NodeJS.Timeout | null>(null);

    // Derive shared secret
    useEffect(() => {
        if (myPrivateKey && theirPublicKey) {
            sharedKeyRef.current = deriveSharedSecret(myPrivateKey, theirPublicKey);
        }
    }, [myPrivateKey, theirPublicKey]);

    // Dashed border animation loop
    useEffect(() => {
        if (!partnerCanvasEnabled || !partnerText) return;

        const animation = Animated.loop(
            Animated.timing(dashAnim, {
                toValue: 1,
                duration: 1800,
                easing: Easing.linear,
                useNativeDriver: false,
            })
        );
        animation.start();
        return () => animation.stop();
    }, [partnerCanvasEnabled, partnerText]);

    // Listen for partner events
    useEffect(() => {
        if (!roomId) return;

        const unsubToggle = ChannelPool.on(roomId, EVT_TOGGLE, (payload: any) => {
            setPartnerCanvasEnabled(payload.enabled);
            onTogglePartner(payload.enabled);
            if (!payload.enabled) {
                setPartnerText('');
                onTextReceived('');
            }
        });

        const unsubUpdate = ChannelPool.on(roomId, EVT_UPDATE, (payload: any) => {
            if (!sharedKeyRef.current) return;
            const decrypted = decryptWithShared(
                payload.c,
                payload.n,
                sharedKeyRef.current
            );
            if (decrypted !== null) {
                setPartnerText(decrypted);
                onTextReceived(decrypted);
            }
        });

        const unsubClear = ChannelPool.on(roomId, EVT_CLEAR, () => {
            setPartnerText('');
            onTextReceived('');
        });

        return () => {
            unsubToggle();
            unsubUpdate();
            unsubClear();
        };
    }, [roomId, onTextReceived, onTogglePartner]);

    /**
     * Call this from parent when input text changes to broadcast to partner.
     * Throttled to max once every 30ms.
     */
    const broadcastText = useCallback(
        (text: string) => {
            if (!enabled || !sharedKeyRef.current) return;

            if (throttleTimer.current) return;

            throttleTimer.current = setTimeout(() => {
                throttleTimer.current = null;
            }, 30);

            if (!text.trim()) {
                ChannelPool.emit(roomId, EVT_CLEAR, {});
                return;
            }

            const encrypted = encryptWithShared(text, sharedKeyRef.current);
            ChannelPool.emit(roomId, EVT_UPDATE, encrypted);
        },
        [roomId, enabled]
    );

    /**
     * Toggle live canvas on/off and broadcast to partner
     */
    const toggle = useCallback(
        async (newState: boolean) => {
            await ChannelPool.emit(roomId, EVT_TOGGLE, { enabled: newState });
            // Persist preference
            await AsyncStorage.setItem(
                `app:live_canvas:enabled_${roomId}`,
                JSON.stringify(newState)
            );
            if (!newState) {
                ChannelPool.emit(roomId, EVT_CLEAR, {});
            }
        },
        [roomId]
    );

    // Render the preview bubble if partner is typing with canvas on
    if (!partnerCanvasEnabled || !partnerText) {
        return null;
    }

    const dashOffset = dashAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 20],
    });

    return (
        <Animated.View
            style={{
                marginHorizontal: 16,
                marginBottom: 8,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: 'rgba(255, 255, 255, 0.15)',
                borderStyle: 'dashed',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
            }}
        >
            <Text
                style={{
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 0.5,
                    color: 'rgba(255, 255, 255, 0.35)',
                    marginBottom: 4,
                    textTransform: 'uppercase',
                }}
            >
                Live Preview
            </Text>
            <Text
                style={{
                    fontSize: 14,
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontStyle: 'italic',
                }}
                numberOfLines={3}
            >
                {partnerText}
            </Text>
        </Animated.View>
    );
};

// Export the broadcast and toggle functions for parent use
export { deriveSharedSecret, encryptWithShared, decryptWithShared };
export default LiveCanvas;
