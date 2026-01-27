
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Key, ArrowLeft, ArrowRight, CheckCircle, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useToast } from '../../context/ToastContext';
import { getApiUrl } from '../../lib/api';
import { supabase } from '../../lib/supabase';

export default function VerifyEmailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { showToast } = useToast();

    const [code, setCode] = useState('');
    const [password, setPassword] = useState(params.password as string || '');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const email = params.email as string;

    const handleVerify = async () => {
        if (!code) {
            showToast('Please enter the code', 'error');
            return;
        }

        if (!password) {
            showToast('Please enter your password to continue', 'error');
            return;
        }

        setLoading(true);
        try {
            const API_URL = getApiUrl();
            const response = await fetch(`${API_URL}/api/auth/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    code: code,
                    type: 'SIGNUP',
                    password: password // Send password to complete registration
                }),
            });

            // Check if response is JSON before parsing
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Non-JSON response from verify API:', text.substring(0, 300));
                throw new Error('Server unavailable. Please try again later.');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Verification failed');
            }

            // Auto-login after successful verification
            showToast('Email verified! Logging you in...', 'success');

            const { error: loginError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (loginError) {
                console.error('Auto-login failed:', loginError);
                showToast('Verified! Please login with your credentials.', 'info');
                router.replace('/(auth)/login');
                return;
            }

            // Successfully logged in - go to profile setup
            router.replace('/profile-setup');

        } catch (error: any) {
            showToast(error.message, 'error');
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
                            <View className="mb-10 items-center">
                                <View className="w-20 h-20 bg-green-500/10 rounded-full items-center justify-center mb-6 border border-green-500/20">
                                    <CheckCircle color="#22c55e" size={40} />
                                </View>
                                <Text className="text-4xl font-bold text-white mb-2 tracking-tighter text-center">Verify Email</Text>
                                <Text className="text-white/40 text-base text-center">Enter the code sent to {email}</Text>
                            </View>

                            <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-4 mb-4">
                                <Key color="rgba(255,255,255,0.4)" size={20} />
                                <TextInput
                                    placeholder="Enter 6-digit code"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    className="flex-1 ml-3 text-white text-base font-mono text-center tracking-widest text-lg"
                                    value={code}
                                    onChangeText={setCode}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                />
                            </View>

                            {/* Password for auto-login */}
                            <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-4 mb-4">
                                <Lock color="rgba(255,255,255,0.4)" size={20} />
                                <TextInput
                                    placeholder="Enter your password"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    className="flex-1 ml-3 text-white text-base"
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    {showPassword ? (
                                        <EyeOff color="rgba(255,255,255,0.4)" size={20} />
                                    ) : (
                                        <Eye color="rgba(255,255,255,0.4)" size={20} />
                                    )}
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                onPress={handleVerify}
                                disabled={loading}
                                className="bg-white rounded-2xl py-4 items-center flex-row justify-center mt-4 active:opacity-90"
                            >
                                <Text className="text-black font-bold text-lg mr-2">
                                    {loading ? 'Verifying...' : 'Verify & Continue'}
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
