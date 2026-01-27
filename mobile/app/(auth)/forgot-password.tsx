
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, ArrowLeft, ArrowRight } from 'lucide-react-native';
import { useToast } from '../../context/ToastContext';
import { getApiUrl } from '../../lib/api';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const { showToast } = useToast();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendCode = async () => {
        if (!email) {
            showToast('Please enter your email', 'error');
            return;
        }

        setLoading(true);
        try {
            const API_URL = getApiUrl();
            const response = await fetch(`${API_URL}/api/auth/recover`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.toLowerCase().trim() }),
            });

            // Check if response is JSON before parsing
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Non-JSON response from recover API:', text.substring(0, 300));
                throw new Error('Server unavailable. Please try again later.');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send code');
            }

            showToast('Recovery code sent to your email!', 'success');
            router.push({
                pathname: '/(auth)/verify-reset',
                params: { email: email.toLowerCase().trim() }
            });

        } catch (error: any) {
            console.error('Recover error:', error);
            showToast(error.message || 'Failed to send recovery code', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-black">
            <LinearGradient colors={['#000000', '#1a1a1a']} className="absolute inset-0" />
            <SafeAreaView className="flex-1">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                    <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                        <View className="px-6 pt-4">
                            <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 items-center justify-center">
                                <ArrowLeft color="white" size={24} />
                            </TouchableOpacity>
                        </View>

                        <View className="px-8 w-full max-w-md mx-auto flex-1 justify-center pb-20">
                            <View className="mb-10">
                                <Text className="text-4xl font-bold text-white mb-2 tracking-tighter">Reset Password</Text>
                                <Text className="text-white/40 text-base">Enter your email to receive a recovery code.</Text>
                            </View>

                            <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-4 mb-4">
                                <Mail color="rgba(255,255,255,0.4)" size={20} />
                                <TextInput
                                    placeholder="Email"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    className="flex-1 ml-3 text-white text-base"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                />
                            </View>

                            <TouchableOpacity
                                onPress={handleSendCode}
                                disabled={loading}
                                className="bg-white rounded-2xl py-4 items-center flex-row justify-center mt-4 active:opacity-90"
                            >
                                <Text className="text-black font-bold text-lg mr-2">
                                    {loading ? 'Sending...' : 'Send Code'}
                                </Text>
                                {!loading && <ArrowRight color="black" size={20} />}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}
