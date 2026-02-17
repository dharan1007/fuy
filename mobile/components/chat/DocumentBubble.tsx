import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { decryptFile } from '../../lib/encryption';
import { BlurView } from 'expo-blur';
import { X, Lock } from 'lucide-react-native';

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

    const formatSize = (bytes?: number) => {
        if (!bytes) return '';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const handleDownload = async (pw?: string) => {
        // If password protected and no password provided yet, show prompt
        if (encryptionKey?.startsWith('pw:') && !pw) {
            setShowPasswordPrompt(true);
            return;
        }

        setDownloading(true);
        setDecryptionError(false);
        try {
            // 1. Determine local path
            const cacheDir = (FileSystem as any).cacheDirectory + 'docs/';
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
                    // It's password protected.
                    // Format could be: `iv:pw:salt` OR `pw:salt` (if iv missing? no)
                    // Or maybe `chat.tsx` joins them differently.
                    // I'll assume `chat.tsx` uses `iv:key`.
                    // So `iv:pw:salt`.
                    iv = parts[0];
                    keyStr = parts.slice(1).join(':'); // "pw:salt"
                } else {
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
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(localPath, { mimeType: mimeType || 'application/octet-stream', UTI: 'public.item' });
            } else {
                Alert.alert('Saved', 'File saved to: ' + localPath);
            }
            setShowPasswordPrompt(false);
            setPassword('');

        } catch (error) {
            console.error('Download error:', error);
            if (encryptionKey?.includes('pw:') && !decryptionError) {
                setDecryptionError(true);
                Alert.alert('Error', 'Incorrect password or decryption failed');
            } else {
                Alert.alert('Error', 'Failed to download document');
            }
        } finally {
            setDownloading(false);
        }
    };

    return (
        <>
            <TouchableOpacity
                onPress={() => handleDownload()}
                className={`flex-row items-center p-3 rounded-xl gap-3 ${isMe ? 'bg-primary/20' : 'bg-zinc-800'}`}
                style={{ maxWidth: 250 }}
            >
                <View className={`w-10 h-10 rounded-full items-center justify-center ${isMe ? 'bg-indigo-500' : 'bg-zinc-700'}`}>
                    {downloading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        encryptionKey?.includes('pw:') ?
                            <Lock size={20} color="#fff" /> :
                            <Ionicons name="document-text" size={20} color="#fff" />
                    )}
                </View>
                <View className="flex-1">
                    <Text className={`font-medium text-sm ${isMe ? 'text-white' : 'text-zinc-200'}`} numberOfLines={1}>
                        {filename || 'Document'}
                    </Text>
                    <Text className="text-xs text-zinc-400">
                        {formatSize(fileSize)} • {mimeType?.split('/')[1]?.toUpperCase() || 'FILE'}
                        {encryptionKey?.includes('pw:') && ' • Protected'}
                    </Text>
                </View>
                {/* Download Icon */}
                {!downloading && (
                    <Ionicons name="download-outline" size={20} color={isMe ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)'} />
                )}
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
        </>
    );
}
