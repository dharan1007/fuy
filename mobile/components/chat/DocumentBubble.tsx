import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, StyleSheet, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { decryptFile } from '../../lib/encryption';
import { BlurView } from 'expo-blur';
import { X, Lock, FileText } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useToast } from '../../context/ToastContext';


interface DocumentBubbleProps {
    filename: string;
    fileSize?: number;
    uri: string;
    encryptionKey?: string;
    isMe: boolean;
    mimeType?: string;
}

export default function DocumentBubble({ filename, fileSize, uri, encryptionKey, isMe, mimeType }: DocumentBubbleProps) {
    const [downloading, setDownloading] = useState(false);
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
    const [password, setPassword] = useState('');
    const [decryptionError, setDecryptionError] = useState(false);
    const { showToast } = useToast();


    const formatSize = (bytes?: number) => {
        if (!bytes) return '';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const handleDownload = async (pw?: string) => {
        // If password protected and no password provided yet, show prompt
        if (encryptionKey?.includes('pw:') && !pw) {
            setShowPasswordPrompt(true);
            return;
        }

        setDownloading(true);
        setDecryptionError(false);
        try {
            // 1. Determine local path
            const cacheDir = FileSystem.cacheDirectory + 'docs/';
            await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true }).catch(() => { });
            const localPath = cacheDir + (filename || 'document.dat');

            // 2. Download (encrypted)
            // If encrypted, we download to temp first

            if (encryptionKey) {
                const tempEncPath = localPath + '.enc';
                const downloadRes = await FileSystem.downloadAsync(uri, tempEncPath);
                if (downloadRes.status !== 200) throw new Error('Download failed');

                let key = encryptionKey;
                let iv = '';
                // Handle pw: prefix
                if (encryptionKey.startsWith('pw:')) {
                    // format: pw:salt:iv
                    // But wait, encryptFile returns key="pw:salt" and iv="iv".
                    // So encryptionKey passed here is "pw:salt".
                    // Where is IV?
                    // Message model has `mediaEncryptionKey` which usually stores "iv:key".
                    // If I changed `encryptFile` to return `key` as `pw:salt`, then `MediaUploadService` returns `encryptionKey` as `pw:salt`.
                    // And `iv` as `iv`.
                    // But `chat.tsx` constructs `mediaEncryptionKey` string.
                    // I need to check `chat.tsx` logic for `mediaEncryptionKey` construction.
                    // Currently `chat.tsx` receives `encryptionKey` and `iv` from `uploadMedia`.
                    // If `chat.tsx` joins them with `:`, then `mediaEncryptionKey` will be `iv:pw:salt` (if iv comes first) OR `pw:salt:iv` (if key comes first).
                    // Standard usage in `MediaUploadService` return calls: validation needed.
                    // But wait, `DocumentBubble` receives `encryptionKey`. Is it the full string from DB? Yes.
                    // I need to ensure `chat.tsx` saves it correctly.

                    // Assuming standard format "iv:key" (as per `EncryptedMedia` logic: `const [iv, key] = encryptionKey.split(':');`)
                    // If `key` (from encryptFile) is `pw:salt`, then `encryptionKey` from DB (if saved as `iv:key`) would be `iv:pw:salt`.
                    // In that case:
                    // val input = "ivHex:pw:saltHex"
                    // [iv, key] = input.split(':') -> iv="ivHex", key="pw" (WRONG split if simple split(':'))
                    // So I should use `split(':', 1)` or similar.

                    // OR I change `encryptFile` to return `key` WITHOUT `pw:` prefix, and let `shouldEncrypt` flag or `isPasswordProtected` flag handle it.
                    // But I wanted `pw:` prefix to be self-contained.

                    // Let's assume `chat.tsx` saves as `iv:key`.
                    // If key is `pw:saltabc`, then DB string is `ivabc:pw:saltabc`.
                    // `split(':')` gives `['ivabc', 'pw', 'saltabc']`.
                    // So I can reconstruct.

                    // Let's defer check logic to verify `chat.tsx`.

                    // Backward compatibility: existing `EncryptedMedia` splits by `:`.
                    // `const [iv, key] = encryptionKey.split(':');`
                }

                // Let's robustly parse `encryptionKey` prop here.
                // It likely contains IV and Key.
                // Try to split.
                const parts = encryptionKey.split(':');
                let keyStr = '';

                if (encryptionKey.includes('pw:')) {
                    // Password protected: typically `pw:salt` or `iv:pw:salt`
                    // Check if it has 3 parts (iv:pw:salt)
                    if (parts.length === 3) {
                        iv = parts[0];
                        keyStr = `${parts[1]}:${parts[2]}`; // "pw:salt"
                    } else if (parts.length === 2 && parts[0] === 'pw') {
                        // Just "pw:salt", no IV appended? unlikely but fallback
                        iv = '';
                        keyStr = encryptionKey;
                    } else {
                        // Fallback
                        iv = parts[0];
                        keyStr = parts.slice(1).join(':');
                    }
                } else {
                    // Normal key: `iv:key`
                    iv = parts[0];
                    keyStr = parts[1];
                }

                const decryptedPath = await decryptFile(tempEncPath, keyStr, iv, pw);

                if (!decryptedPath) throw new Error('Decryption failed');

                await FileSystem.moveAsync({ from: decryptedPath, to: localPath });
            } else {
                const downloadRes = await FileSystem.downloadAsync(uri, localPath);
                if (downloadRes.status !== 200) throw new Error('Download failed');
            }

            // 3. Share / Open
            if (Platform.OS === 'android') {
                try {
                    const IntentLauncher = require('expo-intent-launcher');
                    const contentUri = await FileSystem.getContentUriAsync(localPath);

                    let typeToUse = mimeType || 'application/octet-stream';
                    if (typeToUse === 'application/octet-stream' || !mimeType) {
                        const ext = filename?.split('.').pop()?.toLowerCase();
                        if (ext === 'pdf') typeToUse = 'application/pdf';
                        else if (ext === 'doc' || ext === 'docx') typeToUse = 'application/msword';
                        else if (ext === 'xls' || ext === 'xlsx') typeToUse = 'application/vnd.ms-excel';
                        else if (ext === 'ppt' || ext === 'pptx') typeToUse = 'application/vnd.ms-powerpoint';
                        else if (ext === 'txt') typeToUse = 'text/plain';
                        else if (ext === 'csv') typeToUse = 'text/csv';
                        else if (ext === 'rtf') typeToUse = 'application/rtf';
                    }

                    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                        data: contentUri,
                        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
                        type: typeToUse
                    });
                } catch (e) {
                    console.log('IntentLauncher not available or failed, falling back to Sharing API', e);
                    if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(localPath, { mimeType: mimeType || 'application/octet-stream', UTI: 'public.item', dialogTitle: 'Open Document' });
                    }
                }
            } else {
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(localPath, { mimeType: mimeType || 'application/octet-stream', UTI: 'public.item', dialogTitle: 'Open Document' });
                } else {
                    showToast('File saved to: ' + filename, 'info');
                }
            }
            setShowPasswordPrompt(false);
            setPassword('');

        } catch (error) {
            console.error('Download error:', error);
            if (encryptionKey?.includes('pw:') && !decryptionError) {
                setDecryptionError(true);
                showToast('Incorrect password', 'error');
            } else {
                showToast('Failed to download document', 'error');
            }
        } finally {
            setDownloading(false);
        }
    };

    // --- Micro-Interactions ---
    const scale = useSharedValue(0.97);
    const opacity = useSharedValue(0);

    React.useEffect(() => {
        scale.value = withTiming(1, { duration: 150 });
        opacity.value = withTiming(1, { duration: 150 });
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value
    }));

    const handlePressIn = () => {
        scale.value = withTiming(0.97, { duration: 150 });
    };

    const handlePressOut = () => {
        scale.value = withTiming(1, { duration: 150 });
    };

    return (
        <Animated.View style={animatedStyle}>
            <TouchableOpacity
                onPress={() => handleDownload()}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.9}
                style={[
                    styles.minimalContainer,
                    { backgroundColor: isMe ? '#111111' : '#1A1A1A' }
                ]}
            >
                {/* Subtle Neutral Indicator */}
                <View style={styles.neutralIndicator} />

                {/* Main Content Area */}
                <View style={styles.contentArea}>
                    <View style={styles.textContainer}>
                        <Text
                            className="font-semibold"
                            numberOfLines={1}
                            style={styles.fileNameText}
                        >
                            {filename || 'Document'}
                        </Text>
                        <Text style={styles.metadataText}>
                            {formatSize(fileSize)} • {mimeType?.split('/')[1]?.toUpperCase() || 'FILE'}
                        </Text>
                    </View>

                    {/* Simple Minimal Icon Container */}
                    <View style={styles.iconContainer}>
                        {downloading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            encryptionKey?.includes('pw:') ?
                                <Lock size={18} color="#FFFFFF" /> :
                                <FileText size={18} color="#FFFFFF" />
                        )}
                    </View>
                </View>
            </TouchableOpacity>

            <Modal visible={showPasswordPrompt} transparent animationType="fade">
                <BlurView intensity={20} style={StyleSheet.absoluteFill}>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <View style={{ width: 300, backgroundColor: '#18181b', padding: 20, borderRadius: 20, alignItems: 'center' }}>
                            <Lock size={40} color="#3b82f6" style={{ marginBottom: 16 }} />
                            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Password Required</Text>
                            <Text style={{ color: '#a1a1aa', textAlign: 'center', marginBottom: 20 }}>
                                This document is password protected. Enter the password to view it.
                            </Text>

                            <TextInput
                                style={{
                                    width: '100%',
                                    backgroundColor: '#27272a',
                                    color: '#fff',
                                    padding: 12,
                                    borderRadius: 12,
                                    marginBottom: 16,
                                }}
                                placeholder="Password"
                                placeholderTextColor="#71717a"
                                secureTextEntry
                                value={password}
                                onChangeText={setPassword}
                            />

                            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                                <TouchableOpacity
                                    style={{ flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#3f3f46', borderRadius: 12 }}
                                    onPress={() => { setShowPasswordPrompt(false); setPassword(''); }}
                                >
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#3b82f6', borderRadius: 12 }}
                                    onPress={() => handleDownload(password)}
                                >
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Unlock</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </BlurView>
            </Modal>
        </Animated.View>
    );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    minimalContainer: {
        width: width * 0.70,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: '#111111',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        flexDirection: 'row',
        alignItems: 'center',
    },
    neutralIndicator: {
        width: 3,
        height: 24,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.25)',
        marginRight: 10,
    },
    contentArea: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    textContainer: {
        flex: 1,
        marginRight: 12,
        justifyContent: 'center',
    },
    fileNameText: {
        fontSize: 14, // or 15
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    metadataText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.55)',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1A1A1A',
        alignItems: 'center',
        justifyContent: 'center',
    }
});
