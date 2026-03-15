import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Lock, ShieldCheck, AlertTriangle, Copy, Check } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useEncryption } from '../context/EncryptionContext';

interface PinModalProps {
    visible: boolean;
    mode: 'setup' | 'unlock';
    onClose?: () => void;
}

export default function PinModal({ visible, mode, onClose }: PinModalProps) {
    const { setupWallet, unlockWallet, isLoading, hasKeys } = useEncryption();
    const [mnemonic, setMnemonic] = useState('');
    const [generatedMnemonic, setGeneratedMnemonic] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    const handleSetup = async () => {
        setError('');
        setBusy(true);
        try {
            const phrase = await setupWallet();
            if (phrase) {
                setGeneratedMnemonic(phrase);
            } else {
                setError('Setup failed. Please try again.');
            }
        } catch (e) {
            setError('An error occurred during setup.');
        } finally {
            setBusy(false);
        }
    };

    const handleUnlock = async () => {
        setError('');
        if (mnemonic.trim().split(/\s+/).length !== 12) {
            setError('Please enter all 12 words of your recovery phrase.');
            return;
        }

        setBusy(true);
        try {
            const success = await unlockWallet(mnemonic);
            if (!success) {
                setError('Incorrect recovery phrase. Please try again.');
            } else if (onClose) {
                onClose();
            }
        } catch (e) {
            setError('An error occurred.');
        } finally {
            setBusy(false);
        }
    };

    const handleCopy = async () => {
        if (generatedMnemonic) {
            await Clipboard.setStringAsync(generatedMnemonic);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        }
    };

    const handleConfirmSaved = () => {
        setConfirmed(true);
        setGeneratedMnemonic(null);
        if (onClose) onClose();
    };

    // --- Setup: Show generated mnemonic ---
    if (mode === 'setup' && generatedMnemonic) {
        const words = generatedMnemonic.split(' ');
        return (
            <Modal visible={visible} transparent animationType="fade">
                <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
                    <ScrollView
                        contentContainerStyle={{
                            flexGrow: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 24,
                        }}
                    >
                        <View
                            style={{
                                backgroundColor: '#18181b',
                                width: '100%',
                                maxWidth: 400,
                                padding: 24,
                                borderRadius: 24,
                                borderWidth: 1,
                                borderColor: '#27272a',
                                alignItems: 'center',
                            }}
                        >
                            <View
                                style={{
                                    width: 64,
                                    height: 64,
                                    backgroundColor: '#27272a',
                                    borderRadius: 32,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 16,
                                }}
                            >
                                <ShieldCheck size={32} color="#10b981" />
                            </View>

                            <Text
                                style={{
                                    color: '#fff',
                                    fontSize: 20,
                                    fontWeight: '700',
                                    marginBottom: 8,
                                }}
                            >
                                Your Recovery Phrase
                            </Text>

                            <Text
                                style={{
                                    color: '#a1a1aa',
                                    textAlign: 'center',
                                    marginBottom: 20,
                                    fontSize: 13,
                                    lineHeight: 18,
                                }}
                            >
                                Write these 12 words down in order and store them safely. This is the ONLY way to recover your encrypted messages.
                            </Text>

                            {/* Warning */}
                            <View
                                style={{
                                    backgroundColor: 'rgba(234,179,8,0.1)',
                                    borderWidth: 1,
                                    borderColor: 'rgba(234,179,8,0.2)',
                                    padding: 12,
                                    borderRadius: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    width: '100%',
                                    marginBottom: 20,
                                }}
                            >
                                <AlertTriangle size={20} color="#eab308" style={{ marginRight: 10 }} />
                                <Text style={{ color: '#eab308', fontSize: 11, flex: 1 }}>
                                    If you lose this phrase, your encrypted messages CANNOT be recovered. We never store it.
                                </Text>
                            </View>

                            {/* Word Grid */}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    flexWrap: 'wrap',
                                    justifyContent: 'center',
                                    gap: 8,
                                    marginBottom: 20,
                                    width: '100%',
                                }}
                            >
                                {words.map((word, i) => (
                                    <View
                                        key={i}
                                        style={{
                                            backgroundColor: '#09090b',
                                            borderWidth: 1,
                                            borderColor: '#27272a',
                                            borderRadius: 10,
                                            paddingHorizontal: 14,
                                            paddingVertical: 8,
                                            minWidth: '28%',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Text style={{ color: '#52525b', fontSize: 10, marginBottom: 2 }}>
                                            {i + 1}
                                        </Text>
                                        <Text
                                            style={{
                                                color: '#fff',
                                                fontSize: 14,
                                                fontWeight: '600',
                                                fontFamily: 'monospace',
                                            }}
                                        >
                                            {word}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            {/* Copy Button */}
                            <TouchableOpacity
                                onPress={handleCopy}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6,
                                    paddingVertical: 10,
                                    paddingHorizontal: 20,
                                    borderRadius: 12,
                                    backgroundColor: '#27272a',
                                    marginBottom: 12,
                                }}
                            >
                                {copied ? (
                                    <Check size={16} color="#10b981" />
                                ) : (
                                    <Copy size={16} color="#a1a1aa" />
                                )}
                                <Text style={{ color: copied ? '#10b981' : '#a1a1aa', fontSize: 13, fontWeight: '600' }}>
                                    {copied ? 'Copied!' : 'Copy to Clipboard'}
                                </Text>
                            </TouchableOpacity>

                            {/* Confirm Button */}
                            <TouchableOpacity
                                onPress={handleConfirmSaved}
                                style={{
                                    width: '100%',
                                    paddingVertical: 16,
                                    borderRadius: 12,
                                    backgroundColor: '#fff',
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: '#000', fontWeight: '700', fontSize: 16 }}>
                                    I Have Saved My Phrase
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </BlurView>
            </Modal>
        );
    }

    // --- Setup: Initial screen / Unlock screen ---
    return (
        <Modal visible={visible} transparent animationType="fade">
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <View
                        style={{
                            backgroundColor: '#18181b',
                            width: '100%',
                            maxWidth: 400,
                            padding: 24,
                            borderRadius: 24,
                            borderWidth: 1,
                            borderColor: '#27272a',
                            alignItems: 'center',
                        }}
                    >
                        <View
                            style={{
                                width: 64,
                                height: 64,
                                backgroundColor: '#27272a',
                                borderRadius: 32,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 16,
                            }}
                        >
                            {mode === 'setup' ? (
                                <ShieldCheck size={32} color="#10b981" />
                            ) : (
                                <Lock size={32} color="#fff" />
                            )}
                        </View>

                        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 }}>
                            {mode === 'setup' ? 'Secure Chat Setup' : 'Unlock Secure Chat'}
                        </Text>

                        <Text style={{ color: '#a1a1aa', textAlign: 'center', marginBottom: 24, fontSize: 13, lineHeight: 18 }}>
                            {mode === 'setup'
                                ? 'Generate a 12-word recovery phrase to protect your encrypted messages across all devices.'
                                : 'Enter your 12-word recovery phrase to unlock all encrypted messages.'}
                        </Text>

                        {mode === 'unlock' && (
                            <TextInput
                                value={mnemonic}
                                onChangeText={setMnemonic}
                                placeholder="Enter your 12-word recovery phrase..."
                                placeholderTextColor="#52525b"
                                multiline
                                numberOfLines={3}
                                autoCapitalize="none"
                                autoCorrect={false}
                                style={{
                                    width: '100%',
                                    backgroundColor: '#09090b',
                                    borderWidth: 1,
                                    borderColor: '#27272a',
                                    borderRadius: 12,
                                    padding: 16,
                                    color: '#fff',
                                    fontSize: 15,
                                    fontFamily: 'monospace',
                                    minHeight: 80,
                                    textAlignVertical: 'top',
                                    marginBottom: 16,
                                }}
                            />
                        )}

                        {error ? (
                            <Text style={{ color: '#ef4444', marginBottom: 16, fontSize: 13 }}>{error}</Text>
                        ) : null}

                        <TouchableOpacity
                            onPress={mode === 'setup' ? handleSetup : handleUnlock}
                            disabled={busy}
                            style={{
                                width: '100%',
                                paddingVertical: 16,
                                borderRadius: 12,
                                backgroundColor: busy ? '#3f3f46' : '#fff',
                                alignItems: 'center',
                            }}
                        >
                            {busy ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <Text style={{ color: '#000', fontWeight: '700', fontSize: 16 }}>
                                    {mode === 'setup' ? 'Generate Recovery Phrase' : 'Unlock Chats'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </BlurView>
        </Modal>
    );
}
