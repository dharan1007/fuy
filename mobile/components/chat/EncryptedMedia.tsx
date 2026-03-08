import React, { useState, useEffect } from 'react';
import { View, Image, ActivityIndicator, TouchableOpacity, Text, Modal, StyleSheet, Dimensions, TextInput } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as FileSystem from 'expo-file-system/legacy';
import { decryptFile } from '../../lib/encryption';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Lock } from 'lucide-react-native';

interface EncryptedMediaProps {
    type: 'image' | 'video';
    uri: string; // Remote URL or Local URI
    encryptionKey?: string; // Format: "iv:key"
    viewOnce?: boolean;
    style?: any;
    isMe?: boolean;
    onPress?: () => void;
    resizeMode?: 'cover' | 'contain' | 'stretch';
}

export default function EncryptedMedia({ type, uri, encryptionKey, viewOnce, style, isMe, onPress, resizeMode = 'cover' }: EncryptedMediaProps) {
    const [decryptedUri, setDecryptedUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [viewOnceOpen, setViewOnceOpen] = useState(false);
    const [viewed, setViewed] = useState(false); // Local state for immediate feedback

    // Password protection state
    const [isLocked, setIsLocked] = useState(false);
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState(false);

    useEffect(() => {
        let isMounted = true;

        if (encryptionKey?.includes('pw:')) {
            setIsLocked(true);
        } else {
            // Start loading if not locked
            loadMedia();
        }

        async function loadMedia(pw?: string) {
            if (!uri) return;

            // If local file (picker preview), just use it
            if (uri.startsWith('file://')) {
                setDecryptedUri(uri);
                return;
            }

            // If not encrypted, use directly
            if (!encryptionKey) {
                setDecryptedUri(uri);
                return;
            }

            setLoading(true);
            try {
                // Check if we already have a cached decrypted file
                // Simple hash of uri for filename
                const filename = uri.split('/').pop()?.split('?')[0] || 'temp_media';
                const cacheDir = FileSystem.cacheDirectory + 'media_cache/';
                await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true }).catch(() => { });

                const localEncryptedPath = cacheDir + 'enc_' + filename;

                // Download encrypted file
                const downloadRes = await FileSystem.downloadAsync(uri, localEncryptedPath);
                if (downloadRes.status !== 200) throw new Error('Download failed');

                // Decrypt
                let keyStr = '';
                let iv = '';
                const parts = encryptionKey.split(':');

                if (encryptionKey.includes('pw:')) {
                    // Assume proper splitting/reconstruction logic or simple find
                    // If pw: exists, it's password protected.
                    iv = parts[0];
                    keyStr = parts.slice(1).join(':'); // pw:salt...
                } else {
                    iv = parts[0];
                    keyStr = parts[1];
                }

                const decryptedPath = await decryptFile(localEncryptedPath, keyStr, iv, pw);

                if (isMounted && decryptedPath) {
                    setDecryptedUri(decryptedPath);
                    setIsLocked(false);
                    setPasswordError(false);
                } else {
                    if (pw) {
                        setPasswordError(true);
                        setLoading(false);
                        // Don't set generic error, keep locked state to retry
                    } else {
                        setError(true);
                    }
                }
            } catch (err) {
                console.error("Failed to load encrypted media:", err);
                if (isMounted) {
                    if (pw) {
                        setPasswordError(true);
                    } else {
                        setError(true);
                    }
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        // Expose loadMedia for password unlock
        (EncryptedMedia as any).retryLoad = loadMedia;

        return () => { isMounted = false; };
    }, [uri, encryptionKey, viewOnce, isMe]);

    const player = useVideoPlayer(decryptedUri, player => {
        player.loop = false;
    });

    const handleUnlock = () => {
        if ((EncryptedMedia as any).retryLoad) {
            (EncryptedMedia as any).retryLoad(password);
        }
    };

    if (isLocked) {
        return (
            <>
                <TouchableOpacity
                    style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#27272a' }]}
                    onPress={() => setShowPasswordPrompt(true)}
                >
                    <Lock size={32} color="#71717a" />
                    <Text style={{ color: '#71717a', fontSize: 12, marginTop: 8 }}>Password Protected</Text>
                    {loading && <ActivityIndicator size="small" color="#3b82f6" style={{ marginTop: 8 }} />}
                </TouchableOpacity>

                <Modal visible={showPasswordPrompt} transparent animationType="fade">
                    <BlurView intensity={20} style={StyleSheet.absoluteFill}>
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                            <View style={{ width: 300, backgroundColor: '#18181b', padding: 20, borderRadius: 20, alignItems: 'center' }}>
                                <Lock size={40} color="#3b82f6" style={{ marginBottom: 16 }} />
                                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Password Required</Text>
                                <Text style={{ color: '#a1a1aa', textAlign: 'center', marginBottom: 20 }}>
                                    Enter password to view this media.
                                </Text>

                                <TextInput
                                    style={{
                                        width: '100%',
                                        backgroundColor: '#27272a',
                                        color: '#fff',
                                        padding: 12,
                                        borderRadius: 12,
                                        marginBottom: 16,
                                        borderColor: passwordError ? '#ef4444' : 'transparent',
                                        borderWidth: 1
                                    }}
                                    placeholder="Password"
                                    placeholderTextColor="#71717a"
                                    secureTextEntry
                                    value={password}
                                    onChangeText={(t) => { setPassword(t); setPasswordError(false); }}
                                />
                                {passwordError && <Text style={{ color: '#ef4444', marginBottom: 10, fontSize: 12 }}>Incorrect password</Text>}

                                <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                                    <TouchableOpacity
                                        style={{ flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#3f3f46', borderRadius: 12 }}
                                        onPress={() => { setShowPasswordPrompt(false); setPassword(''); setPasswordError(false); }}
                                    >
                                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={{ flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#3b82f6', borderRadius: 12 }}
                                        onPress={handleUnlock}
                                    >
                                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Unlock</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </BlurView>
                </Modal>
            </>
        );
    }

    if (viewOnce && !isMe) {
        if (viewed) {
            return (
                <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#27272a' }]}>
                    <Ionicons name="eye-off-outline" size={24} color="#71717a" />
                    <Text style={{ color: '#71717a', fontSize: 12, marginTop: 4 }}>Opened</Text>
                </View>
            );
        }

        return (
            <>
                <TouchableOpacity
                    style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#27272a', flexDirection: 'row', gap: 8 }]}
                    onPress={() => setViewOnceOpen(true)}
                >
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#3f3f46', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#3b82f6', fontWeight: 'bold' }}>1</Text>
                    </View>
                    <Text style={{ color: '#fff', fontWeight: '500' }}>
                        {type === 'image' ? 'Photo' : 'Video'}
                    </Text>
                </TouchableOpacity>

                <Modal visible={viewOnceOpen} transparent={true} animationType="fade">
                    <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            {/* Header */}
                            <View style={{ position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 }}>
                                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#3f3f46', alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: 12 }}>1</Text>
                                    </View>
                                    <Text style={{ color: '#fff', fontSize: 12 }}>Viewed</Text>
                                </View>
                                <TouchableOpacity onPress={() => { setViewOnceOpen(false); setViewed(true); }} style={{ padding: 8 }}>
                                    <Ionicons name="close" size={28} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            {/* Content */}
                            <EncryptedMedia
                                type={type}
                                uri={uri}
                                encryptionKey={encryptionKey}
                                isMe={true} // Bypass viewOnce check recursively
                                style={{ width: Dimensions.get('window').width, height: Dimensions.get('window').height }}
                            />
                        </View>
                    </BlurView>
                </Modal>
            </>
        );
    }

    if (loading) {
        return (
            <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#e4e4e7' }]}>
                <ActivityIndicator color="#3b82f6" />
            </View>
        );
    }

    if (error || !decryptedUri) {
        return (
            <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#fecaca' }]}>
                <Ionicons name="alert-circle" size={24} color="#ef4444" />
                <Text style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>Failed to load</Text>
            </View>
        );
    }

    if (type === 'video') {
        const videoElement = (
            <VideoView
                player={player}
                style={style}
                nativeControls={!onPress} // If onPress exists, we might want to let the custom viewer handle it, or just keep them
                contentFit={resizeMode === 'cover' ? 'cover' : 'contain'}
            />
        );
        return onPress ? (
            <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
                {videoElement}
            </TouchableOpacity>
        ) : videoElement;
    }

    const imageElement = (
        <Image
            source={{ uri: decryptedUri }}
            style={style}
            resizeMode={resizeMode}
        />
    );

    return onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
            {imageElement}
        </TouchableOpacity>
    ) : imageElement;
}
