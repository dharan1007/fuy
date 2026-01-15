import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, User, ArrowRight, ArrowLeft, CheckSquare, Square } from 'lucide-react-native';
import { useToast } from '../../context/ToastContext';

export default function SignupScreen() {
    const router = useRouter();
    const { showToast } = useToast();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        if (!email || !password || !name) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        setLoading(true);
        try {
            const { error: signUpError, data } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: name,
                    },
                },
            });

            if (signUpError) throw signUpError;

            // Optional: Create user record in public.User table if not handled by trigger
            // For now, we assume simple auth signup.

            showToast('Check your email for the confirmation link.', 'success');
            router.back();
        } catch (error: any) {
            showToast(error.message || 'Signup failed', 'error');
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

                                <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-4">
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
                                        secureTextEntry
                                        value={password}
                                        onChangeText={setPassword}
                                    />
                                </View>
                            </View>

                            {/* Remember Me */}
                            <TouchableOpacity
                                onPress={() => setRememberMe(!rememberMe)}
                                className="flex-row items-center mt-2"
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
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}
