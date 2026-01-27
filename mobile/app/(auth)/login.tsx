import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, ArrowRight, CheckSquare, Square, Eye, EyeOff } from 'lucide-react-native';
import { useToast } from '../../context/ToastContext';

export default function LoginScreen() {
    const router = useRouter();
    const { showToast } = useToast();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            if (!email || !password) {
                showToast('Please fill in all fields', 'error');
                return;
            }
        }

        setLoading(true);
        try {
            const normalizedEmail = email.toLowerCase().trim();
            const { error } = await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password,
            });

            if (error) {
                console.error("Login attempt failed:", error);
                throw error;
            }

            // Auth state listener in _layout.tsx will handle redirect
        } catch (error: any) {
            console.error("Login Error details:", error);
            console.error("Login Error details:", error);
            showToast(error.message || 'Login failed', 'error');
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
                    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
                        <View className="px-8 w-full max-w-md mx-auto">
                            {/* Logo / Header */}
                            <View className="items-center mb-12">
                                <View className="w-20 h-20 bg-white/10 rounded-3xl items-center justify-center transform rotate-12 mb-6 border border-white/10 backdrop-blur-xl">
                                    <View className="w-12 h-12 bg-white rounded-full" />
                                </View>
                                <Text className="text-4xl font-bold text-white mb-2 tracking-tighter">Fuy</Text>
                                <Text className="text-white/40 text-base">Welcome back to the universe</Text>
                            </View>

                            {/* Form */}
                            <View className="space-y-4 gap-4">
                                <View>
                                    <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-4 mb-4">
                                        <Mail color="rgba(255,255,255,0.4)" size={20} />
                                        <TextInput
                                            placeholder="Email"
                                            placeholderTextColor="rgba(255,255,255,0.3)"
                                            className="flex-1 ml-3 text-white text-base"
                                            autoCapitalize="none"
                                            value={email}
                                            onChangeText={setEmail}
                                        />
                                    </View>

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
                                    {/* Forgot Password Link */}
                                    <View className="items-end mt-1">
                                        <Link href="/(auth)/forgot-password" asChild>
                                            <TouchableOpacity>
                                                <Text className="text-white/50 text-sm">Forgot Password?</Text>
                                            </TouchableOpacity>
                                        </Link>
                                    </View>
                                </View>

                                {/* Remember Me */}
                                <TouchableOpacity
                                    onPress={() => setRememberMe(!rememberMe)}
                                    className="flex-row items-center"
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
                                    onPress={handleLogin}
                                    disabled={loading}
                                    className="bg-white rounded-2xl py-4 items-center flex-row justify-center mt-2 active:opacity-90"
                                >
                                    <Text className="text-black font-bold text-lg mr-2">
                                        {loading ? 'Entering...' : 'Enter Fuy'}
                                    </Text>
                                    {!loading && <ArrowRight color="black" size={20} />}
                                </TouchableOpacity>

                                <View className="flex-row justify-center mt-6">
                                    <Text className="text-white/40">Don't have an access code? </Text>
                                    <Link href="/(auth)/signup" asChild>
                                        <TouchableOpacity>
                                            <Text className="text-white font-bold ml-1">Join Waitlist</Text>
                                        </TouchableOpacity>
                                    </Link>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}
