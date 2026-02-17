
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Key, ArrowLeft, ArrowRight, CheckCircle, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useToast } from '../../context/ToastContext';
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

        setLoading(true);
        try {
            // 1. Verify OTP via Custom API
            const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.fuymedia.org';

            const response = await fetch(`${API_URL}/api/auth/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    code,
                    type: 'SIGNUP',
                    password: password // Pass password for user creation if needed by API
                }),
            });

            const responseText = await response.text();
            let data;

            try {
                data = JSON.parse(responseText);
            } catch (jsonError) {
                console.error('API Response was not JSON:', responseText.slice(0, 500));
                throw new Error(`Server Error: ${response.status} ${response.statusText}. Please check your network or try again.`);
            }

            if (!response.ok) {
                throw new Error(data.error || 'Verification failed');
            }

            // 2. Sign in the user (since they are now created in Supabase)
            if (password) {
                const { error: loginError } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password,
                });
                if (loginError) throw loginError;
            } else {
                showToast('Email verified! Please login.', 'success');
                router.replace('/(auth)/login');
                return;
            }

            // Auto-login after successful verification
            showToast('Email verified! Logging you in...', 'success');

            // Successfully logged in - go to profile setup
            // Note: AuthContext should handle redirection, but we force it here just in case
            // router.replace('/profile-setup'); 

        } catch (error: any) {
            console.error('Verify error:', error);
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
