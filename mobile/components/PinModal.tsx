import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Lock, ShieldCheck, AlertTriangle } from 'lucide-react-native';
import { useEncryption } from '../context/EncryptionContext';

interface PinModalProps {
    visible: boolean;
    mode: 'setup' | 'unlock';
    onClose?: () => void; // Optional, force user to act if not provided
}

export default function PinModal({ visible, mode, onClose }: PinModalProps) {
    const { setupWallet, unlockWallet, isLoading, hasKeys } = useEncryption();
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const handleAction = async () => {
        setError('');
        if (pin.length < 6) {
            setError('PIN must be at least 6 digits');
            return;
        }

        setBusy(true);
        try {
            if (mode === 'setup') {
                if (pin !== confirmPin) {
                    setError('PINs do not match');
                    setBusy(false);
                    return;
                }
                const success = await setupWallet(pin);
                if (!success) setError('Setup failed. Database error?');
                else if (onClose) onClose();
            } else {
                const success = await unlockWallet(pin);
                if (!success) setError('Incorrect PIN');
                else if (onClose) onClose();
            }
        } catch (e) {
            setError('An error occurred');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
                <View className="flex-1 items-center justify-center p-6">
                    <View className="bg-zinc-900 w-full max-w-sm p-6 rounded-3xl border border-zinc-800 items-center">
                        <View className="w-16 h-16 bg-zinc-800 rounded-full items-center justify-center mb-4">
                            {mode === 'setup' ? <ShieldCheck size={32} color="#10b981" /> : <Lock size={32} color="#fff" />}
                        </View>

                        <Text className="text-white text-xl font-bold mb-2">
                            {mode === 'setup' ? 'Secure Chat Setup' : 'Unlock Secure Chat'}
                        </Text>

                        <Text className="text-zinc-400 text-center mb-6">
                            {mode === 'setup'
                                ? 'Create a 6-digit Global PIN. This single lock secures all your messages across every device.'
                                : 'Enter your Global PIN to unlock all encrypted messages.'}
                        </Text>

                        {/* Alert Style Warning for Setup */}
                        {mode === 'setup' && (
                            <View className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl mb-4 flex-row items-center w-full">
                                <AlertTriangle size={20} color="#eab308" style={{ marginRight: 10 }} />
                                <Text className="text-yellow-500 text-xs flex-1">
                                    Warning: If you forget this PIN, your chat history cannot be recovered. We do not store it.
                                </Text>
                            </View>
                        )}

                        <TextInput
                            value={pin}
                            onChangeText={setPin}
                            placeholder="Enter 6-digit PIN"
                            placeholderTextColor="#52525b"
                            keyboardType="numeric"
                            secureTextEntry
                            maxLength={6}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white text-center text-xl font-mono mb-3"
                        />

                        {mode === 'setup' && (
                            <TextInput
                                value={confirmPin}
                                onChangeText={setConfirmPin}
                                placeholder="Confirm PIN"
                                placeholderTextColor="#52525b"
                                keyboardType="numeric"
                                secureTextEntry
                                maxLength={6}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white text-center text-xl font-mono mb-4"
                            />
                        )}

                        {error ? <Text className="text-red-500 mb-4">{error}</Text> : null}

                        <TouchableOpacity
                            onPress={handleAction}
                            disabled={busy}
                            className={`w-full py-4 rounded-xl items-center ${busy ? 'bg-zinc-700' : 'bg-white'}`}
                        >
                            {busy ? <ActivityIndicator color="#000" /> : (
                                <Text className="text-black font-bold text-lg">
                                    {mode === 'setup' ? 'Set Global Lock' : 'Unlock Chats'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </BlurView>
        </Modal>
    );
}
