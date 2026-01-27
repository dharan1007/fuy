
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, User, ArrowRight, ArrowLeft, CheckSquare, Square, Eye, EyeOff } from 'lucide-react-native';
import { useToast } from '../../context/ToastContext';
import { getApiUrl } from '../../lib/api';

export default function SignupScreen() {
    const router = useRouter();
    const { showToast } = useToast();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        if (!email || !password || !name || !confirmPassword) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        if (password.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        setLoading(true);
        try {
            const API_URL = getApiUrl();
            console.log('Signup API URL:', API_URL);

            const response = await fetch(`${API_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.toLowerCase().trim(),
                    password,
                    name
                }),
            });

            // Check if response is JSON before parsing
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Non-JSON response from signup API:', text.substring(0, 300));
                throw new Error('Server unavailable. Please try again later.');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Signup failed');
            }

            showToast('Verification code sent to your email.', 'success');
            router.push({
                pathname: '/(auth)/verify-email',
                params: {
                    email: email.toLowerCase().trim(),
                    password: password // Pass password to verify screen to complete registration
                }
            });

        } catch (error: any) {
            console.error('Signup error:', error);
            const message = error.message || 'Signup failed';

            if (message.includes('already been registered') || message.includes('already registered')) {
                showToast('Email already registered. Redirecting to login...', 'info');
                setTimeout(() => router.push('/(auth)/login'), 1500);
            } else {
                showToast(message, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-black">
            <LinearGradient
                colors={['#000000', '#1a1a1a']}
                className="absolute inset-0"
            />

            <SafeAreaView className="flex-1">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                        <View className="px-6 pt-4">
                            <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 items-center justify-center">
                                <ArrowLeft color="white" size={24} />
                            </TouchableOpacity>
                        </View>

                        <View className="px-8 w-full max-w-md mx-auto flex-1 justify-center pb-20">
                            {/* Header */}
                            <View className="mb-10">
                                <Text className="text-4xl font-bold text-white mb-2 tracking-tighter">Join Fuy</Text>
                                <Text className="text-white/40 text-base">Claim your spot in the universe.</Text>
                            </View>

                            {/* Form */}
                            <View className="space-y-4 gap-4">
                                {/* Name Input */}
                                <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-4">
                                    <User color="rgba(255,255,255,0.4)" size={20} />
                                    <TextInput
                                        placeholder="Full Name"
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                        className="flex-1 ml-3 text-white text-base"
                                        value={name}
                                        onChangeText={setName}
                                    />
                                </View>

                                {/* Email Input */}
                                <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-4">
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

                                {/* Password Input */}
                                <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-4">
                                    <Lock color="rgba(255,255,255,0.4)" size={20} />
                                    <TextInput
                                        placeholder="Password"
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

                                {/* Confirm Password Input */}
                                <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-4">
                                    <Lock color="rgba(255,255,255,0.4)" size={20} />
                                    <TextInput
                                        placeholder="Confirm Password"
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                        className="flex-1 ml-3 text-white text-base"
                                        secureTextEntry={!showConfirmPassword}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                        {showConfirmPassword ? (
                                            <EyeOff color="rgba(255,255,255,0.4)" size={20} />
                                        ) : (
                                            <Eye color="rgba(255,255,255,0.4)" size={20} />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Remember Me */}
                            <TouchableOpacity
                                onPress={() => setRememberMe(!rememberMe)}
                                className="flex-row items-center mt-4"
                            >
                                {rememberMe ? (
                                    <CheckSquare color="white" size={20} />
                                ) : (
                                    <Square color="rgba(255,255,255,0.4)" size={20} />
                                )}
                                <Text className={`ml-2 text-sm ${rememberMe ? 'text-white' : 'text-white/40'}`}>
                                    Remember me
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleSignup}
                                disabled={loading}
                                className="bg-white rounded-2xl py-4 items-center flex-row justify-center mt-4 active:opacity-90"
                            >
                                <Text className="text-black font-bold text-lg mr-2">
                                    {loading ? 'Creating...' : 'Create Account'}
                                </Text>
                                {!loading && <ArrowRight color="black" size={20} />}
                            </TouchableOpacity>

                            <View className="flex-row justify-center mt-6">
                                <Text className="text-white/40">Already have an account? </Text>
                                <Link href="/(auth)/login" asChild>
                                    <TouchableOpacity>
                                        <Text className="text-white font-bold ml-1">Login</Text>
                                    </TouchableOpacity>
                                </Link>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}
