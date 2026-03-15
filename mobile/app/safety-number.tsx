/**
 * SafetyNumberScreen — Fix 2: Verify Safety Code
 *
 * Displays the combined 12-digit Safety Number between two users
 * so they can verify their encryption keys out-of-band
 * (in person, phone call, or another secure channel).
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ShieldCheck, Copy, Check } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../context/ThemeContext';
import { useEncryption } from '../context/EncryptionContext';
import { generateSafetyNumber } from '../lib/KeyVerification';
import { supabase } from '../lib/supabase';

export default function SafetyNumberScreen() {
    const router = useRouter();
    const { colors, mode } = useTheme();
    const { publicKey: myPublicKey } = useEncryption();
    const { userId, userName } = useLocalSearchParams<{ userId: string; userName: string }>();

    const [safetyNumber, setSafetyNumber] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadSafetyNumber();
    }, []);

    const loadSafetyNumber = async () => {
        try {
            if (!myPublicKey || !userId) {
                setError('Missing encryption keys.');
                setLoading(false);
                return;
            }

            // Fetch the contact's public key
            const { data, error: fetchError } = await supabase
                .from('Profile')
                .select('publicKey')
                .eq('userId', userId)
                .single();

            if (fetchError || !data?.publicKey) {
                setError('Could not fetch contact encryption key.');
                setLoading(false);
                return;
            }

            const number = await generateSafetyNumber(myPublicKey, data.publicKey);
            setSafetyNumber(number);
        } catch (e) {
            console.error('[SafetyNumber] Error:', e);
            setError('Failed to generate safety number.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (safetyNumber) {
            await Clipboard.setStringAsync(safetyNumber);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <LinearGradient
                colors={
                    mode === 'light'
                        ? ['#ffffff', '#f0f0f0']
                        : mode === 'eye-care'
                            ? ['#F5E6D3', '#E6D5C0']
                            : ['#0f172a', '#1e293b']
                }
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{ padding: 8, borderRadius: 20, backgroundColor: colors.card }}
                    >
                        <ChevronLeft color={colors.text} size={24} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
                        Verify Safety Code
                    </Text>
                </View>

                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
                    {loading ? (
                        <ActivityIndicator color={colors.primary} size="large" />
                    ) : error ? (
                        <Text style={{ color: '#ef4444', fontSize: 15, textAlign: 'center' }}>{error}</Text>
                    ) : (
                        <View style={{ alignItems: 'center', width: '100%' }}>
                            {/* Shield Icon */}
                            <View
                                style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: 40,
                                    backgroundColor: 'rgba(16,185,129,0.1)',
                                    borderWidth: 1,
                                    borderColor: 'rgba(16,185,129,0.2)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 24,
                                }}
                            >
                                <ShieldCheck size={40} color="#10b981" />
                            </View>

                            {/* Explanation */}
                            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 8, textAlign: 'center' }}>
                                Your safety number with {userName || 'this contact'}
                            </Text>

                            <Text style={{ color: colors.secondary, fontSize: 13, textAlign: 'center', marginBottom: 32, lineHeight: 20 }}>
                                Compare this number with {userName || 'your contact'} in person or via another secure channel. If the numbers match, your messages are securely encrypted end-to-end.
                            </Text>

                            {/* Safety Number Display */}
                            <View
                                style={{
                                    backgroundColor: '#09090b',
                                    borderWidth: 1,
                                    borderColor: '#27272a',
                                    borderRadius: 16,
                                    paddingVertical: 24,
                                    paddingHorizontal: 32,
                                    width: '100%',
                                    alignItems: 'center',
                                    marginBottom: 24,
                                }}
                            >
                                <Text
                                    style={{
                                        color: '#fff',
                                        fontSize: 32,
                                        fontWeight: '700',
                                        fontFamily: 'monospace',
                                        letterSpacing: 6,
                                    }}
                                >
                                    {safetyNumber}
                                </Text>
                            </View>

                            {/* Copy Button */}
                            <TouchableOpacity
                                onPress={handleCopy}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 8,
                                    paddingVertical: 14,
                                    paddingHorizontal: 28,
                                    borderRadius: 14,
                                    backgroundColor: colors.card,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                }}
                            >
                                {copied ? (
                                    <Check size={18} color="#10b981" />
                                ) : (
                                    <Copy size={18} color={colors.secondary} />
                                )}
                                <Text style={{ color: copied ? '#10b981' : colors.text, fontSize: 14, fontWeight: '600' }}>
                                    {copied ? 'Copied!' : 'Copy Safety Number'}
                                </Text>
                            </TouchableOpacity>

                            {/* Info Footer */}
                            <Text style={{ color: colors.secondary, fontSize: 11, textAlign: 'center', marginTop: 32, lineHeight: 16 }}>
                                End-to-End Encrypted contents. Metadata (who you message and when) is visible to Fuy servers.
                            </Text>
                        </View>
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
}
